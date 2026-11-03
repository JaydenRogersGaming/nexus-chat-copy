import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Pause, Play, Rewind, FastForward, RefreshCw, Send, Users, Power, Trash2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { toast } from 'sonner';
import { watchParty, WatchPartyOutputType } from 'zitejs/api';
import { useApp } from '../../contexts/AppContext';
import PartyPlayer, { targetTime } from './PartyPlayer';
import ShowtimeEditor from './ShowtimeEditor';
import { isOwnerEmail } from '../../lib/permissions';
import { platformOf, opensExternally } from '../../lib/theater';
import { format } from 'date-fns';

type Party = WatchPartyOutputType['parties'][0];
type Msg = WatchPartyOutputType['messages'][0];
const REACTIONS = ['😂', '😱', '🔥', '❤️', '👏', '💀'];

export default function PartyRoom({ id, onLeave }: { id: string; onLeave: () => void }) {
  const { profile } = useApp();
  const [party, setParty] = useState<Party | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [nonce, setNonce] = useState(0);
  const [floating, setFloating] = useState<{ id: string; e: string; left: number }[]>([]);
  const seen = useRef(new Set<string>());
  const endRef = useRef<HTMLDivElement>(null);
  const name = profile?.name;

  const apply = (r: WatchPartyOutputType) => {
    if (r.parties[0]) setParty(r.parties[0]);
    const fresh = r.messages.filter(m => m.isReaction && !seen.current.has(m.id));
    r.messages.forEach(m => seen.current.add(m.id));
    if (fresh.length && seen.current.size > fresh.length) setFloating(f => [...f, ...fresh.map(m => ({ id: m.id, e: m.text, left: 10 + Math.random() * 80 }))]);
    setMsgs(r.messages);
  };
  const call = (input: Parameters<typeof watchParty>[0]) => watchParty({ id, name, ...input }).then(apply).catch(e => toast.error(e instanceof Error ? e.message : 'Something went wrong'));

  useEffect(() => {
    call({ action: 'state' });
    const t = setInterval(() => call({ action: 'state' }), 2500);
    return () => clearInterval(t);
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [msgs.length]);
  useEffect(() => { if (!floating.length) return; const t = setTimeout(() => setFloating(f => f.slice(1)), 2500); return () => clearTimeout(t); }, [floating]);

  if (!party) return <div className="p-6 text-sm text-muted-foreground">Joining party…</div>;
  const isHost = party.hostEmail.toLowerCase() === profile?.email.toLowerCase() || isOwnerEmail(profile?.email);
  const platform = platformOf(party.videoUrl);
  const now = targetTime(party);
  const control = (playing: boolean, pos: number) => {
    setParty({ ...party, playing, positionSeconds: pos, syncedAtMs: Date.now() });
    call({ action: 'control', playing, positionSeconds: Math.max(0, pos) });
  };
  const send = (t: string, isReaction = false) => { if (!t.trim()) return; if (!isReaction) setText(''); call({ action: 'send', text: t, isReaction }); };

  return (
    <div className="flex h-full flex-col gap-3 p-3 lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onLeave}><ArrowLeft className="h-4 w-4" /></Button>
          <div className="min-w-0 flex-1"><p className="truncate font-bold">{party.title}</p><p className="text-xs text-muted-foreground">{platform} · Hosted by {party.hostName} · {party.ended ? 'Ended' : party.playing ? 'Playing' : 'Paused'}</p>
            <p className="text-xs text-muted-foreground">Starts {format(new Date(party.scheduledFor), 'MMM d, h:mm a')}{party.endsAt ? ` · Ends ${format(new Date(party.endsAt), 'MMM d, h:mm a')}` : ''}</p></div>
          <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" />{party.viewers.length}</span>
        </div>
        <div className="relative">
          {opensExternally(platform) ? (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-border bg-muted/40 p-6 text-center">
              <p className="text-lg font-bold">{party.title}</p>
              <p className="max-w-sm text-sm text-muted-foreground">{platform} only plays in its own app or site. Open it with your own {platform} account, then hang out in Theater chat.</p>
              <Button asChild><a href={party.videoUrl} target="_blank" rel="noopener noreferrer">Open on {platform}</a></Button>
            </div>
          ) : <PartyPlayer url={party.videoUrl} state={party} isHost={isHost} nonce={nonce} />}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {floating.map(f => <span key={f.id} className="wp-float absolute bottom-2 text-3xl" style={{ left: `${f.left}%` }}>{f.e}</span>)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isHost && !party.ended && <>
            <Button size="sm" variant="outline" onClick={() => control(party.playing, now - 10)}><Rewind className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => control(!party.playing, now)}>{party.playing ? <><Pause className="mr-1 h-4 w-4" />Pause</> : <><Play className="mr-1 h-4 w-4" />Play for everyone</>}</Button>
            <Button size="sm" variant="outline" onClick={() => control(party.playing, now + 10)}><FastForward className="h-4 w-4" /></Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => call({ action: 'end' })}><Power className="mr-1 h-4 w-4" />End</Button>
            <ShowtimeEditor party={party} onSave={(scheduledFor, endsAt) => call({ action: 'schedule', scheduledFor, endsAt })} />
          </>}
          {!isHost && <>
            <span className="text-xs text-muted-foreground">Only {party.hostName} can pause or skip — you're watching live.</span>
            <Button size="sm" variant="outline" onClick={() => setNonce(n => n + 1)}><RefreshCw className="mr-1 h-4 w-4" />Jump to live</Button>
          </>}
          <div className="ml-auto flex gap-1">{REACTIONS.map(r => <button key={r} onClick={() => send(r, true)} className="rounded-lg px-1.5 py-1 text-xl transition hover:scale-125">{r}</button>)}</div>
        </div>
        <p className="text-xs text-muted-foreground">Watching now: {party.viewers.map(v => v.name).join(', ') || 'just you'}</p>
      </div>
      <div className="flex h-80 flex-col rounded-xl border border-border bg-card lg:h-auto lg:w-80">
        <p className="border-b border-border px-3 py-2 text-sm font-semibold">Theater chat</p>
        <div className="flex-1 space-y-1.5 overflow-y-auto p-3 text-sm">
          {msgs.filter(m => !m.isReaction).map(m => (
            <p key={m.id} className="group flex items-start gap-1">
              <span className="flex-1"><span className="font-semibold text-primary">{m.senderName}</span> {m.text}</span>
              {isOwnerEmail(profile?.email) && (
                <button type="button" title="Delete message" className="opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                  onClick={() => { setMsgs(ms => ms.filter(x => x.id !== m.id)); call({ action: 'deleteMessage', messageId: m.id }); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </p>
          ))}
          <div ref={endRef} />
        </div>
        <form className="flex gap-1.5 border-t border-border p-2" onSubmit={e => { e.preventDefault(); send(text); }}>
          <Input value={text} onChange={e => setText(e.target.value)} placeholder="Say something…" maxLength={300} className="h-9" />
          <Button size="sm" type="submit" disabled={!text.trim()}><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </div>
  );
}
