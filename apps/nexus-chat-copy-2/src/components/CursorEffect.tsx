import { useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { CURSOR_EVENT, cursorCss, getEquipped } from '../lib/cursors';

// Applies the player's equipped cursor across the whole app.
export default function CursorEffect() {
  const { profile } = useApp();
  const email = profile?.email || '';
  useEffect(() => {
    const el = document.createElement('style');
    document.head.appendChild(el);
    const apply = () => {
      const css = email ? cursorCss(getEquipped(email), email) : '';
      el.textContent = css ? `*, *::before, *::after { cursor: ${css} !important; }` : '';
    };
    apply();
    window.addEventListener(CURSOR_EVENT, apply);
    return () => { window.removeEventListener(CURSOR_EVENT, apply); el.remove(); };
  }, [email]);
  return null;
}
