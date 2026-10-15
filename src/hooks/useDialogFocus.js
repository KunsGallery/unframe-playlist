import { useEffect } from 'react';

// Capture listeners make this work for modal roots rendered by animation wrappers.
export function useDialogFocus(ref, open, close) {
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => ref.current?.querySelector('button, [href], input, [tabindex="0"]')?.focus());
    const keydown = (event) => {
      const root = ref.current;
      if (!root || root.closest('[inert]')) return;
      const dialogs = [...document.querySelectorAll('[aria-modal="true"]')];
      if (dialogs.at(-1) !== root) return;
      if (event.key === 'Escape') { event.preventDefault(); close?.(); }
      if (event.key !== 'Tab') return;
      const nodes = [...root.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select, textarea, iframe, [tabindex="0"]')].filter((el) => el.getClientRects().length);
      const first = nodes[0], last = nodes.at(-1);
      if (!first) { event.preventDefault(); root.focus(); return; }
      if (event.shiftKey && (document.activeElement === first || !root.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !root.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown, true);
    return () => { cancelAnimationFrame(frame); document.body.style.overflow = previousOverflow; document.removeEventListener('keydown', keydown, true); requestAnimationFrame(() => { if (previous?.isConnected) previous.focus?.(); else document.querySelector('.up-mini-player__track')?.focus(); }); };
  }, [ref, open, close]);
}
