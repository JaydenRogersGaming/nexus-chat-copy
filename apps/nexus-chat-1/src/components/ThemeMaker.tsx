import { useState } from 'react';
import { Palette, Trash2, Gift, Store } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Switch } from '@project/components/ui/switch';
import { toast } from 'sonner';
import { getCustomThemes, saveCustomThemes, type CustomTheme } from '../lib/cosmetics';
import { COSMETICS_EVENT } from './SettingsExtras';
import * as DB from '../lib/storage';

type Style = 'linear' | 'radial' | 'glow';
function buildCss(style: Style, c: string[], angle: number) {
  if (style === 'radial') return `radial-gradient(circle at center, ${c[1]} 0%, ${c[0]} 70%)`;
  if (style === 'glow') return `radial-gradient(circle at 20% 20%, ${c[1]} 0%, transparent 40%), radial-gradient(circle at 80% 75%, ${c[2]} 0%, transparent 40%), ${c[0]}`;
  return `linear-gradient(${angle}deg, ${c[0]} 0%, ${c[1]} 55%, ${c[2]} 100%)`;
}

export default function ThemeMaker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [colors, setColors] = useState(['#0b1020', '#1e3a8a', '#06b6d4']);
  const [style, setStyle] = useState<Style>('linear');
  const [angle, setAngle] = useState(135);
  const [cost, setCost] = useState(500);
  const [inShop, setInShop] = useState(true);
  const [list, setList] = useState<CustomTheme[]>(getCustomThemes);
  const [giveTo, setGiveTo] = useState<Record<string, string>>({});
  const css = buildCss(style, colors, angle);

  const save = (next: CustomTheme[]) => { setList(next); saveCustomThemes(next); };
  function create() {
    if (!name.trim()) { toast.error('Give your theme a name'); return; }
    save([...list, { id: `bg-custom-${Date.now()}`, name: name.trim(), cost: Math.max(0, cost), css, inShop }]);
    setName(''); toast.success(inShop ? 'Theme added to the shop!' : 'Theme saved — give it to someone below');
  }
  function give(t: CustomTheme) {
    const email = (giveTo[t.id] || '').trim().toLowerCase();
    if (!email) { toast.error('Enter an email'); return; }
    DB.addUserItem(email, t.id);
    window.dispatchEvent(new Event(COSMETICS_EVENT));
    setGiveTo({ ...giveTo, [t.id]: '' });
    toast.success(`🎁 Gave ${t.name} to ${email}`);
  }

  const chip = (on: boolean) => `px-2.5 py-1 rounded-lg border text-[11px] ${on ? 'border-primary bg-primary/15 font-semibold' : 'border-border text-muted-foreground hover:bg-secondary'}`;

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><Palette className="w-5 h-5" />Theme Maker</DialogTitle></DialogHeader>
        <div className="h-28 rounded-xl border border-border flex items-center justify-center text-white font-bold text-lg" style={{ background: css }}>
          {name || 'Your theme'}
        </div>
        <div className="space-y-3">
          <div><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="🌆 Neon City" className="mt-1" /></div>
          <div>
            <Label>Colors</Label>
            <div className="flex gap-2 mt-1">
              {colors.map((c, i) => (
                <input key={i} type="color" value={c} onChange={e => setColors(colors.map((x, j) => (j === i ? e.target.value : x)))} className="w-12 h-9 rounded cursor-pointer bg-transparent" />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button className={chip(style === 'linear')} onClick={() => setStyle('linear')}>Gradient</button>
            <button className={chip(style === 'radial')} onClick={() => setStyle('radial')}>Spotlight</button>
            <button className={chip(style === 'glow')} onClick={() => setStyle('glow')}>Galaxy glow</button>
          </div>
          {style === 'linear' && (
            <div><Label>Angle: {angle}°</Label><input type="range" min={0} max={360} value={angle} onChange={e => setAngle(+e.target.value)} className="w-full mt-1" /></div>
          )}
          <div className="flex items-center justify-between p-3 rounded-xl border border-border">
            <div>
              <p className="text-sm font-semibold flex items-center gap-1.5"><Store className="w-4 h-4" />Sell in shop</p>
              <p className="text-[11px] text-muted-foreground">{inShop ? 'Anyone can buy it with gems' : 'Only you can give it out'}</p>
            </div>
            <Switch checked={inShop} onCheckedChange={setInShop} />
          </div>
          {inShop && <div><Label>Price (gems)</Label><Input type="number" min={0} value={cost} onChange={e => setCost(+e.target.value)} className="mt-1" /></div>}
          <Button className="w-full" onClick={create}>Create theme</Button>
        </div>

        {list.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border">
            <h3 className="text-sm font-semibold">My themes ({list.length})</h3>
            {list.map(t => (
              <div key={t.id} className="p-2.5 rounded-xl border border-border space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-12 h-8 rounded-md border border-border flex-shrink-0" style={{ background: t.css }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{t.name}</p>
                    <p className="text-[10px] text-muted-foreground">{t.inShop ? `In shop · 💎 ${t.cost}` : 'Owner gift only'}</p>
                  </div>
                  <Switch checked={t.inShop} onCheckedChange={v => save(list.map(x => (x.id === t.id ? { ...x, inShop: v } : x)))} />
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => save(list.filter(x => x.id !== t.id))}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                </div>
                <div className="flex gap-2">
                  <Input value={giveTo[t.id] || ''} onChange={e => setGiveTo({ ...giveTo, [t.id]: e.target.value })} placeholder="Give to user@email.com" className="h-8 text-xs" />
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => give(t)}><Gift className="w-3.5 h-3.5" />Give</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
