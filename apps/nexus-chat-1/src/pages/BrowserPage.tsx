import { useState, useCallback, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Search, Globe, ExternalLink, Plus, X } from 'lucide-react';
import { proxyPage } from 'zitejs/api';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import BrowserView, { TabView } from '../components/browser/BrowserView';

const HOME = 'https://www.google.com/';
const DIRECT_HOME = 'https://www.google.com/webhp?igu=1';
const searchUrl = (q: string) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;

type Tab = { id: number; url: string; history: string[]; idx: number; view: TabView; title: string };
let nextId = 1;
const newTab = (): Tab => ({ id: nextId++, url: HOME, history: [HOME], idx: 0, view: { kind: 'loading' }, title: 'Google' });
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

export default function BrowserPage() {
  const [tabs, setTabs] = useState<Tab[]>(() => [newTab()]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const [input, setInput] = useState('');
  const proxyOff = useRef(false);
  const active = tabs.find(t => t.id === activeId) ?? tabs[0];

  const patch = (id: number, p: Partial<Tab>) => setTabs(ts => ts.map(t => t.id === id ? { ...t, ...p } : t));

  const load = useCallback(async (id: number, url: string) => {
    if (proxyOff.current) { patch(id, { url, view: { kind: 'direct', url: url === HOME ? DIRECT_HOME : url }, title: hostOf(url) }); return; }
    patch(id, { url, view: { kind: 'loading' }, title: hostOf(url) });
    try {
      const r = await proxyPage({ url });
      if (r.ok && r.html) {
        const title = r.html.match(/<title[^>]*>([^<]{1,60})/i)?.[1]?.trim() || hostOf(r.finalUrl || url);
        patch(id, { url: r.finalUrl || url, view: { kind: 'page', html: r.html }, title });
      } else if (r.code === 'DISABLED') {
        proxyOff.current = true;
        patch(id, { view: { kind: 'direct', url: url === HOME ? DIRECT_HOME : url } });
      } else {
        patch(id, { view: { kind: 'error', code: r.code || 'UNSUPPORTED', message: r.message || 'Something went wrong.' } });
      }
    } catch {
      patch(id, { view: { kind: 'error', code: 'PROXY_UNAVAILABLE', message: 'Couldn\'t reach the proxy. Check your connection and try again.' } });
    }
  }, []);

  const navigate = useCallback((id: number, url: string) => {
    setTabs(ts => ts.map(t => t.id === id ? { ...t, history: [...t.history.slice(0, t.idx + 1), url], idx: t.idx + 1 } : t));
    load(id, url);
  }, [load]);

  // first tab
  useEffect(() => { load(tabs[0].id, HOME); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // links clicked inside a proxied page
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === 'nexus-nav' && typeof e.data.url === 'string') navigate(activeId, e.data.url);
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, [activeId, navigate]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    const isUrl = /^https?:\/\//i.test(v) || (/^[^\s]+\.[a-z]{2,}(\/|$)/i.test(v));
    navigate(active.id, isUrl ? (v.startsWith('http') ? v : `https://${v}`) : searchUrl(v));
  }
  const step = (d: -1 | 1) => {
    const idx = active.idx + d;
    if (idx < 0 || idx >= active.history.length) return;
    patch(active.id, { idx });
    load(active.id, active.history[idx]);
  };
  const addTab = () => { const t = newTab(); setTabs(ts => [...ts, t]); setActiveId(t.id); setInput(''); load(t.id, HOME); };
  const closeTab = (id: number) => {
    setTabs(ts => {
      if (ts.length === 1) { const t = newTab(); setActiveId(t.id); load(t.id, HOME); return [t]; }
      const i = ts.findIndex(t => t.id === id);
      const rest = ts.filter(t => t.id !== id);
      if (id === activeId) setActiveId(rest[Math.max(0, i - 1)].id);
      return rest;
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-end gap-1 px-2 pt-2 overflow-x-auto bg-secondary/40">
        {tabs.map(t => (
          <div key={t.id} onClick={() => { setActiveId(t.id); setInput(''); }}
            className={cn('group flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-t-lg text-xs max-w-[180px] min-w-[110px] cursor-pointer border border-b-0',
              t.id === active.id ? 'bg-card border-border text-foreground' : 'border-transparent text-muted-foreground hover:bg-secondary')}>
            {t.view.kind === 'loading' ? <RotateCw className="w-3 h-3 animate-spin shrink-0" /> : <Globe className="w-3 h-3 shrink-0" />}
            <span className="truncate flex-1">{t.title}</span>
            <button onClick={e => { e.stopPropagation(); closeTab(t.id); }} className="p-0.5 rounded hover:bg-muted" title="Close tab"><X className="w-3 h-3" /></button>
          </div>
        ))}
        <button onClick={addTab} className="mb-1 p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-foreground" title="New tab"><Plus className="w-4 h-4" /></button>
      </div>

      <div className="bg-card border-y border-border px-3 py-2">
        <form onSubmit={submit} className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => step(-1)} disabled={active.idx <= 0}><ArrowLeft className="w-4 h-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => step(1)} disabled={active.idx >= active.history.length - 1}><ArrowRight className="w-4 h-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => load(active.id, active.url)}><RotateCw className={cn('w-4 h-4', active.view.kind === 'loading' && 'animate-spin')} /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setInput(''); navigate(active.id, HOME); }}><Home className="w-4 h-4" /></Button>
          <div className="flex-1 relative mx-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={input} onChange={e => setInput(e.target.value)} placeholder={`Search Google or type a URL — ${hostOf(active.url)}`} className="pl-8 h-8 text-xs bg-secondary/50" />
          </div>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(active.url, '_blank', 'noopener')} title="Open in new browser tab"><ExternalLink className="w-4 h-4" /></Button>
        </form>
      </div>

      <div className="flex-1 relative bg-background">
        <BrowserView key={active.id} view={active.view} url={active.url} onRetry={() => load(active.id, active.url)} onLoaded={() => {}} />
      </div>
    </div>
  );
}
