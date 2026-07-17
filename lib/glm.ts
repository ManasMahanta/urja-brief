// Provider-agnostic LLM client for the AI features (daily brief, dissection,
// analyst/copilot, personas, issue drafter, news sentiment, fund thesis).
// Speaks the OpenAI-compatible chat-completions format, so it works with:
//   • Any OpenAI-compatible host — LLM_BASE_URL + LLM_API_KEY (+ LLM_MODEL)
//   • OpenAI                     — OPENAI_API_KEY (+ optional OPENAI_MODEL)
//   • Z.ai GLM                   — ZAI_API_KEY (+ optional ZAI_MODEL)
// Callers degrade gracefully when none is configured.
//
// Groq's free-tier quota is PER MODEL, not per organisation ("Rate limit reached
// for model `llama-3.3-70b-versatile` … tokens per day (TPD): Limit 100000"), so
// each additional model is a fresh 100k/day. We therefore walk several Groq
// models before ever leaving Groq — roughly 600k/day instead of 100k.
//
// Model order is by capability, and every model in the list was verified to
// return clean JSON (our prompts demand it). Two needed per-model handling:
//   • openai/gpt-oss-*  reason first and return EMPTY content unless given
//     reasoning_effort + max_completion_tokens headroom.
//   • qwen/*            leak <think> blocks into content unless
//     reasoning_format is "hidden", which silently breaks JSON.parse.

type Provider = {
  kind: "openai" | "generic" | "zai";
  endpoint: string;
  key: string;
  model: string;
};

/** Verified clean-JSON on Groq, best first. Each carries its own daily quota.
 *  qwen sits last despite being capable: even with reasoning_format hidden it
 *  intermittently spends the whole budget reasoning and returns empty content.
 *  That costs one wasted call before the chain moves on, so it earns its place
 *  as a tail backstop but not as a primary. */
const GROQ_CHAIN = [
  "llama-3.3-70b-versatile",
  "openai/gpt-oss-120b",
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant",
  "qwen/qwen3-32b",
];

function chatEndpoint(base: string): string {
  const b = base.replace(/\/+$/, "");
  return b.endsWith("/chat/completions") ? b : `${b}/chat/completions`;
}

/** Models to walk on the generic host. The multi-model chain only makes sense
 *  on Groq (the names are Groq's); any other host uses just its configured
 *  model unless LLM_MODELS names alternatives explicitly. */
function genericModels(): string[] {
  const explicit = process.env.LLM_MODELS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (explicit?.length) return explicit;
  const primary = process.env.LLM_MODEL;
  if (!/groq\.com/i.test(process.env.LLM_BASE_URL ?? "")) {
    return [primary ?? GROQ_CHAIN[0]];
  }
  return [...new Set([primary ?? GROQ_CHAIN[0], ...GROQ_CHAIN])];
}

/** Per-model cooldown. A model that reported a daily limit will keep reporting
 *  it, so retrying it on every request just burns latency before the fallback. */
const cooldownUntil = new Map<string, number>();
const onCooldown = (model: string) => (cooldownUntil.get(model) ?? 0) > Date.now();

/** Groq states its own reset window ("Please try again in 1h0m22.752s"); trust
 *  it rather than guessing, and cap so a bad parse can't sideline a model. */
function noteRateLimit(model: string, body: string) {
  const m = /try again in (?:(\d+)h)?(?:(\d+)m)?([\d.]+)s/i.exec(body);
  const secs = m ? (Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3])) : 60;
  cooldownUntil.set(model, Date.now() + Math.min(Math.max(secs, 5), 2 * 3600) * 1000);
}

// Ordered chain: the generic host (Groq) first across all its models, then
// OpenAI, then GLM as the backstop. An unfunded/failing OpenAI key never breaks
// AI — it simply falls through.
function providers(): Provider[] {
  const list: Provider[] = [];
  if (process.env.LLM_BASE_URL && process.env.LLM_API_KEY) {
    for (const model of genericModels()) {
      list.push({
        kind: "generic",
        endpoint: chatEndpoint(process.env.LLM_BASE_URL),
        key: process.env.LLM_API_KEY,
        model,
      });
    }
  }
  if (process.env.OPENAI_API_KEY) {
    list.push({
      kind: "openai",
      endpoint: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    });
  }
  if (process.env.ZAI_API_KEY) {
    list.push({
      kind: "zai",
      endpoint: "https://api.z.ai/api/paas/v4/chat/completions",
      key: process.env.ZAI_API_KEY,
      model: process.env.ZAI_MODEL ?? "glm-4.5",
    });
  }
  return list;
}

export function glmConfigured(): boolean {
  return providers().length > 0;
}

async function callOne(
  p: Provider,
  system: string,
  user: string,
  maxTokens: number,
): Promise<string | null> {
  const body: Record<string, unknown> = {
    model: p.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  };
  if (p.kind === "openai") {
    body.max_completion_tokens = maxTokens; // supersedes max_tokens on newer models
  } else if (p.kind === "zai") {
    body.max_tokens = maxTokens;
    body.thinking = { type: "disabled" }; // GLM reasoning eats the token budget
  } else if (/gpt-oss/i.test(p.model)) {
    // Reasons before answering: without headroom it spends the whole budget
    // thinking and returns empty content, which reads as a dead provider.
    body.max_completion_tokens = maxTokens;
    body.reasoning_effort = "low";
  } else if (/^qwen/i.test(p.model)) {
    body.max_tokens = maxTokens;
    body.reasoning_format = "hidden"; // otherwise <think> lands in content and breaks JSON.parse
  } else {
    body.max_tokens = maxTokens; // standard OpenAI-compatible hosts
  }

  try {
    const res = await fetch(p.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${p.key}` },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      if (res.status === 429) noteRateLimit(p.model, text);
      console.error(`${p.kind}:${p.model} error ${res.status}`, text.slice(0, 200));
      return null;
    }
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (e) {
    console.error(`${p.kind}:${p.model} request failed`, e);
    return null;
  }
}

export async function callGLM(
  system: string,
  user: string,
  maxTokens: number,
): Promise<string | null> {
  const all = providers();
  // Skip models known to be rate-limited, but never give up entirely: if every
  // provider is cooling down, try them anyway rather than report AI offline.
  const ready = all.filter((p) => !onCooldown(p.model));
  for (const p of ready.length ? ready : all) {
    const reply = await callOne(p, system, user, maxTokens);
    if (reply) return reply;
  }
  return null;
}

/**
 * callGLM with retries. Free tiers rate-limit aggressively (429); transient
 * limits usually clear within seconds, so a short backoff rescues most failures
 * instead of surfacing "AI offline". Each attempt re-walks the whole chain,
 * and cooled-down models are skipped, so this costs little once a model is
 * known to be spent.
 */
export async function callGLMRetry(
  system: string,
  user: string,
  maxTokens: number,
  attempts = 3,
): Promise<string | null> {
  const delays = [1500, 4000];
  for (let i = 0; i < attempts; i++) {
    const reply = await callGLM(system, user, maxTokens);
    if (reply) return reply;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delays[Math.min(i, delays.length - 1)]));
    }
  }
  return null;
}
