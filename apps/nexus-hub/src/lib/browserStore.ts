export type SavedLink = { url: string; title: string; at: number };

const read = (k: string): SavedLink[] => { try { return JSON.parse(localStorage.getItem(k) || '[]'); } catch { return []; } };
const write = (k: string, v: SavedLink[]) => localStorage.setItem(k, JSON.stringify(v));

export const getBookmarks = () => read('nexus_bookmarks');
export const isBookmarked = (url: string) => getBookmarks().some(b => b.url === url);
export function toggleBookmark(url: string, title: string) {
  const b = getBookmarks();
  write('nexus_bookmarks', b.some(x => x.url === url) ? b.filter(x => x.url !== url) : [{ url, title, at: Date.now() }, ...b]);
}

export const getHistory = () => read('nexus_browser_history');

export type Engine = 'google' | 'duckduckgo';
export const engineUrl = (e: Engine, q: string) =>
  e === 'duckduckgo'
    ? `https://duckduckgo.com/?q=${encodeURIComponent(q)}`
    : `https://www.google.com/search?q=${encodeURIComponent(q)}`;
export const getEngine = (): Engine => (localStorage.getItem('nexus_search_engine') === 'duckduckgo' ? 'duckduckgo' : 'google');
export const setEngine = (e: Engine) => localStorage.setItem('nexus_search_engine', e);
export const searchUrl = (q: string) => engineUrl(getEngine(), q);

export function addHistory(url: string, title: string) {
  if (url === 'nexus:home') return;
  write('nexus_browser_history', [{ url, title, at: Date.now() }, ...getHistory().filter(h => h.url !== url)].slice(0, 100));
}
export const clearHistory = () => write('nexus_browser_history', []);
