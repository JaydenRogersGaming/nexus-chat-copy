import { useState, useRef, useCallback } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Home, Search, Globe, ExternalLink } from 'lucide-react';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';

const SEARCH_ENGINES = [
  { id: 'google', label: 'Google', icon: '🔍', homeUrl: 'https://www.google.com/webhp?igu=1', searchUrl: 'https://www.google.com/search?igu=1&q=' },
  { id: 'youtube', label: 'YouTube', icon: '▶️', homeUrl: 'https://www.youtube.com/embed?listType=search&list=music', searchUrl: 'https://www.youtube.com/embed?listType=search&list=' },
  { id: 'bing', label: 'Bing', icon: '🅱️', homeUrl: 'https://www.bing.com/', searchUrl: 'https://www.bing.com/search?q=' },
  { id: 'ddg', label: 'DuckDuckGo', icon: '🦆', homeUrl: 'https://html.duckduckgo.com/html/', searchUrl: 'https://html.duckduckgo.com/html/?q=' },
  { id: 'wiki', label: 'Wikipedia', icon: '📚', homeUrl: 'https://en.m.wikipedia.org/', searchUrl: 'https://en.m.wikipedia.org/w/index.php?search=' },
];

/** Quick-launch sites. `embed` ones load inside Nexus; the rest block framing so they open in a new tab. */
const QUICK_SITES = [
  { label: 'YouTube', icon: '▶️', url: 'https://www.youtube.com/embed?listType=search&list=trending', embed: true },
  { label: 'Wikipedia', icon: '📚', url: 'https://en.m.wikipedia.org/', embed: true },
  { label: 'OpenStreetMap', icon: '🗺️', url: 'https://www.openstreetmap.org/export/embed.html?bbox=-125,24,-66,50', embed: true },
  { label: 'Archive.org', icon: '🏛️', url: 'https://archive.org/', embed: true },
  { label: 'Desmos', icon: '📈', url: 'https://www.desmos.com/calculator', embed: true },
  { label: 'Scratch', icon: '🐱', url: 'https://scratch.mit.edu/', embed: false },
  { label: 'Spotify', icon: '🎧', url: 'https://open.spotify.com/', embed: false },
  { label: 'Twitch', icon: '🎮', url: 'https://www.twitch.tv/', embed: false },
  { label: 'Reddit', icon: '👽', url: 'https://www.reddit.com/', embed: false },
  { label: 'Gmail', icon: '✉️', url: 'https://mail.google.com/', embed: false },
  { label: 'Google Docs', icon: '📝', url: 'https://docs.google.com/', embed: false },
  { label: 'GitHub', icon: '🐙', url: 'https://github.com/', embed: false },
];

/** Turns YouTube watch/short links into embeddable player URLs. */
function toEmbeddable(u: string) {
  const m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1` : u;
}

export default function BrowserPage() {
  const [engine, setEngine] = useState(SEARCH_ENGINES[0]);
  const [url, setUrl] = useState(engine.homeUrl);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [history, setHistory] = useState<string[]>([engine.homeUrl]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const navigate = useCallback((newUrl: string) => {
    setUrl(newUrl);
    setIsLoading(true);
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newUrl]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const val = inputValue.trim();
    if (!val) return;
    // If it looks like a URL, navigate directly
    const isUrl = /^(https?:\/\/|www\.)/.test(val) || (val.includes('.') && !val.includes(' '));
    const target = isUrl
      ? (val.startsWith('http') ? val : `https://${val}`)
      : `${engine.searchUrl}${encodeURIComponent(val)}`;
    navigate(toEmbeddable(target));
  }

  function goBack() {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setUrl(history[newIndex]);
    setIsLoading(true);
  }

  function goForward() {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setUrl(history[newIndex]);
    setIsLoading(true);
  }

  function goHome() {
    setInputValue('');
    navigate(engine.homeUrl);
  }

  function switchEngine(id: string) {
    const e = SEARCH_ENGINES.find(s => s.id === id)!;
    setEngine(e);
    setInputValue('');
    navigate(e.homeUrl);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search engine tabs */}
      <div className="flex items-center gap-1 px-3 pt-3 pb-1 overflow-x-auto">
        {SEARCH_ENGINES.map(se => (
          <button
            key={se.id}
            onClick={() => switchEngine(se.id)}
            className={cn(
              'px-3 py-1.5 rounded-t-lg text-xs font-semibold transition-colors flex items-center gap-1.5',
              engine.id === se.id
                ? 'bg-card border border-b-0 border-border text-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            )}
          >
            <span>{se.icon}</span>
            {se.label}
          </button>
        ))}
      </div>

      {/* URL bar */}
      <div className="bg-card border-y border-border px-3 py-2">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={goBack} disabled={historyIndex <= 0}>
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={goForward} disabled={historyIndex >= history.length - 1}>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setIsLoading(true); if (iframeRef.current) iframeRef.current.src = url; }}>
              <RotateCw className={cn('w-4 h-4', isLoading && 'animate-spin')} />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={goHome}>
              <Home className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 relative">
            <Globe className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Search or enter URL..."
              className="pl-8 pr-8 h-8 text-xs bg-secondary/50"
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>

          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(url, '_blank')} title="Open in new tab">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </form>
      </div>

      {/* Quick launch */}
      <div className="flex gap-1.5 overflow-x-auto px-3 py-2 border-b border-border bg-card/50">
        {QUICK_SITES.map(s => (
          <button key={s.label} onClick={() => (s.embed ? navigate(s.url) : window.open(s.url, '_blank', 'noopener'))}
            title={s.embed ? `Open ${s.label} here` : `${s.label} blocks embedding — opens in a new tab`}
            className="shrink-0 flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] hover:bg-secondary">
            <span>{s.icon}</span>{s.label}{!s.embed && <ExternalLink className="w-3 h-3 opacity-60" />}
          </button>
        ))}
      </div>

      {/* Browser frame */}
      <div className="flex-1 relative bg-white">
        {isLoading && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary/20 z-10">
            <div className="h-full bg-primary animate-pulse w-2/3" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={url}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-downloads allow-modals allow-presentation"
          referrerPolicy="no-referrer-when-downgrade"
          allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; clipboard-write"
          onLoad={() => setIsLoading(false)}
          title="Browser"
        />
      </div>
    </div>
  );
}
