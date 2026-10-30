import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Search, Globe, ExternalLink, Plus, X, Star } from 'lucide-react';
import LibraryMenu from '../components/browser/LibraryMenu';
import { addHistory, isBookmarked, toggleBookmark, searchUrl } from '../lib/browserStore';
import { proxyPage, webSearch } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import BrowserView, { TabView } from '../components/browser/BrowserView';
import { GAMES } from '../components/browser/SearchViews';
import HpClickerPage from './HpClickerPage';
import { HOME, searchEntry, queryOf, classifyInput, isSafeUrl, push, step as stepTab, canBack, canForward, closeTab as closeTabs, cycleTab, errorMessage } from '../lib/browserNav';

/** History entries: 'nexus:home', 'nexus:search?q=…', or a real http(s) URL. */
const googleUrl = (q: string) => searchUrl(q);

type Tab = { id: number; url: string; history: string[]; idx: number; view: TabView; title: string };
let nextId = 1;
const newTab = (): Tab => ({ id: nextId++, url: HOME, history: [HOME], idx: 0, view: { kind: 'home' }, title: 'New tab' });
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
/** Google/Bing search links found inside pages become native searches (those engines refuse proxy access). */
function toEntry(url: string) {
  try {
    const u = new URL(url);
    if (/(^|\.)(google|bing)\.[a-z.]+$/.test(u.hostname) && u.pathname === '/search' && u.searchParams.get('q')) return searchEntry(u.searchParams.get('q')!);
  } catch { /* not a URL */ }
  return url;
}

export default function BrowserPage() {
  const [tabs, setTabs] = useState<Tab[]>(() => [newTab()]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const [input, setInput] = useState('');
  const [starTick, setStarTick] = useState(0);
  const proxyOff = useRef(false);
  const addressRef = useRef<HTMLInputElement>(null);
  const active = tabs.find(t => t.id === activeId) ?? tabs[0];
  const patch = (id: number, p: Partial<Tab>) => setTabs(ts => ts.map(t => t.id === id ? { ...t, ...p } : t));

  const load = useCallback(async (id: number, entry: string) => {
    if (entry === HOME) { patch(id, { url: HOME, view: { kind: 'home' }, title: 'New tab' }); return; }
    if (entry.startsWith('nexus:game/')) { patch(id, { url: entry, view: { kind: 'home' }, title: GAMES.find(g => g.id === entry)?.label ?? 'Game' }); return; }
    if (!navigator.onLine) { patch(id, { url: entry, view: { kind: 'error', code: 'OFFLINE', message: errorMessage('OFFLINE') } }); return; }
    const q = queryOf(entry);
    if (q !== null) {
      if (!q.trim()) { patch(id, { url: entry, view: { kind: 'error', code: 'EMPTY_QUERY', message: 'Type something to search for.' } }); return; }
      patch(id, { url: entry, view: { kind: 'loading' }, title: q });
      try {
        const r = await webSearch({ query: q });
        patch(id, r.ok
          ? { view: { kind: 'results', query: r.query || q, results: r.results || [], provider: r.provider || '' } }
          : { view: { kind: 'error', code: r.code || 'BAD_RESPONSE', message: r.message || 'Search failed.', externalUrl: googleUrl(q) } });
      } catch {
        patch(id, { view: { kind: 'error', code: 'PROVIDER_UNAVAILABLE', message: 'Couldn\'t reach search. Check your connection and try again.', externalUrl: googleUrl(q) } });
      }
      return;
    }
    if (!isSafeUrl(entry)) { patch(id, { url: entry, view: { kind: 'error', code: 'BLOCKED_SCHEME', message: errorMessage('BLOCKED_SCHEME') }, title: 'Blocked' }); return; }
    if (proxyOff.current) { patch(id, { url: entry, view: { kind: 'direct', url: entry }, title: hostOf(entry) }); return; }
    patch(id, { url: entry, view: { kind: 'loading' }, title: hostOf(entry) });
    try {
      const r = await proxyPage({ url: entry });
      if (r.ok && r.html) {
        const title = r.html.match(/<title[^>]*>([^<]{1,60})/i)?.[1]?.trim() || hostOf(r.finalUrl || entry);
        patch(id, { url: r.finalUrl || entry, view: { kind: 'page', html: r.html }, title });
      } else if (r.code === 'DISABLED') {
        proxyOff.current = true;
        patch(id, { view: { kind: 'direct', url: entry } });
      } else {
        patch(id, { view: { kind: 'error', code: r.code || 'UNSUPPORTED', message: r.message || 'Something went wrong.' } });
      }
    } catch {
      patch(id, { view: { kind: 'error', code: 'PROXY_UNAVAILABLE', message: 'Couldn\'t reach the proxy. Check your connection and try again.' } });
    }
  }, []);

  const navigate = useCallback((id: number, raw: string) => {
    const entry = toEntry(raw);
    setTabs(ts => ts.map(t => t.id === id ? push(t, entry) : t));
    load(id, entry);
  }, [load]);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => { if (e.data?.type === 'nexus-nav' && typeof e.data.url === 'string') navigate(activeId, e.data.url); };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [activeId, navigate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    navigate(active.id, classifyInput(input));
    setInput(''); addressRef.current?.blur();
  }
  const step = (d: -1 | 1) => {
    const next = stepTab(active, d);
    if (next === active) return;
    patch(active.id, { idx: next.idx });
    load(active.id, next.history[next.idx]);
  };
  const addTab = () => { const t = newTab(); setTabs(ts => [...ts, t]); setActiveId(t.id); setInput(''); };
  const closeTab = (id: number) => { const r = closeTabs(tabs, id, activeId, newTab); setTabs(r.tabs); setActiveId(r.activeId); };
  const reload = () => load(active.id, active.url);
  const goHome = () => { setInput(''); navigate(active.id, HOME); };
  const bookmark = () => { if (active.url !== HOME) { toggleBookmark(active.url, active.title); setStarTick(n => n + 1); } };

  // Keyboard shortcuts — Ctrl/Cmd: T new tab, W close, L focus address, R reload, D bookmark, Tab cycle; Alt+←/→ back/forward; Alt+Home.
  const keys = useRef({ addTab, closeTab, reload, goHome, bookmark, step: (d: -1 | 1) => step(d), cycle: (d: -1 | 1) => setActiveId(cycleTab(tabs, activeId, d)), id: activeId });
  keys.current = { addTab, closeTab, reload, goHome, bookmark, step: (d: -1 | 1) => step(d), cycle: (d: -1 | 1) => setActiveId(cycleTab(tabs, activeId, d)), id: activeId };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current; const mod = e.ctrlKey || e.metaKey;
      const run = (f: () => void) => { e.preventDefault(); f(); };
      if (mod && e.key.toLowerCase() === 't') run(k.addTab);
      else if (mod && e.key.toLowerCase() === 'w') run(() => k.closeTab(k.id));
      else if (mod && e.key.toLowerCase() === 'l') run(() => addressRef.current?.select());
      else if (mod && e.key.toLowerCase() === 'r') run(k.reload);
      else if (mod && e.key.toLowerCase() === 'd') run(k.bookmark);
      else if (e.ctrlKey && e.key === 'Tab') run(() => k.cycle(e.shiftKey ? -1 : 1));
      else if (e.altKey && e.key === 'ArrowLeft') run(() => k.step(-1));
      else if (e.altKey && e.key === 'ArrowRight') run(() => k.step(1));
      else if (e.altKey && e.key === 'Home') run(k.goHome);
      else if (e.key === 'Escape' && document.activeElement === addressRef.current) { setInput(''); addressRef.current?.blur(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const q = queryOf(active.url);
  useEffect(() => { if (active.view.kind !== 'loading' && active.view.kind !== 'error') addHistory(active.url, active.title); }, [active.url, active.title, active.view.kind]);
  const externalUrl = q !== null ? googleUrl(q) : active.url.startsWith('http') ? active.url : 'https://www.google.com/';

  return (
    <div className="flex flex-col h-full">
      <div role="tablist" aria-label="Browser tabs" className="flex items-end gap-1 px-2 pt-2 overflow-x-auto bg-secondary/40">
        {tabs.map(t => (
          <div key={t.id} role="tab" aria-selected={t.id === active.id} tabIndex={0} title={t.title}
            onClick={() => { setActiveId(t.id); setInput(''); }} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveId(t.id); } }}
            className={cn('group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-t-lg text-xs max-w-[180px] min-w-[110px] cursor-pointer border border-b-0',
              t.id === active.id ? 'bg-card border-border text-foreground' : 'border-transparent text-muted-foreground hover:bg-secondary')}>
            {t.view.kind === 'loading' ? <RotateCw className="w-3 h-3 animate-spin shrink-0" /> : queryOf(t.url) !== null ? <Search className="w-3 h-3 shrink-0" /> : <Globe className="w-3 h-3 shrink-0" />}
            <span className="truncate flex-1">{t.title}</span>
            <button onClick={e => { e.stopPropagation(); closeTab(t.id); }} className="p-0.5 rounded hover:bg-muted" title="Close tab (Ctrl+W)" aria-label={`Close ${t.title}`}><X className="w-3 h-3" /></button>
          </div>
        ))}
        <button onClick={addTab} className="mb-1 p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground" title="New tab (Ctrl+T)" aria-label="New tab"><Plus className="w-4 h-4" /></button>
      </div>

      <div className="bg-card border-y border-border px-3 py-2">
        <form onSubmit={submit} className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => step(-1)} disabled={!canBack(active)} aria-label="Back" title="Back (Alt+←)"><ArrowLeft className="w-4 h-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => step(1)} disabled={!canForward(active)} aria-label="Forward" title="Forward (Alt+→)"><ArrowRight className="w-4 h-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={reload} aria-label="Reload" title="Reload (Ctrl+R)"><RotateCw className={cn('w-4 h-4', active.view.kind === 'loading' && 'animate-spin')} /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={goHome} aria-label="Home" title="Home (Alt+Home)"><Home className="w-4 h-4" /></Button>
          <div className="flex-1 relative mx-1">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input ref={addressRef} aria-label="Address and search bar" value={input} onChange={e => setInput(e.target.value)} placeholder={q !== null ? `Search: ${q}` : active.url.startsWith('http') ? active.url : 'Search the web or type a URL (Ctrl+L)'} className="pl-8 pr-8 h-8 text-xs bg-secondary/50" />
            <button type="submit" title="Go" aria-label="Go" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><Search className="w-3.5 h-3.5" /></button>
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={active.url === HOME} onClick={bookmark} title="Bookmark (Ctrl+D)" aria-label={isBookmarked(active.url) ? 'Remove bookmark' : 'Bookmark this page'} aria-pressed={isBookmarked(active.url)}>
            <Star className={cn('w-4 h-4', starTick >= 0 && isBookmarked(active.url) && 'fill-primary text-primary')} />
          </Button>
          <LibraryMenu onOpen={u => navigate(active.id, u)} />
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(externalUrl, '_blank', 'noopener')} title="Open in a new browser tab" aria-label="Open in a new browser tab"><ExternalLink className="w-4 h-4" /></Button>
        </form>
      </div>
      <div className="h-0.5 bg-transparent overflow-hidden" role="progressbar" aria-label="Page loading" aria-busy={active.view.kind === 'loading'}>
        {active.view.kind === 'loading' && <div className="h-full w-1/3 bg-primary animate-[browser-load_1.1s_ease-in-out_infinite]" />}
      </div>

      <div className="flex-1 relative bg-background">
        {active.url === 'nexus:game/hpclicker' ? <div className="absolute inset-0 overflow-y-auto"><HpClickerPage /></div> :
        <BrowserView key={active.id} view={active.view} url={externalUrl} onRetry={() => load(active.id, active.url)}
          onSearch={s => navigate(active.id, searchEntry(s.trim()))} onOpen={u => navigate(active.id, u)} />}
      </div>
    </div>
  );
}
