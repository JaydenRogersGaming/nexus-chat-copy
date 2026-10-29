import { useState } from 'react';
import { Search, ExternalLink, Globe } from 'lucide-react';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';

export type Result = { title: string; url: string; snippet: string; source: string };

export function SearchHome({ onSearch }: { onSearch: (q: string) => void }) {
  const [q, setQ] = useState('');
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background p-6">
      <form onSubmit={e => { e.preventDefault(); onSearch(q); }} className="w-full max-w-xl text-center space-y-5">
        <h1 className="text-4xl font-black tracking-tight"><span className="text-primary">Nexus</span> Search</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search anything…" className="pl-9 h-11 rounded-full" />
        </div>
        <Button type="submit">Search</Button>
      </form>
    </div>
  );
}

export function SearchResults({ query, results, provider, onOpen }: { query: string; results: Result[]; provider: string; onOpen: (url: string) => void }) {
  const google = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
  return (
    <div className="absolute inset-0 overflow-y-auto bg-background">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-muted-foreground">{results.length} results for <span className="font-semibold text-foreground">“{query}”</span>{provider === 'wikipedia' && ' · from Wikipedia'}</p>
          <Button size="sm" variant="outline" onClick={() => window.open(google, '_blank', 'noopener')}><ExternalLink className="w-3.5 h-3.5 mr-1" />Search on Google</Button>
        </div>
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
