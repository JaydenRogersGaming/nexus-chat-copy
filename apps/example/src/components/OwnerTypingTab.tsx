import { useState } from 'react';
import { Keyboard, Trash2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Switch } from '@project/components/ui/switch';
import { toast } from 'sonner';
import { getCustomTyping, saveCustomTyping, CustomTyping } from '../lib/cosmetics';

const ANIMS = [
  { value: '', label: 'None' },
  { value: 'animate-pulse', label: 'Pulse' },
  { value: 'animate-bounce', label: 'Bounce' },
  { value: 'title-rainbow', label: 'Rainbow' },
];

/** Owner-only: create typing effects that show in the shop. */
export default function OwnerTypingTab() {
  const [list, setList] = useState<CustomTyping[]>(getCustomTyping());
  const [name, setName] = useState('');
  const [text, setText] = useState('is typing…');
  const [color, setColor] = useState('#22d3ee');
  const [anim, setAnim] = useState('animate-pulse');
  const [cost, setCost] = useState('500');

  function save(next: CustomTyping[]) { setList(next); saveCustomTyping(next); }

  function add() {
    if (!name.trim() || !text.trim()) { toast.error('Add a name and the typing text'); return; }
    save([...list, { id: `type-custom-${Date.now()}`, name: name.trim(), text: text.trim(), color, className: anim, cost: Math.max(0, Number(cost) || 0), inShop: true }]);
    setName('');
    toast.success('Typing effect added to the shop');
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <h3 className="font-semibold flex items-center gap-2"><Keyboard className="w-4 h-4" /> Typing effects</h3>
      <div className="grid sm:grid-cols-2 gap-2">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Name, e.g. 👻 Ghost" maxLength={30} />
        <Input value={text} onChange={e => setText(e.target.value)} placeholder="Shown text, e.g. is haunting the chat" maxLength={50} />
        <div className="flex gap-2">
          <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-10 h-9 rounded cursor-pointer bg-transparent" />
          <select value={anim} onChange={e => setAnim(e.target.value)} className="flex-1 rounded-md border border-border bg-secondary px-2 text-sm">
            {ANIMS.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
        </div>
        <Input type="number" min={0} value={cost} onChange={e => setCost(e.target.value)} placeholder="Price in gems" />
      </div>
      <div className="rounded-lg bg-secondary px-3 py-2 text-xs">Preview: <span className="font-semibold">Alex</span> <span className={anim} style={{ color }}>{text}</span></div>
      <Button className="w-full" onClick={add}>Add typing effect</Button>
      <div className="space-y-1.5">
        {list.map(t => (
          <div key={t.id} className="flex items-center gap-2 text-sm rounded-lg border border-border px-3 py-2">
            <span className="flex-1 truncate">{t.name} <span className={`text-xs ${t.className}`} style={{ color: t.color }}>{t.text}</span></span>
            <span className="text-xs text-muted-foreground">💎 {t.cost}</span>
            <Switch checked={t.inShop} onCheckedChange={v => save(list.map(x => x.id === t.id ? { ...x, inShop: v } : x))} />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => save(list.filter(x => x.id !== t.id))}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
        {!list.length && <p className="text-xs text-muted-foreground">No custom typing effects yet.</p>}
      </div>
    </div>
  );
}
