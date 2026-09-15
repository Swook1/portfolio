/**
 * Sliding-window counters, in memory.
 *
 * Deliberately not Redis/KV: this site gets portfolio traffic, and a dependency
 * with its own account and failure mode is a worse trade than an approximate
 * limiter. The approximation is real and worth naming — counters live in one
 * warm serverless instance, so a visitor routed to a fresh instance starts from
 * zero and the true ceiling is the limit times however many instances Vercel
 * happens to be running. It blunts one hammering client, which is the threat a
 * portfolio chatbot actually has. If the bill ever says otherwise, swap the
 * `Map` here for Vercel KV and nothing above this file changes.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

/** Every window's hit list, keyed by `${window name}:${identity}`. */
const windows = new Map();

/** Stops the map growing without bound on a long-lived warm instance. */
let lastSweep = Date.now();
function sweep(now, widest) {
  if (now - lastSweep < 5 * MINUTE) return;
  lastSweep = now;
  for (const [key, stamps] of windows) {
    if (!stamps.some((t) => now - t < widest)) windows.delete(key);
  }
}

/**
 * Records a hit and reports whether it broke the rule.
 *
 * @param {string} name   window label, so one identity can sit in several rules
 * @param {string} id     who is being counted ('global' for everyone at once)
 * @param {number} limit  hits allowed per window
 * @param {number} windowMs
 * @returns {{ok: boolean, retryAfter: number}} retryAfter in whole seconds
 */
function hit(name, id, limit, windowMs) {
  const now = Date.now();
  const key = `${name}:${id}`;
  const fresh = (windows.get(key) || []).filter((t) => now - t < windowMs);
  fresh.push(now);
  windows.set(key, fresh);
  sweep(now, windowMs);

  if (fresh.length <= limit) return { ok: true, retryAfter: 0 };

  // The oldest hit in the window is the one whose expiry frees a slot.
  const waitMs = windowMs - (now - fresh[0]);
  return { ok: false, retryAfter: Math.max(1, Math.ceil(waitMs / 1000)) };
}

/**
 * The rules, tightest first so the message names the one actually hit.
 *
 * - burst: a human types a handful of messages a minute; a script does not.
 * - sustained: caps one visitor's whole session, which burst alone cannot —
 *   8 a minute forever is still 480 an hour.
 * - global: the backstop the other two cannot provide, since a distributed
 *   flood passes every per-IP rule. InferHub is prepaid, so the balance is the
 *   thing being defended, not the CPU.
 */
const RULES = [
  { name: 'burst', limit: 8, windowMs: MINUTE, scope: 'ip' },
  { name: 'sustained', limit: 40, windowMs: HOUR, scope: 'ip' },
  { name: 'global', limit: 300, windowMs: HOUR, scope: 'global' },
];

const MESSAGES = {
  burst: 'Slow down a moment — too many messages at once.',
  sustained: "You've hit the hourly limit. Try again later, or email rayyanzl296@gmail.com.",
  global: 'The assistant is over capacity right now. Try again later.',
};

/**
 * @param {string} ip
 * @returns {{ok: true} | {ok: false, rule: string, error: string, retryAfter: number}}
 */
export function checkRateLimit(ip) {
  for (const rule of RULES) {
    const id = rule.scope === 'global' ? 'global' : ip;
    const { ok, retryAfter } = hit(rule.name, id, rule.limit, rule.windowMs);
    if (!ok) {
      return { ok: false, rule: rule.name, error: MESSAGES[rule.name], retryAfter };
    }
  }
  return { ok: true };
}
