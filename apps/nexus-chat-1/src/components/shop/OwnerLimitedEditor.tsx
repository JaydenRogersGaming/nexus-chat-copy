import { useState } from 'react';
import { Plus, Eye, EyeOff, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { toast } from 'sonner';
import { bgCss, type OwnerItem } from '../../hooks/useOwnerLimited';
import type { CustomLimitedInputType } from 'zitejs/api';

const KINDS = ['Title', 'Typing Effect', 'Background'] as const;
const EFFECTS = ['glow', 'rainbow', 'fire', 'pulse', 'none'];

/** Owner-only panel to add hand-made limited items to the shop. */
export default function OwnerLimitedEditor({ items, holidayKey, mutate }: {
  items: OwnerItem[]; holidayKey: string; mutate: (i: CustomLimitedInputType) => Promise<void>;
}) {
  const [f, setF] = useState({ kind: 'Title' as (typeof KINDS)[number], name: '', emoji: '✨', color: '#f5c542', color2: '#ff5fa2', effect: 'glow', typingText: 'is typing…', cost: 1000, allEvents: false });
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF(p => ({ ...p, [k]: v }));

  const run = async (input: CustomLimitedInputType, ok: string) => {
    setBusy(true);
    try { await mutate(input); toast.success(ok); } catch (e) { toast.error(e instanceof Error ? e.message : 'Failed'); } finally { setBusy(false); }
  };
  const add = () => run({ action: 'create', item: {
    name: f.name, kind: f.kind, emoji: f.emoji, color: f.color, color2: f.color2, effect: f.effect,
    typingText: f.typingText, cost: f.cost, holidayKey: f.allEvents ? '' : holidayKey,
  } }, 'Added to the limited shop').then(() => set('name', ''));

  return (
    <div className="sm:col-span-2 rounded-2xl border border-dashed border-primary/50 p-4 space-y-3">
      <p className="font-semibold text-sm">👑 Owner: add your own limited item</p>
      <div className="flex flex-wrap gap-2">
        {KINDS.map(k => <Button key={k} size="sm" variant={f.kind === k ? 'default' : 'outline'} onClick={() => set('kind', k)}>{k}</Button>)}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="col-span-2"><Label className="text-xs">Name</Label><Input maxLength={40} value={f.name} onChange={e => set('name', e.target.value)} placeholder="Pumpkin King" /></div>
        <div><Label className="text-xs">Emoji</Label><Input maxLength={8} value={f.emoji} onChange={e => set('emoji', e.target.value)} /></div>
        <div><Label className="text-xs">Price 💎</Label><Input type="number" min={0} value={f.cost} onChange={e => set('cost', Number(e.target.value) || 0)} /></div>
        <div><Label className="text-xs">Color 1</Label><Input type="color" className="h-9 p-1" value={f.color} onChange={e => set('color', e.target.value)} /></div>
        <div><Label className="text-xs">Color 2</Label><Input type="color" className="h-9 p-1" value={f.color2} onChange={e => set('color2', e.target.value)} /></div>
        {f.kind !== 'Background' && (
          <div className="col-span-2"><Label className="text-xs">Effect</Label>
            <select value={f.effect} onChange={e => set('effect', e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
              {EFFECTS.map(x => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
        )}
        {f.kind === 'Typing Effect' && <div className="col-span-2 sm:col-span-4"><Label className="text-xs">Typing text</Label><Input maxLength={60} value={f.typingText} onChange={e => set('typingText', e.target.value)} /></div>}
      </div>
      <Preview f={f} />
      <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={f.allEvents} onChange={e => set('allEvents', e.target.checked)} /> Show in every event (not just this one)</label>
      <Button onClick={add} disabled={busy || !f.name.trim()} className="gap-1.5">{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add item</Button>
      {items.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border">
          {items.map(i => (
            <div key={i.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">{i.emoji} {i.name} <span className="text-xs text-muted-foreground">· {i.kind} · {i.cost.toLocaleString()} 💎{i.holidayKey ? '' : ' · all events'}</span></span>
              <button disabled={busy} title={i.active ? 'Hide from shop' : 'Show in shop'} onClick={() => run({ action: 'toggle', id: i.id }, i.active ? 'Hidden' : 'Visible')} className="text-muted-foreground hover:text-foreground">{i.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}</button>
              <button disabled={busy} title="Delete" onClick={() => run({ action: 'delete', id: i.id }, 'Deleted')} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Preview({ f }: { f: { kind: string; name: string; emoji: string; color: string; color2: string; effect: string; typingText: string } }) {
  if (f.kind === 'Background') return <div className="h-16 rounded-xl border border-border" style={{ background: bgCss({ ...f, id: '', cost: 0, holidayKey: '', active: true } as OwnerItem) }} />;
  if (f.kind === 'Typing Effect') return <p className={`text-xs ${f.effect === 'rainbow' ? 'title-rainbow' : f.effect === 'pulse' ? 'animate-pulse' : ''}`} style={{ color: f.color }}>You {f.typingText} {f.emoji}</p>;
  return <span className="inline-block font-bold text-sm px-2.5 py-1 rounded-full" style={{ background: `linear-gradient(90deg,${f.color},${f.color2})`, color: '#fff', boxShadow: f.effect === 'glow' ? `0 0 12px ${f.color}` : undefined }}>{f.emoji} {f.name || 'Your title'}</span>;
}
