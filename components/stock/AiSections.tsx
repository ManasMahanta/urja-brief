// AI-driven dissection sections. Everything here is GLM analysis — badged AI,
// qualitative, educational. Rendered from the structured Dissection object.

import type { Dissection, Level } from "@/lib/stock-ai";
import Block from "@/components/stock/Block";
import { Reveal } from "@/components/cinematic/Motion";
import { DemoBadge, ConfidenceBar } from "@/components/intel/ui";

const AiBadge = ({ live }: { live: boolean }) => <DemoBadge label={live ? "AI analysis" : "AI offline"} />;
const lvlNum = (l: Level) => (l === "High" ? 3 : l === "Medium" ? 2 : 1);
const lvlColor = (l: Level) =>
  l === "High" ? "text-rose-300 border-rose-400/25 bg-rose-400/10" : l === "Medium" ? "text-amber-300 border-amber-400/25 bg-amber-400/10" : "text-emerald-300 border-emerald-400/25 bg-emerald-400/10";

function Bullets({ items, tone }: { items: string[]; tone: "up" | "down" | "violet" | "amber" }) {
  const dot = { up: "bg-emerald-400", down: "bg-rose-400", violet: "bg-violet-400", amber: "bg-amber-400" }[tone];
  if (!items.length) return <p className="text-xs text-text-mute">—</p>;
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-text-dim">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

/* --- 2. Executive AI Briefing ------------------------------------------ */
export function ExecBriefing({ d, live }: { d: Dissection; live: boolean }) {
  const b = d.briefing;
  return (
    <Block id="briefing" index="02" kicker="Hedge-fund memo" title="Executive AI briefing" badge={<AiBadge live={live} />}>
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Today", b.today],
          ["This week", b.week],
          ["This month", b.month],
        ].map(([k, v]) => (
          <div key={k} className="glass p-4">
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-sky-300">{k}</p>
            <p className="mt-2 text-sm leading-relaxed text-text-dim">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Reveal>
          <div className="glass rail p-5" style={{ ["--rail" as string]: "#34d399" }}>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-emerald-300">Bull thesis</p>
            <div className="mt-3"><Bullets items={b.bull} tone="up" /></div>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="glass rail p-5" style={{ ["--rail" as string]: "#fb7185" }}>
            <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-rose-300">Bear thesis</p>
            <div className="mt-3"><Bullets items={b.bear} tone="down" /></div>
          </div>
        </Reveal>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="glass p-5">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-amber-300">Hidden risks</p>
          <div className="mt-3"><Bullets items={b.hiddenRisks} tone="amber" /></div>
        </div>
        <div className="glass p-5">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-violet-300">Hidden opportunities</p>
          <div className="mt-3"><Bullets items={b.hiddenOpportunities} tone="violet" /></div>
        </div>
        <div className="glass p-5">
          <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-sky-300">Watch next</p>
          <div className="mt-3"><Bullets items={b.watchNext} tone="up" /></div>
        </div>
      </div>
      <div className="glass mt-4 flex items-start gap-3 p-5">
        <span className="mt-0.5 rounded-md bg-violet-400/15 px-2 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-wider text-violet-200">
          Verdict
        </span>
        <p className="text-sm leading-relaxed text-text-dim">{b.recommendation}</p>
      </div>
    </Block>
  );
}

/* --- 3. AI Sentiment Engine -------------------------------------------- */
/* --- 9. Risk Intelligence ---------------------------------------------- */
export function RiskMatrix({ d, live }: { d: Dissection; live: boolean }) {
  return (
    <Block id="risks" index="09" kicker="Risk intelligence" title="What could go wrong" badge={<AiBadge live={live} />}>
      {d.risks.length === 0 ? (
        <p className="text-sm text-text-mute">AI risk analysis unavailable.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {d.risks.map((r, i) => {
            const severity = lvlNum(r.probability) * lvlNum(r.impact); // 1..9
            const rail = severity >= 6 ? "#fb7185" : severity >= 3 ? "#fbbf24" : "#34d399";
            return (
              <Reveal key={i} delay={i * 50}>
                <div className="glass rail h-full p-5" style={{ ["--rail" as string]: rail }}>
                  <p className="text-sm font-semibold text-white">{r.risk}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2">
                    <span className={`rounded-md border px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-wider ${lvlColor(r.probability)}`}>
                      P: {r.probability}
                    </span>
                    <span className={`rounded-md border px-2 py-0.5 font-mono text-[0.58rem] uppercase tracking-wider ${lvlColor(r.impact)}`}>
                      Impact: {r.impact}
                    </span>
                  </div>
                  <p className="mt-2.5 text-xs leading-relaxed text-text-mute">
                    <span className="text-text-dim">Mitigation:</span> {r.mitigation}
                  </p>
                </div>
              </Reveal>
            );
          })}
        </div>
      )}
    </Block>
  );
}

/* --- 11. AI Catalyst Calendar ------------------------------------------ */
export function CatalystTimeline({ d, live }: { d: Dissection; live: boolean }) {
  const impactColor = { High: "bg-rose-400", Medium: "bg-amber-400", Low: "bg-sky-400" } as const;
  return (
    <Block id="catalysts" index="11" kicker="Catalyst calendar" title="What to watch next" badge={<AiBadge live={live} />}>
      {d.catalysts.length === 0 ? (
        <p className="text-sm text-text-mute">AI catalyst list unavailable.</p>
      ) : (
        <ol className="glass p-5">
          {d.catalysts.map((c, i) => (
            <li key={i} className="flex gap-3 pb-4 last:pb-0">
              <div className="flex flex-col items-center">
                <span className={`mt-1 h-2.5 w-2.5 rounded-full ${impactColor[c.impact]}`} />
                {i < d.catalysts.length - 1 && <span className="w-px flex-1 bg-white/10" />}
              </div>
              <div className="pb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[0.62rem] font-semibold uppercase tracking-wider text-text-mute">{c.when}</span>
                  <span className="font-mono text-[0.55rem] uppercase tracking-wider text-text-dim">{c.impact} impact</span>
                </div>
                <p className="mt-0.5 text-sm text-text-dim">{c.event}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Block>
  );
}

/* --- 21. AI Investment Thesis ------------------------------------------ */
export function ThesisPanel({ d, live }: { d: Dissection; live: boolean }) {
  const t = d.thesis;
  return (
    <Block id="thesis" index="21" kicker="Thesis builder" title="Bull / base / bear" badge={<AiBadge live={live} />}>
      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ["Bull case", t.bull, "#34d399", "text-emerald-300"],
          ["Base case", t.base, "#38bdf8", "text-sky-300"],
          ["Bear case", t.bear, "#fb7185", "text-rose-300"],
        ].map(([label, body, rail, txt]) => (
          <div key={label} className="glass rail p-5" style={{ ["--rail" as string]: rail as string }}>
            <p className={`font-mono text-[0.6rem] uppercase tracking-[0.14em] ${txt}`}>{label}</p>
            <p className="mt-3 text-sm leading-relaxed text-text-dim">{body}</p>
          </div>
        ))}
      </div>
      <div className="glass mt-4 grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-4">
        {[
          ["Time horizon", t.horizon],
          ["Est. CAGR", t.cagr],
          ["Entry (qual.)", t.entry],
          ["Exit (qual.)", t.exit],
        ].map(([k, v]) => (
          <div key={k} className="bg-white/[0.02] p-4">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.12em] text-text-mute">{k}</p>
            <p className="mt-1.5 text-sm text-text-dim">{v}</p>
          </div>
        ))}
      </div>
      <div className="mt-3">
        <ConfidenceBar value={d.confidence} tone={d.rating === "Avoid" || d.rating === "Reduce" ? "down" : "up"} />
        <p className="mt-1.5 font-mono text-[0.6rem] uppercase tracking-wider text-text-mute">
          Overall conviction {d.confidence}%
        </p>
      </div>
    </Block>
  );
}
