/**
 * Pure browser navigation logic (no React) so it can be unit-tested.
 * History entries: 'nexus:home', 'nexus:search?q=…', 'nexus:game/…' or an http(s) URL.
 */
export const HOME = 'nexus:home';
export const searchEntry = (q: string) => `nexus:search?q=${encodeURIComponent(q)}`;
export const queryOf = (entry: string) =>
  entry.startsWith('nexus:search') ? new URLSearchParams(entry.split('?')[1] ?? '').get('q') ?? '' : null;

/** Turns what the user typed into a history entry: a URL if it looks like one, otherwise a search. */
export function classifyInput(raw: string): string {
  const v = raw.trim();
  if (!v) return HOME;
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(localhost|\d{1,3}(\.\d{1,3}){3})(:\d+)?(\/\S*)?$/i.test(v)) return `http://${v}`;
  if (!/\s/.test(v) && /^[^\s/]+\.[a-z]{2,}(:\d+)?(\/\S*)?$/i.test(v)) return `https://${v}`;
  return searchEntry(v);
}

/** Only http(s) pages may be loaded — blocks javascript:, data:, file: etc. */
export function isSafeUrl(u: string): boolean {
  try { return ['http:', 'https:'].includes(new URL(u).protocol); } catch { return false; }
}

export interface NavTab { id: number; history: string[]; idx: number }

export const current = (t: NavTab) => t.history[t.idx];
export const canBack = (t: NavTab) => t.idx > 0;
export const canForward = (t: NavTab) => t.idx < t.history.length - 1;

/** Navigating drops any forward history, like a real browser. Same-entry navigations don't duplicate. */
export function push<T extends NavTab>(t: T, entry: string): T {
  if (current(t) === entry) return t;
  const history = [...t.history.slice(0, t.idx + 1), entry];
  return { ...t, history, idx: history.length - 1 };
}

export function step<T extends NavTab>(t: T, d: -1 | 1): T {
  const idx = t.idx + d;
  return idx < 0 || idx >= t.history.length ? t : { ...t, idx };
}

/** Closes a tab and picks the next active one. Never leaves zero tabs. */
export function closeTab<T extends NavTab>(tabs: T[], id: number, activeId: number, make: () => T): { tabs: T[]; activeId: number } {
  const i = tabs.findIndex(t => t.id === id);
  if (i === -1) return { tabs, activeId };
  const rest = tabs.filter(t => t.id !== id);
  if (!rest.length) { const t = make(); return { tabs: [t], activeId: t.id }; }
  if (id !== activeId) return { tabs: rest, activeId };
  return { tabs: rest, activeId: rest[Math.min(i, rest.length - 1)].id };
}

/** Next/previous tab with wrap-around (Ctrl+Tab / Ctrl+Shift+Tab). */
export function cycleTab(tabs: NavTab[], activeId: number, d: -1 | 1): number {
  const i = tabs.findIndex(t => t.id === activeId);
  return tabs[(i + d + tabs.length) % tabs.length].id;
}

/** Friendly copy for error codes shown on the error page. */
export function errorMessage(code: string): string {
  const map: Record<string, string> = {
    EMPTY_QUERY: 'Type something to search for.',
    BLOCKED_SCHEME: 'That kind of link can’t be opened here for security reasons.',
    REFUSED_EMBED: 'This site doesn’t allow being shown inside other apps. Open it in a new tab instead.',
    NOT_FOUND: 'That page couldn’t be found.',
    TIMEOUT: 'The page took too long to respond.',
    OFFLINE: 'You appear to be offline. Check your connection and try again.',
  };
  return map[code] ?? 'Something went wrong loading this page.';
}
