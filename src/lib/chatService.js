/**
 * The seam between the chat UI and whatever answers it.
 *
 * `sendMessage` is the only thing the UI knows about: hand it the conversation
 * so far, get back the assistant's reply text. It posts to `/api/chat`, the
 * serverless route in `api/chat.js`, which is what holds the model API key.
 *
 * The provider is never called from here. A key shipped to the browser is a key
 * every visitor has.
 */

/** Override for a backend on another origin; defaults to this site's own route. */
const ENDPOINT = import.meta.env.VITE_CHAT_ENDPOINT || '/api/chat';

/**
 * Past this, the widget gives up rather than leaving the dots spinning.
 *
 * Deliberately longer than the route's own ceiling (`maxDuration: 45` in
 * vercel.json): whichever side gives up first decides what the visitor reads,
 * and the route's message says something, while an aborted fetch says nothing.
 */
const TIMEOUT_MS = 48000;

/** Strips UI-only fields so the history is safe to send over the wire. */
export function toWireFormat(messages) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map(({ role, text }) => ({ role, content: text }));
}

/**
 * The caller's own abort signal plus the timeout, as one signal. AbortSignal.any
 * keeps the caller's reason intact, so `useChat` still sees an AbortError when
 * the panel unmounts and stays silent, rather than reporting a failure.
 */
function withTimeout(signal) {
  const timer = AbortSignal.timeout(TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timer]) : timer;
}

/**
 * @param {{messages: Array<{role: string, text: string}>, signal?: AbortSignal}} args
 * @returns {Promise<string>} the assistant's reply
 */
export async function sendMessage({ messages, signal }) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: toWireFormat(messages) }),
    signal: withTimeout(signal),
  });

  if (!res.ok) {
    // The route sends a visitor-safe sentence in `error`; fall back to the
    // status if it sent something else (a proxy's HTML 502, say).
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || `Chat failed: ${res.status}`);
  }

  const { reply } = await res.json();
  if (!reply) throw new Error('Empty reply from the assistant.');
  return reply;
}
