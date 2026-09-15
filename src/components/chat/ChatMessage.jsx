import BotAvatar from './BotAvatar';

const clock = (ts) =>
  new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/** One bubble. The assistant gets an avatar gutter, the visitor does not. */
export default function ChatMessage({ message }) {
  const mine = message.role === 'user';

  return (
    <li className={`chat-row ${mine ? 'is-mine' : ''}`}>
      {!mine && <BotAvatar className="chat-row-avatar" />}

      <div className="chat-row-body">
        <div className={`chat-bubble ${mine ? 'is-mine' : ''}`}>
          {message.text}
        </div>
        <time className="chat-time" dateTime={new Date(message.at).toISOString()}>
          {clock(message.at)}
        </time>
      </div>
    </li>
  );
}
