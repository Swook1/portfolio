/**
 * POST /api/chat
 *
 * The one server route behind the chat widget. It exists so the model API key
 * stays on the server: the browser talks to this, this talks to InferHub.
 *
 * Request:  { messages: [{ role: 'user' | 'assistant', content: string }] }
 * Response: { reply: string }  |  { error: string }
 */

import { SYSTEM_PROMPT } from './_knowledge.js';
import { completeWithRetry, UpstreamError } from './_inferhub.js';

/** Caps. Generous for a real visitor, tight enough to bound a bad one. */
const MAX_MESSAGES = 20; // turns kept from the transcript, most recent first
const MAX_CHARS = 1500; // per message
const MAX_BODY_CHARS = 20000; // whole transcript

/** Best-effort throttle: requests per IP per window. */
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

// Lives only as long as the warm instance, and each instance counts alone —
// so this blunts a single hammering tab, not a distributed flood. Swap for
// Upstash/Vercel KV if that ever becomes the threat.
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const fresh = (hits.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  fresh.push(now);
  hits.set(ip, fresh);

  // Keep the map from growing without bound across a long-lived instance.
  if (hits.size > 5000) {
    for (const [key, stamps] of hits) {
      if (!stamps.some((t) => now - t < RATE_WINDOW_MS)) hits.delete(key);
    }
  }
  return fresh.length > RATE_LIMIT;
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim() || 'unknown';
}

/**
 * Returns the trimmed history, or a string describing why it is unusable.
 * Only user/assistant turns survive — a client-supplied system message would
 * be a prompt injection with extra steps.
 */
function validate(body) {
  if (!body || typeof body !== 'object') return 'Malformed request body.';
  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) return 'messages must be a non-empty array.';

  const clean = [];
  let total = 0;
  for (const m of messages) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant')) continue;
    const content = typeof m.content === 'string' ? m.content.trim() : '';
    if (!content) continue;
    if (content.length > MAX_CHARS) return `Message too long (max ${MAX_CHARS} characters).`;
    total += content.length;
    if (total > MAX_BODY_CHARS) return 'Conversation too long.';
    clean.push({ role: m.role, content });
  }

  if (!clean.length) return 'No usable messages.';
  if (clean.at(-1).role !== 'user') return 'The last message must be from the user.';
  return clean.slice(-MAX_MESSAGES);
}

/**
 * What each upstream failure looks like from the chat bubble.
 *
 * Nothing here leaks provider detail or which key failed, but a spent balance
 * is stated plainly rather than dressed up as "try again": the visitor cannot
 * fix it by waiting, so the useful thing is the email address. `credit` and
 * `auth` are both 503 to the browser — the site is down, not the visitor's
 * request — and are told apart in the server log.
 */
const VISITOR_ERRORS = {
  credit: {
    status: 503,
    error: "The assistant is out of credit and can't answer right now. Email rayyanzl296@gmail.com and Rayyan will reply himself.",
  },
  auth: {
    status: 503,
    error: "The assistant is misconfigured and can't answer right now. Email rayyanzl296@gmail.com and Rayyan will reply himself.",
  },
  rate: { status: 429, error: 'The model is busy right now. Try again shortly.' },
  upstream: {
    status: 502,
    error: 'The assistant is unavailable right now. Try again in a moment.',
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  if (rateLimited(clientIp(req))) {
    return res.status(429).json({ error: 'Too many messages. Give it a minute.' });
  }

  const history = validate(req.body);
  if (typeof history === 'string') return res.status(400).json({ error: history });

  try {
    const reply = await completeWithRetry({
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
    });
    return res.status(200).json({ reply });
  } catch (err) {
    // The log gets the detail; the visitor gets a sentence. A spent balance is
    // shouted, because it is the one failure the logs exist to catch early —
    // the bot is mute until someone tops the account up.
    if (err?.kind === 'credit') console.error('[chat] OUT OF CREDIT — top up InferHub.', err.message);
    else console.error('[chat]', err);

    if (err instanceof UpstreamError) {
      const { status, error } = VISITOR_ERRORS[err.kind] ?? VISITOR_ERRORS.upstream;
      return res.status(status).json({ error });
    }
    return res.status(500).json({
      error: 'The assistant is unavailable right now. Email rayyanzl296@gmail.com instead.',
    });
  }
}
