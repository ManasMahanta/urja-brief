// Small in-memory per-IP rate limiter for the AI routes. Serverless honesty:
// the map lives per warm instance, so the limit is per-instance rather than
// global — that still stops the realistic abuse case (one client hammering a
// warm function and burning the GLM quota), at zero infra cost. If the site
// ever needs a hard global limit, swap this for a KV-backed counter.

const WINDOW_MS = 60_000;
const buckets = new Map<string, number[]>();

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

/** True if this IP still has budget; false means reject with 429. */
export function allowRequest(key: string, maxPerMinute: number): boolean {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  if (hits.length >= maxPerMinute) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  // Bound the map so a scan across many IPs can't grow memory unboundedly.
  if (buckets.size > 5000) {
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  }
  return true;
}
