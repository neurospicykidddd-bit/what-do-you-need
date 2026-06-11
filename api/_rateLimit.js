// best-effort per-IP rate limiter. in-memory, so it's scoped to a single warm
// serverless instance — not a global guarantee, but it meaningfully blunts a
// single client hammering the endpoint and running up the bill, with zero
// infra. for a hard global cap, back this with a shared store (e.g. upstash
// redis / vercel kv) keyed the same way.
const RULES = [
  { windowMs: 60_000, max: 10 }, // burst: 10 / minute
  { windowMs: 3_600_000, max: 80 }, // sustained: 80 / hour
];

const HOUR = 3_600_000;
const hits = new Map(); // ip -> number[] (timestamps, last hour)

export function rateLimit(ip) {
  const now = Date.now();
  const key = ip || "unknown";

  // keep only the last hour of timestamps for this key.
  const recent = (hits.get(key) || []).filter((t) => now - t < HOUR);

  for (const rule of RULES) {
    const inWindow = recent.filter((t) => now - t < rule.windowMs);
    if (inWindow.length >= rule.max) {
      const oldest = Math.min(...inWindow);
      const retryAfter = Math.max(1, Math.ceil((rule.windowMs - (now - oldest)) / 1000));
      return { ok: false, retryAfter };
    }
  }

  recent.push(now);
  hits.set(key, recent);

  // bound memory: occasionally drop keys with no recent activity.
  if (hits.size > 5000) {
    for (const [k, arr] of hits) {
      if (!arr.some((t) => now - t < HOUR)) hits.delete(k);
    }
  }

  return { ok: true };
}
