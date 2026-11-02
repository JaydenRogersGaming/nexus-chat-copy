import { useEffect, useMemo, useState } from 'react';
import { Clock, RefreshCw, CalendarDays, Flag } from 'lucide-react';
import { itemOwners, events as eventsApi } from 'zitejs/api';
import { useActiveEvent, EVENTS_CHANGED } from '../hooks/useActiveEvent';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@project/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { COSMETICS_EVENT } from './SettingsExtras';
import { ActiveEvent, HOLIDAYS, Holiday, appliesTo, limitedItems, tierFor, variantFor } from '../lib/holidays';
import { holidaySong } from '../lib/holidaySongs';
import { setMusic, getMusic } from '../lib/personalize';
import ShopMusic from './shop/ShopMusic';
import CountryPicker from './shop/CountryPicker';
import ShopItemCard, { ShopRow } from './shop/ShopItemCard';
import OwnerLimitedEditor from './shop/OwnerLimitedEditor';
import { shopPrice, isVip } from '../lib/vip';
import { useOwnerLimited, bgCss } from '../hooks/useOwnerLimited';

type Props = { event: ActiveEvent; open: boolean; onOpenChange: (o: boolean) => void };

/** Which holiday's look the shop uses: a live national day always wins; otherwise the theme picked on the last refresh. */
function resolveTheme(event: ActiveEvent, shopTheme: string | null | undefined): Holiday {
  // Each shop always stays on its own holiday / national day — refreshing only upgrades the items
  void shopTheme;
  return event.holiday;
}

function safeItems(e: ActiveEvent, h: Holiday, drop: number) {
  try { return { holiday: h, ...limitedItems({ holiday: h, year: e.year, variant: variantFor(h, e.year) }, drop) }; }
  catch { return { holiday: e.holiday, ...limitedItems(e, drop) }; } // fall back to the event's own theme
}

export default function EventShop({ event, open, onOpenChange }: Props) {
  const { profile, addGems, updateProfile, isRealOwner } = useApp();
  const [, bump] = useState(0);
  const { overrides, country } = useActiveEvent();
  const ov = overrides.find(o => o.holidayKey === event.holiday.key);
  const drop = ov?.shopDrop ?? 0;
  const { holiday: themeH, theme, typing, badge, tier } = useMemo(() => safeItems(event, resolveTheme(event, ov?.shopTheme), drop), [event, ov?.shopTheme, drop]);
  const variant = variantFor(themeH, event.year);
  const [stats, setStats] = useState<Record<string, { count: number; firstEmail: string; firstName: string }>>({});
  const [refreshing, setRefreshing] = useState(false);
  const { items: ownerItems, mutate } = useOwnerLimited();
  const shownOwnerItems = ownerItems.filter(i => i.active && (!i.holidayKey || i.holidayKey === event.holiday.key));
  const ids = [theme.id, typing.id, badge.id, ...shownOwnerItems.map(i => `own-${i.id}`)].join(',');
  useEffect(() => {
    if (!open) return;
    itemOwners({ action: 'stats', itemIds: ids.split(',') })
      .then(r => setStats(Object.fromEntries(r.stats.map(s => [s.itemId, s])))).catch(() => {});
  }, [open, ids]);
  if (!profile) return null;
  const song = holidaySong(themeH.key, event.year);
  const owned = DB.getUserItems(profile.email);
  const eq = DB.getEquipped(profile.email);
  const accent = typing.color;
  const me = profile.email.toLowerCase();
  const isNational = !!event.holiday.countries;

  const refreshShop = async () => {
    setRefreshing(true);
    // National day stays pinned; otherwise rotate to a random different holiday the user can see
    const next = event.holiday.key;
    try {
      await eventsApi({ action: 'refreshShop', holidayKey: event.holiday.key, shopTheme: next });
      window.dispatchEvent(new Event(EVENTS_CHANGED));
      toast.success(`🔄 Drop ${(drop % 30) + 1}/30 — new ${event.holiday.emoji} ${event.holiday.name} items!${drop === 30 ? ' Looped back to the first drop.' : ''}`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not refresh'); }
    finally { setRefreshing(false); }
  };

  const pay = (id: string, base: number, name: string) => {
    const cost = shopPrice(base, profile.email);
    if (profile.gems < cost) { toast.error(`Need ${(cost - profile.gems).toLocaleString()} more gems!`); return false; }
    addGems(-cost); DB.addUserItem(profile.email, id); toast.success(`🎉 You got ${name}! Limited — gone after this event.`);
    itemOwners({ action: 'claim', itemId: id, ownerName: profile.name })
      .then(r => r.stats[0] && setStats(s => ({ ...s, [id]: r.stats[0] }))).catch(() => {});
    return true;
  };
  const equip = (patch: { bg?: string; typing?: string }) => { DB.setEquipped(profile.email, patch); window.dispatchEvent(new Event(COSMETICS_EVENT)); bump(n => n + 1); };
  const wearBadge = () => { updateProfile({ activeTitle: `${badge.emoji} ${badge.name}`, activeTitleColor: badge.color, activeTitleEffect: 'glow' }); bump(n => n + 1); };

  const box = 'w-20 h-16 rounded-xl border border-white/15 overflow-hidden flex items-center justify-center';
  const rows: ShopRow[] = [
    { id: theme.id, label: 'Limited Background', name: theme.name, cost: theme.cost, preview: <div className={box} style={{ background: theme.css }} />,
      on: eq.bg === theme.id, use: () => equip({ bg: eq.bg === theme.id ? '' : theme.id }) },
    { id: typing.id, label: 'Limited Typing Effect', name: typing.name, cost: typing.cost, preview: <div className={`${box} bg-background text-3xl`}>{variant.badgeEmoji}</div>,
      sub: <p className={`text-xs rounded-lg bg-background/60 px-2 py-1.5 ${typing.className}`} style={{ color: typing.color }}>You {typing.text}</p>, on: eq.typing === typing.id, use: () => equip({ typing: eq.typing === typing.id ? '' : typing.id }) },
    { id: badge.id, label: 'Limited Badge', name: `${badge.emoji} ${badge.name}`, cost: badge.cost, preview: <div className={`${box} text-4xl`} style={{ background: `${accent}22` }}>{badge.emoji}</div>,
      on: profile.activeTitle === `${badge.emoji} ${badge.name}`, use: wearBadge },
    { id: song.id, label: 'Limited Song', name: song.name, cost: song.cost, preview: <div className={`${box} text-3xl`} style={{ background: `${accent}22` }}>🎵</div>,
      sub: <p className="text-[11px] text-muted-foreground">{song.genre} · {song.mood}{song.lyrics ? ` · “${song.lyrics[1]}”` : ''}</p>,
      on: getMusic().url === song.url, use: () => { setMusic({ ...getMusic(), url: song.url }); toast.success('Added to your songs — open the 🎵 music player to play it'); window.dispatchEvent(new Event(COSMETICS_EVENT)); bump(n => n + 1); } },
  ];
  for (const i of shownOwnerItems) {
    const id = `own-${i.id}`;
    if (i.kind === 'Background') rows.push({ id, description: i.description, label: '👑 Owner Exclusive Background', name: `${i.emoji} ${i.name}`, cost: i.cost,
      preview: <div className={box} style={{ background: bgCss(i) }} />, on: eq.bg === id, use: () => equip({ bg: eq.bg === id ? '' : id }) });
    else if (i.kind === 'Typing Effect') rows.push({ id, description: i.description, label: '👑 Owner Exclusive Typing', name: `${i.emoji} ${i.name}`, cost: i.cost,
      preview: <div className={`${box} bg-background text-3xl`}>{i.emoji}</div>,
      sub: <p className={`text-xs rounded-lg bg-background/60 px-2 py-1.5 ${i.effect === 'rainbow' ? 'title-rainbow' : i.effect === 'pulse' ? 'animate-pulse' : ''}`} style={{ color: i.color }}>You {i.typingText} {i.emoji}</p>,
      on: eq.typing === id, use: () => equip({ typing: eq.typing === id ? '' : id }) });
    else if (i.kind === 'Music') rows.push({ id, description: i.description, label: '👑 Owner Exclusive Song', name: `${i.emoji} ${i.name}`, cost: i.cost,
      preview: <div className={`${box} text-3xl`} style={{ background: `linear-gradient(135deg,${i.color}55,${i.color2}55)` }}>🎵</div>,
      on: getMusic().url === i.songUrl,
      use: () => { setMusic({ ...getMusic(), url: i.songUrl }); toast.success('Added to your songs — open the 🎵 music player to play it'); window.dispatchEvent(new Event(COSMETICS_EVENT)); bump(n => n + 1); } });
    else rows.push({ id, description: i.description, label: '👑 Owner Exclusive Title', name: `${i.emoji} ${i.name}`, cost: i.cost,
      preview: <div className={`${box} text-3xl`} style={{ background: `linear-gradient(135deg,${i.color}55,${i.color2}55)` }}>{i.emoji}</div>,
      on: profile.activeTitle === `${i.emoji} ${i.name}`,
      use: () => { updateProfile({ activeTitle: `${i.emoji} ${i.name}`, activeTitleColor: i.color, activeTitleEffect: i.effect === 'none' ? '' : i.effect }); bump(n => n + 1); } });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[calc(100vw-1.5rem)] max-h-[90vh] overflow-y-auto p-0 border-white/10 gap-0">
        {/* Themed hero */}
        <div className="relative px-5 pt-6 pb-5 sm:px-7 text-white" style={{ background: theme.css }}>
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/75" />
          <div className="relative space-y-3">
            <DialogHeader className="text-left space-y-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: accent }}>{isNational ? 'National Day · 1-Day Shop' : 'Limited Holiday Shop'} · {tier.name}</p>
              <DialogTitle className="text-2xl sm:text-3xl font-black leading-tight drop-shadow">{themeH.emoji} {themeH.name} — {variant.name}</DialogTitle>
              <DialogDescription className="text-white/80 text-sm">{variant.tagline}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/85">
              <span className="flex items-center gap-1"><CalendarDays className="w-3.5 h-3.5" />{event.holiday.emoji} {event.holiday.name} · {format(event.day, 'EEEE, MMM d, yyyy')}</span>
              <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Ends {formatDistanceToNow(event.end, { addSuffix: true })}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <ShopMusic songUrl={song.url} title={song.name} open={open} />
              <CountryPicker country={country} />
              {isRealOwner && (
                <Button size="sm" variant="secondary" className="gap-1.5 h-8 text-xs" disabled={refreshing} onClick={refreshShop}>
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh shop · {drop || 0}/30
                </Button>
              )}
            </div>
            {isNational && <p className="text-[11px] text-white/75 flex items-center gap-1"><Flag className="w-3 h-3" />One-day-only shop — closes at midnight!</p>}
            {isRealOwner && <p className="text-[11px] text-white/75">Refreshing gives new {event.holiday.name} items — the theme stays the same.</p>}
          </div>
        </div>
        {/* Items */}
        <div className="p-4 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 bg-background">
          {rows.map((r, i) => (
            <ShopItemCard key={r.id} row={{ ...r, cost: shopPrice(r.cost, profile.email), label: isVip(profile.email) ? `${r.label} · 👑 −25%` : r.label }} index={i} accent={accent} tierName={tier.name} owned={owned.includes(r.id)} stat={stats[r.id]} me={me}
              onBuy={() => { if (pay(r.id, r.cost, r.name)) r.use(); }} />
          ))}
          {isRealOwner && <OwnerLimitedEditor items={ownerItems} holidayKey={event.holiday.key} mutate={mutate} />}
          <p className="sm:col-span-2 text-center text-[11px] text-muted-foreground pt-1">Limited items never come back once the event ends.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
