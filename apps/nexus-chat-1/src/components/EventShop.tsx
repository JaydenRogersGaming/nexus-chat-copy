import { useEffect, useState } from 'react';
import { Gem, Clock, RefreshCw, Crown, Users } from 'lucide-react';
import { itemOwners, events as eventsApi } from 'zitejs/api';
import { useActiveEvent, EVENTS_CHANGED } from '../hooks/useActiveEvent';
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
  const { profile, addGems, updateProfile, isRealOwner } = useApp();
  const [, bump] = useState(0);
  const { overrides } = useActiveEvent();
  const drop = overrides.find(o => o.holidayKey === event.holiday.key)?.shopDrop ?? 0;
  const { theme, typing, badge } = limitedItems(event, drop);
  const [stats, setStats] = useState<Record<string, { count: number; firstEmail: string; firstName: string }>>({});
  const [refreshing, setRefreshing] = useState(false);
  const ids = [theme.id, typing.id, badge.id].join(',');
  useEffect(() => {
    if (!open) return;
    itemOwners({ action: 'stats', itemIds: ids.split(',') })
      .then(r => setStats(Object.fromEntries(r.stats.map(s => [s.itemId, s])))).catch(() => {});
  }, [open, ids]);
  if (!profile) return null;
  const song = holidaySong(event.holiday.key, event.year);
  const owned = DB.getUserItems(profile.email);
  const eq = DB.getEquipped(profile.email);
  const [c1, c2, c3] = event.variant.colors;
  const me = profile.email.toLowerCase();

  const refreshShop = async () => {
    setRefreshing(true);
    try { await eventsApi({ action: 'refreshShop', holidayKey: event.holiday.key }); window.dispatchEvent(new Event(EVENTS_CHANGED)); toast.success('🔄 Limited shop refreshed with new items!'); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not refresh'); }
    finally { setRefreshing(false); }
  };

  const pay = (id: string, cost: number, name: string) => {
    if (profile.gems < cost) { toast.error(`Need ${(cost - profile.gems).toLocaleString()} more gems!`); return false; }
    addGems(-cost); DB.addUserItem(profile.email, id); toast.success(`🎉 You got ${name}! Limited — gone after this event.`);
    itemOwners({ action: 'claim', itemId: id, ownerName: profile.name })
      .then(r => r.stats[0] && setStats(s => ({ ...s, [id]: r.stats[0] }))).catch(() => {});
    return true;
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
          {isRealOwner && (
            <Button size="sm" variant="secondary" className="mt-3 gap-1.5 h-7 text-xs" disabled={refreshing} onClick={refreshShop}>
              <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} /> Refresh shop (new drop{drop ? ` · #${drop}` : ''})
            </Button>
          )}
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
                  {stats[r.id] && (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                      <span className="flex items-center gap-0.5"><Users className="w-3 h-3" />{stats[r.id].count.toLocaleString()} own this</span>
                      <span className="flex items-center gap-0.5 text-amber-500 font-semibold"><Crown className="w-3 h-3" />{stats[r.id].firstEmail === me ? 'You were first!' : `First: ${stats[r.id].firstName}`}</span>
                    </p>
                  )}
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
