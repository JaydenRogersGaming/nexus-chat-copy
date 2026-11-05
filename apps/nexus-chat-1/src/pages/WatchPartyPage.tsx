import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clapperboard, Plus, Users, CalendarClock } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { DateTimePicker } from '@project/components/ui/date-picker';
import { Skeleton } from '@project/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { watchParty, WatchPartyOutputType } from 'zitejs/api';
import { useApp } from '../contexts/AppContext';
import PartyRoom from '../components/watch/PartyRoom';

type Party = WatchPartyOutputType['parties'][0];

function CreateParty({ onCreated }: { onCreated: (id: string) => void }) {
  const { profile } = useApp();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [when, setWhen] = useState<Date | undefined>();
  const [busy, setBusy] = useState(false);
  const valid = title.trim() && /^https?:\/\//.test(url.trim());
  async function create() {
    setBusy(true);
    try {
      const r = await watchParty({ action: 'create', title, videoUrl: url, scheduledFor: when?.toISOString(), name: profile?.name });
      toast.success(when ? 'Watch party scheduled!' : 'Watch party started!');
      onCreated(r.parties[0].id);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not create party'); } finally { setBusy(false); }
  }
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold"><Plus className="h-4 w-4" />Start a watch party</p>
      <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="What are we watching?" maxLength={100} />
      <Input value={url} onChange={e => setUrl(e.target.value)} placeholder="YouTube link, video file link or stream link" />
      <DateTimePicker value={when} onChange={setWhen} />
      <p className="text-[11px] text-muted-foreground">Leave the time empty to start now. YouTube and video-file links stay synced for everyone.</p>
      <Button className="w-full" disabled={!valid || busy} onClick={create}>{when ? 'Schedule party' : 'Start now'}</Button>
    </div>
  );
}

function PartyCard({ p, onJoin }: { p: Party; onJoin: () => void }) {
  const upcoming = new Date(p.scheduledFor).getTime() > Date.now() + 60_000;
  return (
    <button onClick={onJoin} className="w-full rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary"><Clapperboard className="h-5 w-5" /></div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{p.title}</p>
          <p className="text-xs text-muted-foreground">Hosted by {p.hostName}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {upcoming ? <><CalendarClock className="h-3.5 w-3.5" />{format(new Date(p.scheduledFor), 'EEE MMM d, h:mm a')}</> : <><Users className="h-3.5 w-3.5" />{p.viewers.length ? p.viewers.map(v => v.name).join(', ') : 'Nobody watching yet'}</>}
          </p>
        </div>
        {!upcoming && p.viewers.length > 0 && <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold text-destructive-foreground">LIVE</span>}
      </div>
    </button>
  );
}

export default function WatchPartyPage() {
  const { id } = useParams();
  const nav = useNavigate();
  const [parties, setParties] = useState<Party[] | null>(null);
  useEffect(() => {
    if (id) return;
    const load = () => watchParty({ action: 'list' }).then(r => setParties(r.parties)).catch(() => setParties([]));
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [id]);
  if (id) return <PartyRoom id={id} onLeave={() => nav('/watch')} />;

  return (
    <div className="mx-auto grid max-w-5xl gap-4 p-4 md:grid-cols-[1fr_320px]">
      <div className="space-y-3">
        <div><h1 className="text-xl font-bold">🎭 Theater</h1><p className="text-sm text-muted-foreground">Watch together, chat and react in real time. See what everyone is watching right now.</p></div>
        {parties === null ? [0, 1, 2].map(i => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
          : parties.length === 0 ? <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No parties yet — start one!</p>
          : parties.map(p => <PartyCard key={p.id} p={p} onJoin={() => nav(`/watch/${p.id}`)} />)}
      </div>
      <CreateParty onCreated={pid => nav(`/watch/${pid}`)} />
    </div>
  );
}
