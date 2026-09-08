import { useEffect, useRef } from 'react';
import { animate } from 'animejs';
import { prefersReducedMotion } from '../../hooks/useAnimeScope';

export default function CertificateModal({ certificate, onClose }) {
  const backdrop = useRef(null);
  const panel = useRef(null);
  const closeBtn = useRef(null);

  useEffect(() => {
    closeBtn.current?.focus();

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    if (!prefersReducedMotion()) {
      animate(backdrop.current, { opacity: [0, 1], duration: 250, ease: 'out(2)' });
      animate(panel.current, {
        opacity: [0, 1],
        scale: [0.92, 1],
        y: [20, 0],
        duration: 420,
        ease: 'out(4)',
      });
    }

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose]);

  return (
    <div
      ref={backdrop}
      role="dialog"
      aria-modal="true"
      aria-label={certificate.title}
      onClick={onClose}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md"
      style={{ background: 'rgba(3,6,12,0.82)' }}
    >
      <div
        ref={panel}
        onClick={(e) => e.stopPropagation()}
        className="card relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden"
      >
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          aria-label="Close certificate"
          className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full text-ink transition-colors"
          style={{ background: 'var(--surface-2)' }}
        >
          ✕
        </button>

        <div className="flex flex-1 items-center justify-center p-4 sm:p-6">
          <img
            src={certificate.image}
            alt={certificate.title}
            className="max-h-[70vh] w-auto max-w-full object-contain"
          />
        </div>

        <div className="border-t px-5 py-4 text-center" style={{ borderColor: 'var(--border)' }}>
          <h3 className="font-display text-lg font-bold sm:text-xl">{certificate.title}</h3>
          <p className="mt-1 text-xs text-muted sm:text-sm">{certificate.description}</p>
        </div>
      </div>
    </div>
  );
}
