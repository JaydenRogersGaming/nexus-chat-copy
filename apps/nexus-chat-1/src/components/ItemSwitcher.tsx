import { useEffect, useState } from 'react';
import { Sparkles, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { getInventory } from '../lib/inventory';

const COSMETICS_EVENT = 'nexus-cosmetics';

/** Collapses items with the same name into one entry with a count. */
function groupByName<T extends { name: string }>(items: T[]) {
  const m = new Map<string, { item: T; count: number }>();
  for (const i of items) { const g = m.get(i.name); if (g) g.count++; else m.set(i.name, { item: i, count: 1 }); }
  return [...m.values()];
}

/** Switch between owned original + limited themes, typing effects and titles. */
export default function ItemSwitcher({ showTitles = true }: { showTitles?: boolean }) {
  const { profile, updateProfile } = useApp();
  const [, bump] = useState(0);
  useEffect(() => {
    const f = () => bump(n => n + 1);
    window.addEventListener(COSMETICS_EVENT, f);
    return () => window.removeEventListener(COSMETICS_EVENT, f);
  }, []);
  if (!profile) return null;
  const inv = getInventory(profile.email);
  const eq = DB.getEquipped(profile.email);

  function equip(patch: Partial<{ bg: string; typing: string }>) {
    DB.setEquipped(profile!.email, patch);
    window.dispatchEvent(new Event(COSMETICS_EVENT));
  }

  const chip = (active: boolean) => `px-2.5 py-1 rounded-lg border text-[11px] transition-colors ${active ? 'border-primary bg-primary/15 text-foreground font-semibold' : 'border-border text-muted-foreground hover:bg-secondary'}`;
  const Row = ({ kind, active, onPick }: { kind: 'theme' | 'typing' | 'title'; active: string; onPick: (id: string) => void }) => (
    <div className="flex flex-wrap gap-1.5">
      <button className={chip(!active)} onClick={() => onPick('')}>Default</button>
      {groupByName(inv.filter(i => i.kind === kind)).map(({ item: i, count }) => (
        <button key={i.id} className={chip(active === i.id)} onClick={() => onPick(i.id)}>
          {i.name}{i.limited && <span className="ml-1 text-[9px] px-1 rounded bg-primary/20 text-primary">LIMITED</span>}
          {count > 1 && <span className="ml-1 text-[9px] font-bold px-1 rounded bg-amber-500/20 text-amber-500">×{count}</span>}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4" />My Items <span className="text-[11px] font-normal text-muted-foreground">original + limited</span></h3>
      <div><p className="text-xs font-medium mb-1.5">Theme</p><Row kind="theme" active={eq.bg} onPick={id => { equip({ bg: id }); toast.success('Theme switched'); }} /></div>
      <div><p className="text-xs font-medium mb-1.5">Typing effect</p><Row kind="typing" active={eq.typing} onPick={id => { equip({ typing: id }); toast.success('Typing effect switched'); }} /></div>
      {showTitles && (
        <div><p className="text-xs font-medium mb-1.5 flex items-center gap-1"><Tag className="w-3 h-3" />Title</p>
          <Row kind="title" active={profile.activeTitle} onPick={id => { updateProfile({ activeTitle: id }); toast.success(id ? `Wearing "${id}"` : 'Title removed'); }} />
        </div>
      )}
      {inv.length === 0 && <p className="text-[11px] text-muted-foreground">Buy items in the Shop or the limited event shop.</p>}
    </div>
  );
}
