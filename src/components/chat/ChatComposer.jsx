import { useEffect, useRef, useState } from 'react';
import { disclaimer } from '../../data/chat';

const MAX_ROWS_PX = 120;

/**
 * Auto-growing textarea plus send button. Enter sends, Shift+Enter breaks the
 * line — the usual chat contract.
 */
export default function ChatComposer({ pending, onSend }) {
  const [value, setValue] = useState('');
  const field = useRef(null);

  // Height is driven off scrollHeight, so it has to be reset before measuring.
  useEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_ROWS_PX)}px`;
  }, [value]);

  const submit = (e) => {
    e.preventDefault();
    if (!value.trim() || pending) return;
    onSend(value);
    setValue('');
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) submit(e);
  };

  return (
    <form className="chat-composer" onSubmit={submit}>
      <div className="chat-input-wrap">
        <label className="sr-only" htmlFor="chat-input">
          Message
        </label>
        <textarea
          id="chat-input"
          ref={field}
          rows={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Ask something…"
          className="chat-input"
        />

        <button
          type="submit"
          className="chat-send"
          disabled={!value.trim() || pending}
          aria-label="Send message"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M4 12l16-8-6 8 6 8-16-8z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <p className="chat-disclaimer">{disclaimer}</p>
    </form>
  );
}
