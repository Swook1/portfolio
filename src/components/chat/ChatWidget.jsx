import { useEffect, useState } from 'react';
import ChatLauncher from './ChatLauncher';
import ChatPanel from './ChatPanel';

/** How long the page is left alone before the bot nudges, in ms. */
const NUDGE_AFTER = 12000;

/**
 * Mounts the floating launcher and, while open, the conversation panel.
 *
 * Openness lives here rather than in the panel so the panel can unmount
 * entirely when closed — nothing offscreen keeps a timer or a request alive.
 */
export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [nudged, setNudged] = useState(false);

  // One unread pip after a beat, so the launcher reads as live. It never comes
  // back once the visitor has opened the panel.
  useEffect(() => {
    if (open || nudged) return undefined;
    const id = setTimeout(() => setNudged(true), NUDGE_AFTER);
    return () => clearTimeout(id);
  }, [open, nudged]);

  const toggle = () => {
    setOpen((v) => !v);
    setNudged(false);
  };

  return (
    <div className="chat-dock">
      {open && <ChatPanel onClose={() => setOpen(false)} />}
      <ChatLauncher open={open} unread={nudged && !open ? 1 : 0} onClick={toggle} />
    </div>
  );
}
