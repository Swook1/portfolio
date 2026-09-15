import { bot } from '../../data/chat';
import BotAvatar from './BotAvatar';

/** Placeholder bubble shown while a reply is in flight. */
export default function TypingDots() {
  return (
    <li className="chat-row">
      <BotAvatar className="chat-row-avatar" />
      <div className="chat-row-body">
        <div className="chat-bubble chat-typing">
          <span />
          <span />
          <span />
          <span className="sr-only">{bot.name} is typing</span>
        </div>
      </div>
    </li>
  );
}
