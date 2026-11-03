import { useRef } from 'react';
import { Slider } from '@project/components/ui/slider';
import { Button } from '@project/components/ui/button';
import { ArrowUp, ArrowDown, Copy, Trash2 } from 'lucide-react';
import { newId, type Layer, type StickerLayer } from '../../lib/emojiParts';

type Props = { layers: Layer[]; selected: StickerLayer; commit: (l: Layer[]) => void; preview: (l: Layer[]) => void; finish: (b: Layer[]) => void; onSelect: (id: string | null) => void };

export default function SelectedPanel({ layers, selected, commit, preview, finish, onSelect }: Props) {
  const patch = (p: Partial<StickerLayer>) => preview(layers.map(l => (l.id === selected.id ? { ...selected, ...p } : l)));
  const idx = layers.findIndex(l => l.id === selected.id);
  const moveBy = (d: number) => {
    const j = idx + d; if (j < 0 || j >= layers.length) return;
    const next = [...layers]; [next[idx], next[j]] = [next[j], next[idx]]; commit(next);
  };
  // Sliders preview live; the snapshot before the drag becomes one undo step.
  const before = useRef<Layer[] | null>(null);
  const start = () => { before.current = layers; };
  const end = () => { if (before.current) finish(before.current); before.current = null; };

  return (
    <div className="rounded-2xl bg-card border-2 border-border p-3 space-y-3">
      <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">Selected piece</p>
      <label className="block text-xs font-semibold">Size
        <Slider className="mt-2" min={0.2} max={6} step={0.05} value={[selected.scale]} onPointerDown={start} onValueChange={([v]) => patch({ scale: v })} onValueCommit={end} />
      </label>
      <label className="block text-xs font-semibold">Rotate ({Math.round((selected.rot * 180) / Math.PI)}°)
        <Slider className="mt-2" min={-180} max={180} step={1} value={[Math.round((selected.rot * 180) / Math.PI)]} onPointerDown={start} onValueChange={([v]) => patch({ rot: (v * Math.PI) / 180 })} onValueCommit={end} />
      </label>
      <label className="flex items-center justify-between text-xs font-semibold">Color
        <input type="color" value={selected.color} onChange={e => commit(layers.map(l => (l.id === selected.id ? { ...selected, color: e.target.value } : l)))} className="w-10 h-8 rounded-lg cursor-pointer bg-transparent" />
      </label>
      <div className="grid grid-cols-4 gap-1.5">
        <Button size="sm" variant="outline" title="Bring forward" onClick={() => moveBy(1)} disabled={idx === layers.length - 1}><ArrowUp className="w-4 h-4" /></Button>
        <Button size="sm" variant="outline" title="Send backward" onClick={() => moveBy(-1)} disabled={idx === 0}><ArrowDown className="w-4 h-4" /></Button>
        <Button size="sm" variant="outline" title="Duplicate" onClick={() => { const c = { ...selected, id: newId(), x: selected.x + 20, y: selected.y + 20 }; commit([...layers, c]); onSelect(c.id); }}><Copy className="w-4 h-4" /></Button>
        <Button size="sm" variant="destructive" title="Delete" onClick={() => { commit(layers.filter(l => l.id !== selected.id)); onSelect(null); }}><Trash2 className="w-4 h-4" /></Button>
      </div>
    </div>
  );
}
