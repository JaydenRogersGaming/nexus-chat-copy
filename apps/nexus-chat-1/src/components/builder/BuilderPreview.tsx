import { useState } from 'react';
import { Monitor, Tablet, Smartphone, Eye, Code2, ExternalLink, Download, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';

const DEVICES = [
  { id: 'desktop', icon: Monitor, w: '100%' },
  { id: 'tablet', icon: Tablet, w: '768px' },
  { id: 'mobile', icon: Smartphone, w: '390px' },
] as const;

interface Props { html: string; liveChars: number; busy: boolean }

export default function BuilderPreview({ html, liveChars, busy }: Props) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]['id']>('desktop');
  const [tab, setTab] = useState<'preview' | 'code'>('preview');
  const width = DEVICES.find(d => d.id === device)!.w;

  const openTab = () => window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = 'my-nexus-site.html'; a.click();
  };

  return (
    <div className="flex-1 flex flex-col min-h-[320px] bg-muted/30">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-background">
        {(['preview', 'code'] as const).map(t => (
          <Button key={t} size="sm" variant={tab === t ? 'secondary' : 'ghost'} onClick={() => setTab(t)}>
            {t === 'preview' ? <Eye className="w-3.5 h-3.5 mr-1" /> : <Code2 className="w-3.5 h-3.5 mr-1" />}{t === 'preview' ? 'Preview' : 'Code'}
          </Button>
        ))}
        <div className="mx-auto hidden sm:flex gap-1">
          {DEVICES.map(d => (
            <Button key={d.id} size="icon" variant={device === d.id ? 'secondary' : 'ghost'} className="h-8 w-8" onClick={() => setDevice(d.id)} aria-label={d.id}>
              <d.icon className="w-4 h-4" />
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!html} onClick={() => { navigator.clipboard.writeText(html); toast.success('Code copied'); }} aria-label="Copy code"><Copy className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!html} onClick={openTab} aria-label="Open in new tab"><ExternalLink className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!html} onClick={download} aria-label="Download"><Download className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="relative flex-1 overflow-auto flex justify-center p-2">
        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 text-sm gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span>Building your site…</span>
            <span className="text-xs text-muted-foreground">{liveChars.toLocaleString()} characters of code written</span>
          </div>
        )}
        {!html ? (
          <div className="m-auto text-sm text-muted-foreground text-center p-6">Describe your site on the left and hit Build — it shows up here.</div>
        ) : tab === 'code' ? (
          <pre className="w-full text-xs font-mono whitespace-pre-wrap break-all bg-background rounded-md border border-border p-3">{html}</pre>
        ) : (
          <iframe title="Preview" srcDoc={html} sandbox="allow-scripts allow-modals allow-forms allow-popups"
            className={cn('h-full bg-white rounded-md border border-border transition-all')} style={{ width, maxWidth: '100%' }} />
        )}
      </div>
    </div>
  );
}
