import { useCallback, useEffect, useRef, useState } from 'react';
import { sendMessage } from '../lib/chatService';
import { greeting } from '../data/chat';

let seq = 0;
const nextId = () => `m${++seq}`;

const makeMessage = (role, text, extra = {}) => ({
  id: nextId(),
  role,
  text,
  at: Date.now(),
  ...extra,
});

/**
 * Conversation state for the chat widget.
 *
 * Owns the transcript, the pending flag that drives the typing indicator, and
 * the in-flight request. Called from ChatWidget rather than ChatPanel, so the
 * thread survives the panel closing and dies only with the page.
 * It knows nothing about where replies come from — that is chatService.
 */
export function useChat() {
  const [messages, setMessages] = useState(() => [makeMessage('assistant', greeting)]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(null);

  // Only for teardown of whatever owns this hook. It is deliberately not tied
  // to the panel's own mount: closing the panel mid-question leaves the request
  // running, so the answer is waiting in the thread when the visitor reopens
  // rather than thrown away because they looked elsewhere for eight seconds.
  useEffect(() => () => inFlight.current?.abort(), []);

  const send = useCallback(
    async (raw) => {
      const text = raw.trim();
      if (!text || pending) return;

      setError(null);
      const outgoing = makeMessage('user', text);
      // The service wants the message being sent included, and state will not
      // have it yet, so the history is built here rather than read back.
      const history = [...messages, outgoing];
      setMessages(history);
      setPending(true);

      const controller = new AbortController();
      inFlight.current = controller;

      try {
        const reply = await sendMessage({ messages: history, signal: controller.signal });
        setMessages((prev) => [...prev, makeMessage('assistant', reply)]);
      } catch (err) {
        if (err.name === 'AbortError') return;
        // A failure is reported as a failure, never as a bot bubble: a canned
        // apology in the assistant's voice reads like an answer, and the visitor
        // cannot tell a real reply from a dead backend. The route's own sentence
        // is more useful than a generic one when it has a reason (out of credit,
        // rate limited, model down); fall back when it does not.
        setError(err.message || 'Could not send that. Try again.');
      } finally {
        if (inFlight.current === controller) inFlight.current = null;
        setPending(false);
      }
    },
    [messages, pending]
  );

  const reset = useCallback(() => {
    inFlight.current?.abort();
    inFlight.current = null;
    setPending(false);
    setError(null);
    setMessages([makeMessage('assistant', greeting)]);
  }, []);

  return { messages, pending, error, send, reset };
}
