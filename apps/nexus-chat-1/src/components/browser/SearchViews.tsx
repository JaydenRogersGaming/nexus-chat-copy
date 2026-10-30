import { useState } from 'react';
import { Search, ExternalLink, Globe } from 'lucide-react';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import ResearchHelper from './ResearchHelper';
import { getBookmarks, engineUrl, getEngine, setEngine, Engine } from '../../lib/browserStore';
export type Result = { title: string; url: string; snippet: string; source: string };

export const GAMES = [
  { id: 'nexus:game/hpclicker', label: 'HP Clicker', emoji: '❤️', desc: 'Click, upgrade, prestige' },
];
const SCHOOL = [
  { url: 'https://classroom.google.com/', label: 'Classroom', emoji: '🏫' },
  { url: 'https://docs.google.com/', label: 'Docs', emoji: '📝' },
  { url: 'https://www.khanacademy.org/', label: 'Khan Academy', emoji: '🎓' },
  { url: 'https://www.britannica.com/', label: 'Britannica', emoji: '📕' },
  { url: 'https://scholar.google.com/', label: 'Scholar', emoji: '🔬' },
  { url: 'https://www.loc.gov/', label: 'Library of Congress', emoji: '🏛️' },
];
const LINKS = [
  { url: 'https://en.wikipedia.org/wiki/Special:Random', label: 'Random Wiki', emoji: '📚' },
  { url: 'https://www.nasa.gov/', label: 'NASA', emoji: '🚀' },
  { url: 'https://developer.mozilla.org/', label: 'MDN Web Docs', emoji: '💻' },
  { url: 'https://www.gutenberg.org/', label: 'Free Books', emoji: '📖' },
];

export function SearchHome({ onSearch, onOpen }: { onSearch: (q: string) => void; onOpen?: (url: string) => void }) {
  const [q, setQ] = useState('');
  const [engine, setEng] = useState<Engine>(getEngine());
  return (
    <div className="absolute inset-0 overflow-y-auto bg-background p-6 flex items-center justify-center">
      <div className="w-full max-w-xl text-center space-y-6">
      <form onSubmit={e => { e.preventDefault(); onSearch(q); }} className="space-y-5">
        <h1 className="text-4xl font-black tracking-tight"><span className="text-primary">Nexus</span> Search</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search anything…" className="pl-9 h-11 rounded-full" />
        </div>
        <Button type="submit">Search</Button>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Open results on:</span>
          {(['google', 'duckduckgo'] as Engine[]).map(e => (
            <button key={e} type="button" onClick={() => { setEngine(e); setEng(e); }}
              className={`rounded-full border px-3 py-1 transition-colors ${engine === e ? 'border-primary text-primary font-medium' : 'border-border hover:bg-muted'}`}>
              {e === 'google' ? 'Google' : 'DuckDuckGo'}
            </button>
          ))}
        </div>
      </form>
      {onOpen && <>
        <div className="text-left space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🎒 School & research</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {SCHOOL.map(s => (
              <button key={s.url} onClick={() => window.open(s.url, '_blank', 'noopener')} className="rounded-xl border border-border bg-card p-3 flex flex-col items-center gap-1 hover:border-primary transition-colors">
                <span className="text-2xl">{s.emoji}</span><span className="text-[11px] font-medium leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
        {getBookmarks().length > 0 && <div className="text-left space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">⭐ Bookmarks</p>
          <div className="flex flex-wrap gap-2">
            {getBookmarks().slice(0, 12).map(b => (
              <button key={b.url} onClick={() => onOpen(b.url)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted max-w-[200px] truncate">{b.title}</button>
            ))}
          </div>
        </div>}
        <div className="text-left space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🎮 Browser games</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {GAMES.map(g => (
              <button key={g.id} onClick={() => onOpen(g.id)} className="rounded-lg border border-border bg-card p-3 text-left hover:border-primary transition-colors">
                <p className="text-sm font-semibold">{g.emoji} {g.label}</p><p className="text-[11px] text-muted-foreground">{g.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="text-left space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🔗 Quick links</p>
          <div className="flex flex-wrap gap-2">
            {LINKS.map(l => (
              <button key={l.url} onClick={() => onOpen(l.url)} className="rounded-full border border-border px-3 py-1 text-xs hover:bg-muted">{l.emoji} {l.label}</button>
            ))}
          </div>
        </div>
      </>}
      </div>
    </div>
  );
}

export function SearchResults({ query, results, provider, onOpen }: { query: string; results: Result[]; provider: string; onOpen: (url: string) => void }) {
  return (
    <div className="absolute inset-0 overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">{results.length} results for <span className="font-semibold text-foreground">“{query}”</span>{provider === 'wikipedia' && ' · from Wikipedia'}</p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => window.open(engineUrl('duckduckgo', query), '_blank', 'noopener')}><ExternalLink className="w-3.5 h-3.5 mr-1" />DuckDuckGo</Button>
            <Button size="sm" variant="outline" onClick={() => window.open(engineUrl('google', query), '_blank', 'noopener')}><ExternalLink className="w-3.5 h-3.5 mr-1" />Google</Button>
          </div>
        </div>
        <ResearchHelper query={query} results={results} />
        {results.length === 0 && <p className="text-sm text-muted-foreground text-center py-12">No results. Try different words, or search on Google.</p>}
        {results.map(r => (
          <div key={r.url} className="space-y-1">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1"><Globe className="w-3 h-3" />{r.source}</p>
            <button onClick={() => onOpen(r.url)} className="text-left text-base font-semibold text-primary hover:underline">{r.title}</button>
            <p className="text-sm text-muted-foreground line-clamp-2">{r.snippet}</p>
            <button onClick={() => window.open(r.url, '_blank', 'noopener')} className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1"><ExternalLink className="w-3 h-3" />Open in new tab</button>
          </div>
        ))}
      </div>
    </div>
  );
}
