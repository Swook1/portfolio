/**
 * The only file that knows InferHub exists.
 *
 * InferHub speaks the OpenAI Chat Completions shape, so this is a thin fetch
 * rather than an SDK — one dependency fewer to ship into a serverless bundle,
 * and the whole provider swap is this file plus two env vars.
 *
 *   INFERHUB_API_KEY   required
 *   INFERHUB_MODEL     required, e.g. "anthropic/claude-sonnet-5"
 *   INFERHUB_BASE_URL  optional, defaults to the documented OpenAI base
 */

const DEFAULT_BASE_URL = 'https://api.inferhub.dev/v1';

/** Upstream failed in a way worth reporting differently from a bug. */
export class UpstreamError extends Error {
  constructor(message, { status, kind, retryable }) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status;
    /** 'credit' | 'auth' | 'rate' | 'upstream' — what the caller tells the visitor. */
    this.kind = kind;
    this.retryable = retryable;
  }
}

/** Words providers use when the balance, not the request, is the problem. */
const CREDIT_HINT = /insufficient|credit|balance|quota|billing|payment|top[\s_-]?up|exhaust/i;

/**
 * InferHub is prepaid, so a dead balance is the failure most likely to happen
 * in production — and it must never look like a bug or a busy model, because
 * the fix is a top-up and nobody will do that if the page says "try again".
 *
 * Status alone does not settle it: 402 is unambiguous, but providers also
 * report a spent balance as a 403 or a 429, so the body gets a look too.
 */
function classify(status, detail) {
  if (status === 402) return { kind: 'credit', retryable: false };
  if (status === 401) return { kind: 'auth', retryable: false };
  if (status === 403) {
    return CREDIT_HINT.test(detail)
      ? { kind: 'credit', retryable: false }
      : { kind: 'auth', retryable: false };
  }
  if (status === 429) {
    // A spent balance returned as 429 would otherwise be retried forever.
    return CREDIT_HINT.test(detail)
      ? { kind: 'credit', retryable: false }
      : { kind: 'rate', retryable: true };
  }
  return { kind: 'upstream', retryable: status >= 500 };
}

function config() {
  const apiKey = process.env.INFERHUB_API_KEY;
  const model = process.env.INFERHUB_MODEL;
  if (!apiKey) throw new Error('INFERHUB_API_KEY is not set');
  if (!model) throw new Error('INFERHUB_MODEL is not set');
  return {
    apiKey,
    model,
    baseUrl: (process.env.INFERHUB_BASE_URL || DEFAULT_BASE_URL).replace(/\/+$/, ''),
  };
}

/**
 * One completion, no streaming — the widget awaits a whole reply, so there is
 * nothing to stream into yet.
 *
 * @param {object} args
 * @param {Array<{role: string, content: string}>} args.messages  system message included
 * @param {AbortSignal} [args.signal]
 * @returns {Promise<string>} the reply text
 */
export async function complete({ messages, signal, maxTokens = 250, temperature = 0.4 }) {
  const { apiKey, model, baseUrl } = config();

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
      stream: false,
    }),
    signal,
  });

  if (!res.ok) {
    // Read the body for the log, but never hand it back to the browser — it can
    // carry provider detail, and on a 401 it is about the key.
    const detail = await res.text().catch(() => '');
    throw new UpstreamError(`InferHub ${res.status}: ${detail.slice(0, 500)}`, {
      status: res.status,
      ...classify(res.status, detail),
    });
  }

  const data = await res.json();
  const reply = data?.choices?.[0]?.message?.content?.trim();
  if (!reply) {
    throw new UpstreamError('InferHub returned no message content', {
      status: 502,
      kind: 'upstream',
      retryable: false,
    });
  }
  return reply;
}

/** `complete` with one retry on the failures that a retry can actually fix. */
export async function completeWithRetry(args) {
  try {
    return await complete(args);
  } catch (err) {
    if (!(err instanceof UpstreamError) || !err.retryable) throw err;
    await new Promise((r) => setTimeout(r, 600));
    return complete(args);
  }
}
