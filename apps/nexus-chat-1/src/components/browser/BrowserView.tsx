import { Loader2, AlertTriangle, RotateCw, ExternalLink, ShieldOff } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { SearchHome, SearchResults, Result } from './SearchViews';

export type TabView =
  | { kind: 'home' }
  | { kind: 'loading' }
  | { kind: 'results'; query: string; results: Result[]; provider: string }
  | { kind: 'page'; html: string }
  | { kind: 'direct'; url: string }
  | { kind: 'error'; code: string; message: string; externalUrl?: string };

const TITLES: Record<string, string> = {
  TIMEOUT: 'Took too long', PROXY_UNAVAILABLE: 'Proxy unavailable', BLOCKED_BY_SITE: 'This site doesn\'t allow proxy access',
  BLOCKED_ADDRESS: 'Address not allowed', INVALID_URL: 'Invalid address', UNSUPPORTED: 'Can\'t show this page', TOO_LARGE: 'Page too large',
  EMPTY_QUERY: 'Nothing to search', PROVIDER_UNAVAILABLE: 'Search unavailable', PROVIDER_BLOCKED: 'Search provider refused', BAD_RESPONSE: 'Search failed',
};

type Props = { view: TabView; url: string; onRetry: () => void; onSearch: (q: string) => void; onOpen: (url: string) => void };

export default function BrowserView({ view, url, onRetry, onSearch, onOpen }: Props) {
  if (view.kind === 'home') return <SearchHome onSearch={onSearch} onOpen={onOpen} />;
  if (view.kind === 'results') return <SearchResults query={view.query} results={view.results} provider={view.provider} onOpen={onOpen} />;
  if (view.kind === 'loading') return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
      <p className="text-sm">Loading…</p>
    </div>
  );
  if (view.kind === 'error') {
    const ext = view.externalUrl ?? url;
    const blocked = view.code === 'BLOCKED_BY_SITE';
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background p-6">
        <div className="max-w-sm text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
            {blocked ? <ShieldOff className="w-6 h-6 text-destructive" /> : <AlertTriangle className="w-6 h-6 text-destructive" />}
          </div>
          <h2 className="font-bold">{TITLES[view.code] || 'Couldn\'t load page'}</h2>
          <p className="text-sm text-muted-foreground">{view.message}</p>
          <div className="flex gap-2 justify-center">
            {!blocked && view.code !== 'EMPTY_QUERY' && <Button size="sm" variant="outline" onClick={onRetry}><RotateCw className="w-3.5 h-3.5 mr-1" />Retry</Button>}
            {ext.startsWith('http') && view.code !== 'BLOCKED_ADDRESS' && view.code !== 'INVALID_URL' && (
              <Button size="sm" onClick={() => window.open(ext, '_blank', 'noopener')}><ExternalLink className="w-3.5 h-3.5 mr-1" />Open in new tab</Button>
            )}
          </div>
        </div>
      </div>
    );
  }
  if (view.kind === 'direct') return (
    <iframe src={view.url} title="Browser" className="w-full h-full border-0 bg-white"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" />
  );
  // Proxied page: scripts allowed but NOT same-origin, so it can't touch Nexus.
  return <iframe srcDoc={view.html} title="Browser" className="w-full h-full border-0 bg-white"
    sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" />;
}
