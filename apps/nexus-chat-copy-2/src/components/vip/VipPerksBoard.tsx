import { useState } from 'react';
import { ThumbsUp, Trash2, Music, MessageCircleQuestion, Lightbulb, Gift, Star } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { useVip } from '../../hooks/useVip';
import * as Vip from '../../lib/vip';
import * as DB from '../../lib/storage';
import { isOwnerEmail } from '../../lib/gameData';
import { cn } from '@project/components/lib/utils';

const KINDS = [
  { id: 'song', label: 'Song for playlist', icon: Music },
  { id: 'topic', label: 'Event topic', icon: MessageCircleQuestion },
  { id: 'idea', label: 'Server idea', icon: Lightbulb },
] as const;

export default function VipPerksBoard() {
  const { profile } = useApp();
  useVip(profile?.email);
  const [kind, setKind] = useState<Vip.VipRequest['kind']>('idea');
  const [text, setText] = useState('');
  if (!profile) return null;
  const owner = isOwnerEmail(profile.email);
  const reqs = Vip.getRequests().sort((a, b) => b.votes.length - a.votes.length);
  const votm = Vip.getVipOfMonth();
  const votmUser = votm ? DB.getUser(votm) : null;
  const entered = Vip.hasGiveawayEntry(profile.email);

  const submit = () => {
    if (!text.trim()) return;
    Vip.addRequest({ kind, text: text.trim().slice(0, 140), by: profile.email });
    setText(''); toast.success('Submitted to the VIP board');
  };

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 font-semibold"><Gift className="w-4 h-4 text-primary" /> Monthly giveaway</div>
          <p className="text-xs text-muted-foreground mt-1">{Vip.giveawayCount()} VIPs entered this month.</p>
          <Button size="sm" className="mt-3" disabled={entered} onClick={() => { Vip.enterGiveaway(profile.email); toast.success('Entered! 🍀'); }}>
            {entered ? 'You’re entered ✓' : 'Enter giveaway'}
          </Button>
        </div>
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 font-semibold"><Star className="w-4 h-4 text-primary" /> VIP of the Month</div>
          <p className="text-sm mt-2">{votmUser ? `🏆 ${votmUser.name}` : 'Not picked yet — the owner chooses each month.'}</p>
          {owner && (
            <select className="mt-2 w-full h-9 rounded-md border border-input bg-background px-2 text-sm" value={votm}
              onChange={e => { Vip.setVipOfMonth(e.target.value); toast.success('VIP of the Month set'); }}>
              <option value="">Pick a VIP…</option>
              {DB.getAllUsers().filter(u => Vip.isVip(u.email)).map(u => <option key={u.email} value={u.email}>{u.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border p-4">
        <p className="font-semibold mb-3">Requests & ideas — vote on what happens next</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {KINDS.map(k => (
            <Button key={k.id} size="sm" variant={kind === k.id ? 'default' : 'outline'} onClick={() => setKind(k.id)} className="gap-1.5">
              <k.icon className="w-3.5 h-3.5" />{k.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input value={text} maxLength={140} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} placeholder="Type your request…" />
          <Button onClick={submit} disabled={!text.trim()}>Submit</Button>
        </div>
        <div className="mt-4 space-y-2">
          {reqs.length === 0 && <p className="text-sm text-muted-foreground">No requests yet — be the first.</p>}
          {reqs.map(r => {
            const K = KINDS.find(k => k.id === r.kind)!;
            const voted = r.votes.includes(profile.email);
            return (
              <div key={r.id} className="flex items-center gap-3 rounded-lg bg-secondary/50 px-3 py-2">
                <K.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm break-words">{r.text}</p>
                  <p className="text-[11px] text-muted-foreground">{DB.getUser(r.by)?.name || r.by.split('@')[0]}</p>
                </div>
                <button onClick={() => Vip.toggleVote(r.id, profile.email)}
                  className={cn('flex items-center gap-1 text-xs px-2 py-1 rounded-md', voted ? 'bg-primary text-primary-foreground' : 'bg-background')}>
                  <ThumbsUp className="w-3 h-3" />{r.votes.length}
                </button>
                {(owner || r.by === profile.email) && (
                  <button onClick={() => Vip.deleteRequest(r.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
