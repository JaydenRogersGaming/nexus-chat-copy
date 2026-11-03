import { useEffect, useState } from 'react';
import { Pencil, Eraser, Move, Undo2, Redo2, Download, Sparkles, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Slider } from '@project/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { toast } from 'sonner';
import { useUpload } from 'zitejs/upload';
import { cn } from '@project/components/lib/utils';
import EmojiCanvas, { type Tool } from '../components/emoji/EmojiCanvas';
import SelectedPanel from '../components/emoji/SelectedPanel';
import PartThumb from '../components/emoji/PartThumb';
import { useLayerHistory } from '../hooks/useLayerHistory';
import { CANVAS, SHAPES, PARTS, TEMPLATES, sticker, renderLayers, addMyEmoji, getMyEmojis, removeMyEmoji, MY_EMOJIS_EVENT, type Layer, type PartKind, type StickerLayer } from '../lib/emojiParts';

const PALETTE = ['#2b2140', '#ffffff', '#ff4f8b', '#ff6b4a', '#ffb100', '#ffd23f', '#7ed957', '#2ec4b6', '#4fc3f7', '#5b6cff', '#b56cff', '#8d5b3e'];

function exportBlob(layers: Layer[]): Promise<Blob> {
  const c = document.createElement('canvas'); c.width = CANVAS; c.height = CANVAS;
  renderLayers(c.getContext('2d')!, layers, null);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('Export failed'))), 'image/png'));
}

function ToolButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn('flex flex-col items-center gap-1 rounded-2xl px-3 py-2 text-[11px] font-bold transition-all', active ? 'bg-primary text-primary-foreground shadow-lg scale-105' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary')}>
      {icon}{label}
    </button>
  );
}

export default function EmojiMakerPage({ mode = 'emoji' }: { mode?: 'emoji' | 'draw' }) {
  const isEmoji = mode === 'emoji';
  const { layers, canUndo, canRedo, commit, preview, finish, undo, redo } = useLayerHistory();
  const [tool, setTool] = useState<Tool>('pencil');
  const [color, setColor] = useState('#2b2140');
  const [size, setSize] = useState(12);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mine, setMine] = useState(getMyEmojis);
  const { upload, isUploading } = useUpload();
  const selected = layers.find(l => l.id === selectedId && l.type === 'sticker') as StickerLayer | undefined;

  useEffect(() => { const s = () => setMine(getMyEmojis()); window.addEventListener(MY_EMOJIS_EVENT, s); return () => window.removeEventListener(MY_EMOJIS_EVENT, s); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
      if (e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
    };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [undo, redo]);

  function add(kind: PartKind, c: string) {
    const s = sticker(kind, c, CANVAS / 2, CANVAS / 2, ['circle', 'square', 'triangle', 'star', 'heart'].includes(kind) ? 3 : 1.5);
    commit([...layers, s]); setSelectedId(s.id); setTool('move');
  }

  async function savePng() {
    const url = URL.createObjectURL(await exportBlob(layers));
    const a = document.createElement('a'); a.href = url; a.download = isEmoji ? 'my-emoji.png' : 'my-drawing.png'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast.success('Saved as PNG!');
  }

  async function addToCollection() {
    if (!layers.length) { toast.error('Draw something first!'); return; }
    try { const { url } = await upload(await exportBlob(layers), 'emoji.png'); addMyEmoji(url); toast.success('Added to your emoji collection 🎉'); }
    catch { toast.error("Couldn't save your emoji. Try again."); }
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-primary/10 via-background to-accent/20">
      <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-4">
        <header className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl sm:text-3xl font-black">{isEmoji ? '😀 Emoji Maker' : '🎨 Drawing'}</h1>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="icon" onClick={undo} disabled={!canUndo} title="Undo"><Undo2 className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={redo} disabled={!canRedo} title="Redo"><Redo2 className="w-4 h-4" /></Button>
            <Button variant="outline" onClick={savePng} className="gap-1.5"><Download className="w-4 h-4" /><span className="hidden sm:inline">Save PNG</span></Button>
            {isEmoji && <Button onClick={addToCollection} disabled={isUploading} className="gap-1.5">{isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}<span className="hidden sm:inline">Add to my emojis</span></Button>}
          </div>
        </header>

        {isEmoji && <div className="flex gap-2 overflow-x-auto pb-1">
          {TEMPLATES.map(t => (
            <button key={t.name} onClick={() => { commit(t.build()); setSelectedId(null); }} className="flex-shrink-0 flex items-center gap-1.5 rounded-full bg-card border-2 border-border px-3 py-1.5 text-xs font-bold hover:border-primary hover:-translate-y-0.5 transition-all">
              <span className="text-lg">{t.emoji}</span>{t.name}
            </button>
          ))}
        </div>}

        <div className="grid gap-4 lg:grid-cols-[220px_1fr_260px]">
          <aside className="space-y-3 order-2 lg:order-1">
            <div className="grid grid-cols-3 gap-2">
              <ToolButton active={tool === 'pencil'} onClick={() => setTool('pencil')} icon={<Pencil className="w-5 h-5" />} label="Pencil" />
              <ToolButton active={tool === 'eraser'} onClick={() => setTool('eraser')} icon={<Eraser className="w-5 h-5" />} label="Eraser" />
              <ToolButton active={tool === 'move'} onClick={() => setTool('move')} icon={<Move className="w-5 h-5" />} label="Move" />
            </div>
            <div className="rounded-2xl bg-card border-2 border-border p-3 space-y-3">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Colors</p>
              <div className="grid grid-cols-6 gap-1.5">
                {PALETTE.map(c => <button key={c} onClick={() => setColor(c)} aria-label={c} className={cn('aspect-square rounded-full border-2 transition-transform', color === c ? 'border-foreground scale-110' : 'border-border hover:scale-110')} style={{ backgroundColor: c }} />)}
              </div>
              <label className="flex items-center justify-between text-xs font-semibold">Custom <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-8 rounded-lg cursor-pointer bg-transparent" /></label>
              <label className="block text-xs font-semibold">Brush size: {size}px
                <Slider className="mt-2" min={2} max={60} step={1} value={[size]} onValueChange={([v]) => setSize(v)} />
              </label>
              <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => { commit([]); setSelectedId(null); }} disabled={!layers.length}><Trash2 className="w-4 h-4" /> Clear canvas</Button>
            </div>
          </aside>

          <section className="order-1 lg:order-2 space-y-2">
            <EmojiCanvas layers={layers} tool={tool} color={color} size={size} selectedId={selectedId} onSelect={setSelectedId} commit={commit} preview={preview} finish={finish} />
            <p className="text-center text-xs text-muted-foreground">{tool === 'move' ? 'Tap a piece to select it, then drag to move.' : 'Draw right on the canvas — the background stays transparent.'}</p>
          </section>

          <aside className="space-y-3 order-3">
            {selected && tool === 'move' && <SelectedPanel layers={layers} selected={selected} commit={commit} preview={preview} finish={finish} onSelect={setSelectedId} />}
            <div className="rounded-2xl bg-card border-2 border-border p-3">
              <Tabs defaultValue="Shapes">
                <TabsList className={cn('grid w-full h-auto', isEmoji ? 'grid-cols-4' : 'grid-cols-1')}>
                  {['Shapes', ...(isEmoji ? PARTS.map(p => p.group) : [])].map(g => <TabsTrigger key={g} value={g} className="text-[11px] px-1">{g}</TabsTrigger>)}
                </TabsList>
                <TabsContent value="Shapes" className="grid grid-cols-3 gap-1.5">{SHAPES.map(s => <PartThumb key={s.kind} {...s} onClick={() => add(s.kind, s.color)} />)}</TabsContent>
                {isEmoji && PARTS.map(p => <TabsContent key={p.group} value={p.group} className="grid grid-cols-3 gap-1.5">{p.items.map(s => <PartThumb key={s.kind} {...s} onClick={() => add(s.kind, s.color)} />)}</TabsContent>)}
              </Tabs>
            </div>
            {isEmoji && <div className="rounded-2xl bg-card border-2 border-border p-3 space-y-2">
              <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Your emoji collection ({mine.length})</p>
              {mine.length === 0 ? <p className="text-xs text-muted-foreground italic">Tap “Add to my emojis” to use your creations in chat.</p> : (
                <div className="grid grid-cols-5 gap-1.5">
                  {mine.map(e => (
                    <div key={e.id} className="relative group emoji-checker rounded-lg">
                      <img src={e.url} alt="" className="w-full aspect-square object-contain" />
                      <button onClick={() => removeMyEmoji(e.id)} title="Remove" className="absolute -top-1 -right-1 hidden group-hover:flex w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] items-center justify-center">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>}
          </aside>
        </div>
      </div>
    </div>
  );
}
