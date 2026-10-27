import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { COSMETICS_EVENT } from './SettingsExtras';
import { allLimitedThemes, allLimitedTyping, allLimitedBadges } from '../lib/holidays';

/** Only your limited (event) items — equip or take off any of them. */
export default function LimitedCollection() {
  const { profile, updateProfile } = useApp();
  const [, bump] = useState(0);
  if (!profile) return null;
  const owned = new Set(DB.getUserItems(profile.email));
  const eq = DB.getEquipped(profile.email);
  const themes = allLimitedThemes().filter(t => owned.has(t.id));
  const typing = allLimitedTyping().filter(t => owned.has(t.id));
  const badges = allLimitedBadges().filter(b => owned.has(b.id));

  const equip = (patch: { bg?: string; typing?: string }) => { DB.setEquipped(profile.email, patch); window.dispatchEvent(new Event(COSMETICS_EVENT)); bump(n => n + 1); };

  if (!themes.length && !typing.length && !badges.length) {
    return <div className="text-center py-10 text-sm text-muted-foreground"><Sparkles className="w-6 h-6 mx-auto mb-2 opacity-60" />No limited items yet — grab some from the holiday limited shop!</div>;
  }

  const Row = ({ preview, label, name, on, toggle }: { preview: React.ReactNode; label: string; name: string; on: boolean; toggle: () => void }) => (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-amber-500/5">
      {preview}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] uppercase tracking-wider font-bold text-amber-500">{label}</p>
        <p className="text-sm font-semibold truncate">{name}</p>
      </div>
      <Button size="sm" variant={on ? 'secondary' : 'outline'} className="text-xs" onClick={toggle}>{on ? 'Unequip' : 'Equip'}</Button>
    </div>
  );

  return (
    <div className="space-y-2 mt-2">
      {themes.map(t => <Row key={t.id} label="Limited Theme" name={t.name} on={eq.bg === t.id}
        preview={<div className="w-14 h-10 rounded-lg border border-border flex-shrink-0" style={{ background: t.css }} />}
        toggle={() => equip({ bg: eq.bg === t.id ? '' : t.id })} />)}
      {typing.map(t => <Row key={t.id} label="Limited Typing Effect" name={t.name} on={eq.typing === t.id}
        preview={<div className="w-14 h-10 rounded-lg border border-border bg-background flex items-center justify-center text-[10px] flex-shrink-0"><span className={t.className} style={{ color: t.color }}>{t.text.split(' ')[0]}</span></div>}
        toggle={() => equip({ typing: eq.typing === t.id ? '' : t.id })} />)}
      {badges.map(b => {
        const title = `${b.emoji} ${b.name}`;
        const on = profile.activeTitle === title;
        return <Row key={b.id} label="Limited Badge" name={title} on={on}
          preview={<div className="w-14 h-10 rounded-lg border border-border flex items-center justify-center text-2xl flex-shrink-0">{b.emoji}</div>}
          toggle={() => { updateProfile(on ? { activeTitle: '' } : { activeTitle: title, activeTitleColor: b.color, activeTitleEffect: 'glow' }); bump(n => n + 1); }} />;
      })}
    </div>
  );
}
