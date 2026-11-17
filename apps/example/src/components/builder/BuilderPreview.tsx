import { useEffect, useMemo, useState } from 'react';
import { Monitor, Tablet, Smartphone, Eye, Code2, Columns2, ExternalLink, Download, Loader2, Copy, Maximize2, Minimize2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { applySettings, type SiteSettings } from '../../lib/siteSettings';
import BugPanel from './BugPanel';

const DEVICES = [
  { id: 'desktop', icon: Monitor, w: '100%' },
  { id: 'tablet', icon: Tablet, w: '768px' },
  { id: 'mobile', icon: Smartphone, w: '390px' },
] as const;
type Tab = 'preview' | 'code' | 'split';

interface Props {
  html: string; settings: SiteSettings; liveChars: number; busy: boolean; wide: boolean;
  onToggleWide: () => void; onCodeChange: (html: string) => void; onFix: (bugs: string[]) => void;
}

export default function BuilderPreview({ html, settings, liveChars, busy, wide, onToggleWide, onCodeChange, onFix }: Props) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]['id']>('desktop');
  const [tab, setTab] = useState<Tab>('preview');
  const [draft, setDraft] = useState(html);
  const [bugs, setBugs] = useState<string[]>([]);
  useEffect(() => setDraft(html), [html]);
  // Typing in the code editor updates the live preview after a short pause
  useEffect(() => { if (draft === html) return; const t = setTimeout(() => onCodeChange(draft), 600); return () => clearTimeout(t); }, [draft]); // eslint-disable-line react-hooks/exhaustive-deps
  const doc = useMemo(() => (draft ? applySettings(draft, settings, { catchBugs: true }) : ''), [draft, settings]);
  useEffect(() => setBugs([]), [doc]);
  useEffect(() => {
    const on = (e: MessageEvent) => { const m = e.data?.__nexusBug; if (typeof m === 'string') setBugs(b => (b.includes(m) ? b : [...b, m].slice(-20))); };
    window.addEventListener('message', on); return () => window.removeEventListener('message', on);
  }, []);
  const width = DEVICES.find(d => d.id === device)!.w;
  const finalHtml = draft ? applySettings(draft, settings) : '';
  const blobUrl = () => URL.createObjectURL(new Blob([finalHtml], { type: 'text/html' }));
  const download = () => { const a = document.createElement('a'); a.href = blobUrl(); a.download = `${settings.title || 'my-nexus-site'}.html`; document.body.appendChild(a); a.click(); a.remove(); };

  const code = (
    <textarea value={draft} onChange={e => setDraft(e.target.value)} spellCheck={false}
      onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); const t = e.currentTarget, s = t.selectionStart; setDraft(draft.slice(0, s) + '  ' + draft.slice(t.selectionEnd)); requestAnimationFrame(() => t.setSelectionRange(s + 2, s + 2)); } }}
      placeholder="<!DOCTYPE html>&#10;<html>&#10;  <body>Write your own code here — the preview updates as you type.</body>&#10;</html>"
      className="w-full h-full min-h-[300px] resize-none text-xs font-mono leading-relaxed bg-background rounded-md border border-border p-3 outline-none focus:ring-1 focus:ring-primary" />
  );
  const preview = doc ? (
    <iframe title="Preview" srcDoc={doc} sandbox="allow-scripts allow-modals allow-forms allow-popups"
      className="h-full bg-white rounded-md border border-border transition-all mx-auto block" style={{ width, maxWidth: '100%' }} />
  ) : <div className="m-auto text-sm text-muted-foreground text-center p-6 self-center">Describe your app on the left, or open <b>Code</b> and write your own.</div>;

  return (
    <div className="flex-1 flex flex-col min-h-[320px] min-w-0 bg-muted/30">
      <div className="flex items-center gap-1 px-3 py-2 border-b border-border bg-background flex-wrap">
        {([['preview', Eye, 'Preview'], ['code', Code2, 'Code'], ['split', Columns2, 'Code + Preview']] as const).map(([t, Icon, label]) => (
          <Button key={t} size="sm" variant={tab === t ? 'secondary' : 'ghost'} onClick={() => setTab(t)}><Icon className="w-3.5 h-3.5 mr-1" />{label}</Button>
        ))}
        <div className="mx-auto hidden sm:flex gap-1">
          {DEVICES.map(d => (
            <Button key={d.id} size="icon" variant={device === d.id ? 'secondary' : 'ghost'} className="h-8 w-8" onClick={() => setDevice(d.id)} aria-label={d.id}><d.icon className="w-4 h-4" /></Button>
          ))}
        </div>
        <div className="ml-auto flex gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!draft} onClick={() => { navigator.clipboard.writeText(finalHtml); toast.success('Code copied'); }} aria-label="Copy code"><Copy className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!draft} onClick={() => window.open(blobUrl(), '_blank')} aria-label="Open in new tab"><ExternalLink className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" disabled={!draft} onClick={download} aria-label="Download"><Download className="w-4 h-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onToggleWide} aria-label="Bigger view">{wide ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button>
        </div>
      </div>
      <div className="relative flex-1 min-h-0 p-2 flex gap-2">
        {busy && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 text-sm gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-primary" /><span>Building your app…</span>
            <span className="text-xs text-muted-foreground">{liveChars.toLocaleString()} characters of code written</span>
          </div>
        )}
        {tab !== 'preview' && <div className={tab === 'split' ? 'w-1/2 min-w-0' : 'flex-1'}>{code}</div>}
        {tab !== 'code' && <div className="flex-1 min-w-0 overflow-auto flex">{preview}</div>}
      </div>
      <BugPanel bugs={bugs} busy={busy} onClear={() => setBugs([])} onFix={() => onFix(bugs)} />
    </div>
  );
}
