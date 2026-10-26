import { useState } from 'react';
import { Gem, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@project/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { COSMETICS_EVENT } from './SettingsExtras';
import { ActiveEvent, limitedItems } from '../lib/holidays';
import { holidaySong, resolveSongUrl } from '../lib/holidaySongs';
import { setMusic, getMusic } from '../lib/personalize';

let previewAudio: HTMLAudioElement | null = null;
function preview(url: string) {
  if (previewAudio && !previewAudio.paused) { previewAudio.pause(); previewAudio = null; return; }
  previewAudio = new Audio(resolveSongUrl(url)); previewAudio.volume = 0.5; previewAudio.play().catch(() => {});
  setTimeout(() => previewAudio?.pause(), 10000);
}

type Props = { event: ActiveEvent; open: boolean; onOpenChange: (o: boolean) => void };

export default function EventShop({ event, open, onOpenChange }: Props) {
  const { profile, addGems, updateProfile } = useApp();
  const [, bump] = useState(0);
  if (!profile) return null;
  const { theme, typing, badge } = limitedItems(event);
  const song = holidaySong(event.holiday.key, event.year);
  const owned = DB.getUserItems(profile.email);
  const eq = DB.getEquipped(profile.email);
  const [c1, c2, c3] = event.variant.colors;

  const pay = (id: string, cost: number, name: string) => {
    if (profile.gems < cost) { toast.error(`Need ${(cost - profile.gems).toLocaleString()} more gems!`); return false; }
    addGems(-cost); DB.addUserItem(profile.email, id); toast.success(`🎉 You got ${name}! Limited — gone after this event.`); return true;
  };
  const equip = (patch: { bg?: string; typing?: string }) => { DB.setEquipped(profile.email, patch); window.dispatchEvent(new Event(COSMETICS_EVENT)); bump(n => n + 1); };
  const wearBadge = () => { updateProfile({ activeTitle: `${badge.emoji} ${badge.name}`, activeTitleColor: badge.color, activeTitleEffect: 'glow' }); bump(n => n + 1); };

  const rows = [
    { id: theme.id, label: 'Limited Theme', name: theme.name, cost: theme.cost, preview: <div className="w-14 h-10 rounded-lg border border-border" style={{ background: theme.css }} />,
      on: eq.bg === theme.id, use: () => equip({ bg: eq.bg === theme.id ? '' : theme.id }) },
    { id: typing.id, label: 'Limited Typing Effect', name: typing.name, cost: typing.cost, preview: <div className="w-14 h-10 rounded-lg border border-border bg-background flex items-center justify-center text-lg">{event.variant.badgeEmoji}</div>,
      sub: <p className="text-[11px] animate-pulse" style={{ color: typing.color }}>You {typing.text}</p>, on: eq.typing === typing.id, use: () => equip({ typing: eq.typing === typing.id ? '' : typing.id }) },
    { id: badge.id, label: 'Limited Badge', name: `${badge.emoji} ${badge.name}`, cost: badge.cost, preview: <div className="w-14 h-10 rounded-lg border border-border flex items-center justify-center text-2xl" style={{ background: `${c3}22` }}>{badge.emoji}</div>,
      on: profile.activeTitle === `${badge.emoji} ${badge.name}`, use: wearBadge },
    { id: song.id, label: 'Limited Song', name: song.name, cost: song.cost,
      preview: <button onClick={() => preview(song.url)} title="Preview" className="w-14 h-10 rounded-lg border border-border flex items-center justify-center text-xl hover:scale-105 transition-transform" style={{ background: `${c3}22` }}>🎵</button>,
      sub: <p className="text-[11px] text-muted-foreground">Tap 🎵 to preview · plays in your music player</p>,
      on: getMusic().url === song.url, use: () => { setMusic({ ...getMusic(), url: song.url }); toast.success('Added to your songs — open the 🎵 music player to play it'); window.dispatchEvent(new Event(COSMETICS_EVENT)); bump(n => n + 1); } },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg overflow-hidden p-0">
        <div className="p-5 text-white" style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}>
          <DialogHeader><DialogTitle className="text-xl">{event.holiday.emoji} {event.holiday.name} {event.year} — {event.variant.name}</DialogTitle></DialogHeader>
          <p className="text-sm opacity-80">{event.variant.tagline}</p>
          <p className="text-xs mt-2 flex items-center gap-1" style={{ color: c3 }}><Clock className="w-3 h-3" />Ends {formatDistanceToNow(event.end, { addSuffix: true })} — these items never come back</p>
        </div>
        <div className="p-4 space-y-2">
          {rows.map(r => {
            const has = owned.includes(r.id);
            return (
              <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30">
                {r.preview}
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider font-bold" style={{ color: c3 }}>{r.label}</p>
                  <p className="text-sm font-semibold truncate">{r.name}</p>
                  {r.sub}
                </div>
                {has
                  ? <Button size="sm" variant={r.on ? 'secondary' : 'outline'} onClick={r.use}>{r.on ? 'Equipped ✓' : 'Equip'}</Button>
                  : <Button size="sm" className="gap-1" onClick={() => pay(r.id, r.cost, r.name) && r.use()}><Gem className="w-3 h-3" />{r.cost.toLocaleString()}</Button>}
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
