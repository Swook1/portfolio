/**
 * The seam between the chat UI and whatever answers it.
 *
 * `sendMessage` is the only thing the UI knows about: hand it the conversation
 * so far, get back the assistant's reply text. Today it is a canned responder
 * so the interface can be built and demoed offline. To go live, replace the
 * body of `sendMessage` with a fetch to your endpoint — the shape below is
 * already what a Messages-style API wants.
 *
 *   const res = await fetch('/api/chat', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ messages: toWireFormat(messages) }),
 *     signal,
 *   });
 *   if (!res.ok) throw new Error(`Chat failed: ${res.status}`);
 *   return (await res.json()).reply;
 *
 * Never call a model provider straight from the browser — that ships your API
 * key to every visitor. Put a small server route in front of it.
 */

/** Strips UI-only fields so the history is safe to send over the wire. */
export function toWireFormat(messages) {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map(({ role, text }) => ({ role, content: text }));
}

const CANNED = [
  {
    match: /stack|tech|tools?|language/i,
    reply:
      'He works in React, Tailwind and anime.js on the front end, with Three.js for the WebGL bits. On the back end: Python/FastAPI, Java, and MySQL or PostgreSQL.',
  },
  {
    match: /privamed/i,
    reply:
      'PrivaMed is a clinic management system — patient records, treatment plans and an admin overview dashboard. The case study is in the Projects section, with screenshots.',
  },
  {
    match: /contact|email|reach|hire|available/i,
    reply:
      'Fastest route is email (rayyanzl296@gmail.com) or WhatsApp. Both are linked at the bottom of the page, along with LinkedIn and GitHub.',
  },
  {
    match: /build|project|work|portfolio|do\b/i,
    reply:
      'Mostly web apps: interactive front ends with a lot of motion work, plus the APIs behind them. Scroll to Projects for the case studies.',
  },
  {
    match: /certificate|course|learn|study/i,
    reply:
      'The Certificates deck near the bottom is draggable — it holds his BNCC and course completions. Click any card to read it full size.',
  },
];

const FALLBACK =
  "I don't have an answer wired up for that yet — this is a UI demo running on canned replies. Once the backend is connected it will answer properly.";

/** Fake latency, so the typing indicator has something to do. */
const think = (ms, signal) =>
  new Promise((resolve, reject) => {
    const id = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    });
  });

/**
 * @param {{messages: Array<{role: string, text: string}>, signal?: AbortSignal}} args
 * @returns {Promise<string>} the assistant's reply
 */
export async function sendMessage({ messages, signal }) {
  const last = messages.filter((m) => m.role === 'user').at(-1)?.text ?? '';
  await think(700 + Math.random() * 700, signal);
  return CANNED.find((c) => c.match.test(last))?.reply ?? FALLBACK;
}
