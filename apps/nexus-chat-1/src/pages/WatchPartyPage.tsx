import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clapperboard, Plus, Users, CalendarClock, Search, Lock } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { DateTimePicker } from '@project/components/ui/date-picker';
import { Skeleton } from '@project/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { watchParty, WatchPartyOutputType } from 'zitejs/api';
import { useApp } from '../contexts/AppContext';
import PartyRoom from '../components/watch/PartyRoom';
import { PLATFORMS, platformOf } from '../lib/theater';

type Party = WatchPartyOutputType['parties'][0];
const fmt = (d: string) => format(new Date(d), 'EEE MMM d, h:mm a');
const isLive = (p: Party) => new Date(p.scheduledFor).getTime() <= Date.now() + 60_000;

function CreateMovie({ onCreated }: { onCreated: (id: string) => void }) {
  const { profile } = useApp();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [start, setStart] = useState<Date | undefined>();
  const [end, setEnd] = useState<Date | undefined>();
  const [busy, setBusy] = useState(false);
  const badEnd = !!end && end <= (start ?? new Date());
  const valid = title.trim() && /^https?:\/\//.test(url.trim()) && !badEnd;
  async function create() {
    setBusy(true);
    try {
      const r = await watchParty({ action: 'create', title, videoUrl: url, scheduledFor: start?.toISOString(), endsAt: end?.toISOString(), name: profile?.name });
      toast.success(start ? 'Movie scheduled!' : 'Movie started!');
      onCreated(r.parties[0].id);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not start the movie'); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold"><Plus className="h-4 w-4" />Start a movie</p>
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Movie title" maxLength={100} />
      <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="Link: YouTube, Netflix, Plex, Disney+, video file…" />
      {url && /^https?:\/\//.test(url) && <p className="text-[11px] text-muted-foreground">Detected: <b>{platformOf(url)}</b></p>}
      <label className="block text-xs font-medium">Start time <span className="text-muted-foreground">(empty = now)</span></label>
      <DateTimePicker value={start} onChange={setStart} />
      <label className="block text-xs font-medium">End time <span className="text-muted-foreground">(optional)</span></label>
      <DateTimePicker value={end} onChange={setEnd} />
      {badEnd && <p className="text-xs text-destructive">End time must be after the start time.</p>}
      <p className="text-[11px] text-muted-foreground">YouTube and video files stay synced. Netflix, Plex and other services open in each viewer's own account.</p>
      <Button className="w-full" disabled={!valid || busy} onClick={create}>{start ? 'Schedule movie' : 'Start now'}</Button>
    </div>
  );
}

function MovieCard({ p, onJoin }: { p: Party; onJoin: () => void }) {
  const live = isLive(p);
  return (
    <button onClick={onJoin} className="w-full rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary"><Clapperboard className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.title}</p>
          <p className="text-xs text-muted-foreground">{platformOf(p.videoUrl)} · Hosted by {p.hostName}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><CalendarClock className="h-3.5 w-3.5" />{fmt(p.scheduledFor)}{p.endsAt && ` – ${format(new Date(p.endsAt), 'h:mm a')}`}</p>
          {live && <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{p.viewers.length ? p.viewers.map(v => v.name).join(', ') : 'Nobody watching yet'}</p>}
        </div>
        <span className={live ? 'rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground' : 'rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold'}>{live ? 'NOW PLAYING' : 'UPCOMING'}</span>
      </div>
    </button>
  );
}

export default function WatchPartyPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [parties, setParties] = useState<Party[] | null>(null);
  const [canStart, setCanStart] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [platform, setPlatform] = useState('all');
  useEffect(() => { watchParty({ action: 'access' }).then(r => setCanStart(!!r.canStart)).catch(() => {}); }, []);
  useEffect(() => {
    if (id) return;
    const load = () => watchParty({ action: 'list' }).then(r => setParties(r.parties)).catch(() => setParties([]));
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [id]);
  const shown = useMemo(() => (parties || []).filter(p =>
    (!q.trim() || `${p.title} ${p.hostName}`.toLowerCase().includes(q.toLowerCase()))
    && (status === 'all' || (status === 'live') === isLive(p))
    && (platform === 'all' || platformOf(p.videoUrl) === platform)), [parties, q, status, platform]);
  if (id) return <PartyRoom id={id} onLeave={() => nav('/watch')} />;

  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div><h1 className="text-xl font-bold">🎭 Theater</h1><p className="text-sm text-muted-foreground">Watch movies together, chat and react in real time.</p></div>
        <div className="flex flex-wrap gap-2">
          <div className="relative min-w-[160px] flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search movies or hosts" className="h-9 pl-8" aria-label="Search theaters" />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by status"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All showtimes</SelectItem><SelectItem value="live">Now playing</SelectItem><SelectItem value="upcoming">Upcoming</SelectItem></SelectContent>
          </Select>
          <Select value={platform} onValueChange={setPlatform}>
            <SelectTrigger className="h-9 w-[140px]" aria-label="Filter by service"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All services</SelectItem>{PLATFORMS.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {parties === null ? [0, 1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          : shown.length === 0 ? <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{parties.length ? 'No movies match your filters.' : 'No movies playing right now — check back soon!'}</p>
          : shown.map(p => <MovieCard key={p.id} p={p} onJoin={() => nav(`/watch/${p.id}`)} />)}
      </div>
      {canStart ? <CreateMovie onCreated={pid => nav(`/watch/${pid}`)} /> : (
        <div className="h-fit space-y-1 rounded-xl border border-border bg-card p-4 text-sm">
          <p className="flex items-center gap-1.5 font-semibold"><Lock className="h-4 w-4" />Movies are started by staff</p>
          <p className="text-xs text-muted-foreground">Pick a movie that's playing to join. Only the owner and roles they allow can start new ones.</p>
        </div>
      )}
    </div>
  );
}
