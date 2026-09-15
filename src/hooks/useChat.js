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
 * the in-flight request so a send can be cancelled when the panel unmounts.
 * It knows nothing about where replies come from — that is chatService.
 */
export function useChat() {
  const [messages, setMessages] = useState(() => [makeMessage('assistant', greeting)]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const inFlight = useRef(null);

  // A send outliving its panel would set state on an unmounted tree.
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
        setError('Could not send that. Try again.');
        setMessages((prev) => [
          ...prev,
          makeMessage('assistant', 'Something went wrong on my end. Mind trying again?', {
            failed: true,
          }),
        ]);
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
