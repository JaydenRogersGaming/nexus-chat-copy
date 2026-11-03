import { useState } from 'react';
import { CalendarClock } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { getWeeklyTitles } from '../lib/cosmetics';
import TitleBadge from './TitleBadge';

/** 3 new titles each week, buyable with gems. */
export default function WeeklyTitles() {
  const { profile, addGems } = useApp();
  const [, bump] = useState(0);
  if (!profile) return null;
  const owned = DB.getUserTitles(profile.email);
  const titles = getWeeklyTitles();
  const now = new Date();
  const daysLeft = 7 - ((Math.floor(now.getTime() / 86400000) + 4) % 7);

  function buy(t: ReturnType<typeof getWeeklyTitles>[0]) {
    if ((profile!.gems ?? 0) < t.cost) { toast.error('Not enough gems'); return; }
    addGems(-t.cost);
    DB.addUserTitle(profile!.email, t.name);
    if (!DB.getCustomTitles().some(c => c.name === t.name)) {
      DB.addCustomTitle({ id: `weekly-${t.name}`, name: t.name, effect: t.effect, color: t.color, cost: t.cost, createdBy: 'weekly', availableInShop: false });
    }
    toast.success(`Unlocked "${t.name}" — equip it in your profile`);
    bump(n => n + 1);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
      <p className="font-bold flex items-center gap-2"><CalendarClock className="w-4 h-4 text-primary" /> Weekly Titles</p>
      <p className="text-xs text-muted-foreground">New titles in {daysLeft} day{daysLeft === 1 ? '' : 's'}</p>
      {titles.map(t => (
        <div key={t.name} className="flex items-center gap-2">
          <TitleBadge title={t.name} effect={t.effect} color={t.color} />
          <span className="ml-auto text-xs text-muted-foreground">💎 {t.cost}</span>
          <Button size="sm" className="h-7 text-xs" disabled={owned.includes(t.name)} onClick={() => buy(t)}>{owned.includes(t.name) ? 'Owned' : 'Buy'}</Button>
        </div>
      ))}
    </div>
  );
}
