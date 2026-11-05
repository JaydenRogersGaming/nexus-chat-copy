import { useState } from 'react';
import { Code2, Loader2, Wand2, RotateCcw, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { aiWebsite } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle } from '@project/components/ui/dialog';
import { cn } from '@project/components/lib/utils';
import BuilderPreview from './builder/BuilderPreview';

const LIMIT = 200_000;
const KINDS = [
  { id: 'business / startup landing page', label: '🚀 Landing page' },
  { id: 'SaaS web app with dashboard', label: '📊 Web app' },
  { id: 'online store with cart', label: '🛍️ Store' },
  { id: 'personal portfolio website', label: '🎨 Portfolio' },
  { id: 'blog / fan page', label: '📰 Blog' },
  { id: 'browser game', label: '🕹️ Game' },
  { id: 'productivity tool (todo, notes, planner)', label: '✅ Tool' },
  { id: 'custom website', label: '✨ Anything' },
];

interface Msg { prompt: string; html: string }

/** AI website builder (Base44 / Zite / Kliv style): chat to build, then keep chatting to edit. */
export default function WebsiteMakerButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(KINDS[0].id);
  const [prompt, setPrompt] = useState('');
  const [versions, setVersions] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [liveChars, setLiveChars] = useState(0);
  const html = versions.at(-1)?.html ?? '';
  const over = prompt.length > LIMIT;

  async function run() {
    const text = prompt.trim();
    if (over || (html && !text)) return;
    setBusy(true); setLiveChars(0);
    try {
      const s = aiWebsite({ kind, prompt: text, currentHtml: html || undefined, history: versions.map(v => v.prompt) });
      for await (const chunk of s) setLiveChars(n => n + chunk.length);
      const r = await s.result;
      setVersions(v => [...v, { prompt: text || `Build a ${kind}`, html: r.html }]);
      setPrompt('');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not build the site'); }
    finally { setBusy(false); }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Code2 className="w-3.5 h-3.5 mr-1" /> Website Builder</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 overflow-hidden flex flex-col md:flex-row gap-0">
          <DialogTitle className="sr-only">AI Website Builder</DialogTitle>
          <div className="md:w-96 shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-border max-h-[50vh] md:max-h-none">
            <div className="p-4 border-b border-border">
              <h2 className="font-black text-lg">🌐 AI Website Builder</h2>
              <p className="text-xs text-muted-foreground">Describe any site or app. Keep chatting to change it.</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {!html && (
                <div className="grid grid-cols-2 gap-1.5">
                  {KINDS.map(k => (
                    <button key={k.id} onClick={() => setKind(k.id)}
                      className={cn('text-xs rounded-md border px-2 py-1.5 text-left', kind === k.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted')}>{k.label}</button>
                  ))}
                </div>
              )}
              {versions.map((v, i) => (
                <div key={i} className="space-y-1">
                  <div className="ml-6 rounded-lg bg-primary/10 px-3 py-2 text-xs whitespace-pre-wrap break-words max-h-40 overflow-y-auto">{v.prompt}</div>
                  <div className="mr-6 rounded-lg bg-muted px-3 py-2 text-xs">✅ Version {i + 1} built ({v.html.length.toLocaleString()} chars)</div>
                </div>
              ))}
            </div>
            <div className="p-3 border-t border-border space-y-2">
              <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); }}
                placeholder={html ? 'What should change? e.g. "add a pricing page and dark mode"' : 'Describe your site in as much detail as you want…'} />
              <div className={cn('text-[11px] text-right', over ? 'text-destructive font-semibold' : 'text-muted-foreground')}>
                {prompt.length.toLocaleString()} / {LIMIT.toLocaleString()}
              </div>
              <Button className="w-full" onClick={run} disabled={busy || over || (!!html && !prompt.trim())}>
                {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}{html ? 'Update site' : 'Build it'}
              </Button>
              {html && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" disabled={busy || versions.length < 2} onClick={() => setVersions(v => v.slice(0, -1))}><Undo2 className="w-3.5 h-3.5 mr-1" />Undo</Button>
                  <Button size="sm" variant="outline" className="flex-1" disabled={busy} onClick={() => setVersions([])}><RotateCcw className="w-3.5 h-3.5 mr-1" />Start over</Button>
                </div>
              )}
            </div>
          </div>
          <BuilderPreview html={html} liveChars={liveChars} busy={busy} />
        </DialogContent>
      </Dialog>
    </>
  );
}
