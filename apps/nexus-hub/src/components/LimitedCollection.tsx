import { useMemo, useState } from 'react';
import { Sparkles, ChevronDown } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { COSMETICS_EVENT } from './SettingsExtras';
import { ownedLimitedByHoliday } from '../lib/holidays';

type RowProps = { preview: React.ReactNode; label: string; name: string; on: boolean; toggle: () => void; count?: number };
/** Keeps one of each name and counts the copies. */
function uniq<T extends { name: string }>(items: T[]) {
  const m = new Map<string, { item: T; count: number }>();
  for (const i of items) { const g = m.get(i.name); if (g) g.count++; else m.set(i.name, { item: i, count: 1 }); }
  return [...m.values()];
}
function Row({ preview, label, name, on, toggle, count = 1 }: RowProps) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
      {preview}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-amber-500">{label}</p>
        <p className="text-sm font-semibold truncate">{name}</p>
        <p className="text-[11px] text-muted-foreground">You own {count}</p>
      </div>
      <Button size="sm" variant={on ? 'secondary' : 'outline'} className="text-xs" onClick={toggle}>{on ? 'Unequip' : 'Equip'}</Button>
    </div>
  );
}

/** Your limited (event) items, grouped into one folder per holiday. */
export default function LimitedCollection() {
  const { profile, updateProfile } = useApp();
  const [, bump] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const ownedKey = profile ? DB.getUserItems(profile.email).join('|') : '';
  const groups = useMemo(() => ownedLimitedByHoliday(new Set(ownedKey.split('|'))), [ownedKey]);
  if (!profile) return null;
  const eq = DB.getEquipped(profile.email);
  const equip = (patch: { bg?: string; typing?: string }) => { DB.setEquipped(profile.email, patch); window.dispatchEvent(new Event(COSMETICS_EVENT)); bump(n => n + 1); };

  if (!groups.length) {
    return <div className="text-center py-10 text-sm text-muted-foreground"><Sparkles className="w-6 h-6 mx-auto mb-2 opacity-60" />No limited items yet — grab some from the holiday limited shop!</div>;
  }

  return (
    <div className="space-y-2 mt-2">
      {groups.map(g => {
        const isOpen = open === g.key;
        const equipped = g.themes.some(t => t.id === eq.bg) || g.typing.some(t => t.id === eq.typing) || g.badges.some(b => profile.activeTitle === `${b.emoji} ${b.name}`);
        return (
          <div key={g.key} className="rounded-xl border border-border overflow-hidden">
            <button onClick={() => setOpen(isOpen ? null : g.key)} className="w-full flex items-center gap-3 p-3 hover:bg-secondary/60 transition-colors text-left">
              <span className="text-2xl">{g.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{g.name}</p>
                <p className="text-[11px] text-muted-foreground">{g.count} item{g.count === 1 ? '' : 's'}{equipped ? ' · equipped' : ''}</p>
              </div>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500">×{g.count}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="space-y-2 p-2 pt-0">
                {uniq(g.themes).map(({ item: t, count }) => <Row key={t.id} count={count} label="Limited Theme" name={t.name} on={eq.bg === t.id}
                  preview={<div className="w-14 h-10 rounded-lg border border-border flex-shrink-0" style={{ background: t.css }} />}
                  toggle={() => equip({ bg: eq.bg === t.id ? '' : t.id })} />)}
                {uniq(g.typing).map(({ item: t, count }) => <Row key={t.id} count={count} label="Limited Typing Effect" name={t.name} on={eq.typing === t.id}
                  preview={<div className="w-14 h-10 rounded-lg border border-border bg-background flex items-center justify-center text-[10px] flex-shrink-0"><span className={t.className} style={{ color: t.color }}>{t.text.split(' ')[0]}</span></div>}
                  toggle={() => equip({ typing: eq.typing === t.id ? '' : t.id })} />)}
                {uniq(g.badges).map(({ item: b, count }) => {
                  const title = `${b.emoji} ${b.name}`;
                  const on = profile.activeTitle === title;
                  return <Row key={b.id} count={count} label="Limited Badge" name={title} on={on}
                    preview={<div className="w-14 h-10 rounded-lg border border-border flex items-center justify-center text-2xl flex-shrink-0">{b.emoji}</div>}
                    toggle={() => { updateProfile(on ? { activeTitle: '' } : { activeTitle: title, activeTitleColor: b.color, activeTitleEffect: 'glow' }); bump(n => n + 1); }} />;
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
