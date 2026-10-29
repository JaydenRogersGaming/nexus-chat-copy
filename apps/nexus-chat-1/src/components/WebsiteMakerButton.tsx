import { useState } from 'react';
import { Code2, Loader2, Download, Wand2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { aiWebsite } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { Dialog, DialogContent, DialogTitle } from '@project/components/ui/dialog';
import { cn } from '@project/components/lib/utils';

const KINDS = [
  { id: 'Minecraft-style block building game', label: '⛏️ Block world' },
  { id: 'idle clicker game with upgrades', label: '👆 Clicker game' },
  { id: 'arcade game (snake, platformer, or shooter)', label: '🕹️ Arcade game' },
  { id: 'quiz / trivia game', label: '❓ Quiz' },
  { id: 'personal portfolio website', label: '🎨 Portfolio' },
  { id: 'fan page / blog website', label: '📰 Fan page' },
  { id: 'online store landing page', label: '🛍️ Store' },
  { id: 'custom website', label: '✨ Anything' },
];

/** Website & game simulator — open to every signed-in user. */
export default function WebsiteMakerButton() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState(KINDS[0].id);
  const [prompt, setPrompt] = useState('');
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(edit: boolean) {
    setBusy(true);
    try {
      const r = await aiWebsite({ kind, prompt, currentHtml: edit ? html : undefined });
      setHtml(r.html); setPrompt('');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not build the site'); }
    finally { setBusy(false); }
  }
  const download = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = 'my-nexus-site.html'; a.click();
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Code2 className="w-3.5 h-3.5 mr-1" /> Website Maker</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl h-[90vh] p-0 overflow-hidden flex flex-col md:flex-row gap-0">
          <DialogTitle className="sr-only">Website Maker</DialogTitle>
          <div className="md:w-80 shrink-0 p-4 space-y-3 border-b md:border-b-0 md:border-r border-border overflow-y-auto">
            <h2 className="font-black text-lg">🌐 Website Maker</h2>
            <p className="text-xs text-muted-foreground">Pick a type, describe it your way, and AI builds a working site or game you can play here.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {KINDS.map(k => (
                <button key={k.id} onClick={() => setKind(k.id)} disabled={!!html}
                  className={cn('text-xs rounded-md border px-2 py-1.5 text-left disabled:opacity-50', kind === k.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted')}>{k.label}</button>
              ))}
            </div>
            <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}
              placeholder={html ? 'What should change? e.g. "add a shop with 3 upgrades"' : 'Colors, theme, features… e.g. "neon purple clicker about cats"'} />
            <Button className="w-full" onClick={() => run(!!html)} disabled={busy || (!!html && !prompt.trim())}>
              {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}{html ? 'Update site' : 'Build it'}
            </Button>
            {html && <div className="flex gap-2">
              <Button size="sm" variant="outline" className="flex-1" onClick={download}><Download className="w-3.5 h-3.5 mr-1" />Download</Button>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => setHtml('')}><RotateCcw className="w-3.5 h-3.5 mr-1" />Start over</Button>
            </div>}
          </div>
          <div className="flex-1 bg-muted/30 relative min-h-[300px]">
            {busy && <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 text-sm"><Loader2 className="w-5 h-5 mr-2 animate-spin" />Building… this can take ~30 seconds</div>}
            {html ? <iframe title="Preview" srcDoc={html} sandbox="allow-scripts allow-modals" className="w-full h-full bg-white" />
              : <div className="h-full flex items-center justify-center text-sm text-muted-foreground p-6 text-center">Your site preview will show up here.</div>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
