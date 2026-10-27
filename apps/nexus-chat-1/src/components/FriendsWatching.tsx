import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Clapperboard, X } from 'lucide-react';
import { toast } from 'sonner';
import { watchParty, WatchPartyOutputType } from 'zitejs/api';

type Party = WatchPartyOutputType['parties'][0];

/** Strip showing watch parties friends are in, plus a one-time invite toast per party. */
export default function FriendsWatching() {
  const [parties, setParties] = useState<Party[]>([]);
  const [hidden, setHidden] = useState(false);
  const invited = useRef(new Set<string>());
  const nav = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    const load = () => watchParty({ action: 'friends' }).then(r => {
      setParties(r.parties);
      for (const p of r.parties) {
        if (invited.current.has(p.id)) continue;
        invited.current.add(p.id);
        const live = new Date(p.scheduledFor).getTime() <= Date.now();
        toast(`🍿 ${p.hostName} ${live ? 'started' : 'is starting'} a watch party`, {
          description: p.title,
          action: { label: 'Join', onClick: () => nav(`/watch/${p.id}`) },
        });
      }
    }).catch(() => {});
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (hidden || !parties.length || pathname.startsWith('/watch')) return null;
  return (
    <div className="flex items-center gap-2 overflow-x-auto border-b border-border bg-primary/5 px-3 py-1.5 text-xs">
      <Clapperboard className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
      <span className="flex-shrink-0 font-semibold">Friends watching:</span>
      {parties.map(p => {
        const who = p.viewers.length ? p.viewers.map(v => v.name).slice(0, 2).join(', ') : p.hostName;
        return (
          <button key={p.id} onClick={() => nav(`/watch/${p.id}`)} className="flex-shrink-0 rounded-full border border-border bg-card px-2.5 py-0.5 transition hover:border-primary">
            {who} · <span className="font-medium">{p.title}</span> · <span className="text-primary">Join</span>
          </button>
        );
      })}
      <button onClick={() => setHidden(true)} className="ml-auto flex-shrink-0 text-muted-foreground hover:text-foreground" aria-label="Hide"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}
