import { Loader2, AlertTriangle, RotateCw, ExternalLink } from 'lucide-react';
import { Button } from '@project/components/ui/button';

export type TabView =
  | { kind: 'loading' }
  | { kind: 'page'; html: string }
  | { kind: 'direct'; url: string }
  | { kind: 'error'; code: string; message: string };

const TITLES: Record<string, string> = {
  TIMEOUT: 'Page took too long', PROXY_UNAVAILABLE: 'Proxy unavailable', BLOCKED_BY_SITE: 'Blocked by this site',
  BLOCKED_ADDRESS: 'Address not allowed', INVALID_URL: 'Invalid address', UNSUPPORTED: 'Can\'t show this page', TOO_LARGE: 'Page too large',
};

export default function BrowserView({ view, url, onRetry, onLoaded }: { view: TabView; url: string; onRetry: () => void; onLoaded: () => void }) {
  if (view.kind === 'loading') return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background text-muted-foreground">
      <Loader2 className="w-7 h-7 animate-spin text-primary" />
      <p className="text-sm">Loading <span className="font-medium text-foreground">{safeHost(url)}</span>…</p>
    </div>
  );
  if (view.kind === 'error') return (
    <div className="absolute inset-0 flex items-center justify-center bg-background p-6">
      <div className="max-w-sm text-center space-y-3">
        <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center"><AlertTriangle className="w-6 h-6 text-destructive" /></div>
        <h2 className="font-bold">{TITLES[view.code] || 'Couldn\'t load page'}</h2>
        <p className="text-sm text-muted-foreground">{view.message}</p>
        <div className="flex gap-2 justify-center">
          <Button size="sm" onClick={onRetry}><RotateCw className="w-3.5 h-3.5 mr-1" />Retry</Button>
          {view.code !== 'BLOCKED_ADDRESS' && view.code !== 'INVALID_URL' && (
            <Button size="sm" variant="outline" onClick={() => window.open(url, '_blank', 'noopener')}><ExternalLink className="w-3.5 h-3.5 mr-1" />Open in new tab</Button>
          )}
        </div>
      </div>
    </div>
  );
  if (view.kind === 'direct') return (
    <iframe src={view.url} title="Browser" className="w-full h-full border-0 bg-white" onLoad={onLoaded}
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" />
  );
  // Proxied page: scripts allowed but NOT same-origin, so it can't touch Nexus.
  return <iframe srcDoc={view.html} title="Browser" className="w-full h-full border-0 bg-white" onLoad={onLoaded}
    sandbox="allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox" referrerPolicy="no-referrer" />;
}

function safeHost(u: string) { try { return new URL(u).hostname; } catch { return u; } }
