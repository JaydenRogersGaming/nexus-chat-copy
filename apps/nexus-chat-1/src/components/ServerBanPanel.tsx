import { useEffect, useState } from 'react';
import { Ban, Globe, Skull, Loader2 } from 'lucide-react';
import { bans, BansOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { toast } from 'sonner';
import { isOwnerEmail } from '../lib/gameData';

type BanType = 'Ban' | 'IP Ban' | 'Hard Ban';
const TYPES: { id: BanType; icon: typeof Ban; desc: string }[] = [
  { id: 'Ban', icon: Ban, desc: 'Blocks their account' },
  { id: 'IP Ban', icon: Globe, desc: 'Account + every IP they used' },
  { id: 'Hard Ban', icon: Skull, desc: 'Account + IPs + their devices' },
];

export default function ServerBanPanel({ staffName }: { staffName: string }) {
  const [list, setList] = useState<BansOutputType['bans']>([]);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [type, setType] = useState<BanType>('Ban');
  const [busy, setBusy] = useState(false);

  useEffect(() => { bans({ action: 'list' }).then(r => setList(r.bans)).catch(() => toast.error('Could not load bans')); }, []);

  async function run(action: 'ban' | 'unban', target: string) {
    setBusy(true);
    try {
      const r = await bans({ action, email: target, banType: type, reason, bannedBy: staffName });
      setList(r.bans);
      if (action === 'ban') { setEmail(''); setReason(''); toast.success(`🔨 ${type} applied to ${target}`); }
      else toast.success(`Unbanned ${target}`);
    } catch { toast.error('Something went wrong'); }
    setBusy(false);
  }

  type Group = { email: string; types: Set<string>; ips: number; devs: number; by: string };
  type Row = { email: string; banType: string; ipAddress: string; deviceId: string; bannedBy: string };
  const map: Record<string, Group> = {};
  for (const b of list as Row[]) {
    const g = map[b.email] ||= { email: b.email, types: new Set<string>(), ips: 0, devs: 0, by: b.bannedBy };
    g.types.add(b.banType); if (b.ipAddress) g.ips++; if (b.deviceId) g.devs++;
  }
  const grouped: Group[] = Object.values(map);

  return (
    <div className="space-y-4">
      <div className="p-4 bg-card border border-border rounded-xl space-y-3">
        <h3 className="font-semibold flex items-center gap-2"><Ban className="w-5 h-5 text-red-500" />Ban a User</h3>
        <div className="grid grid-cols-3 gap-2">
          {TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              className={`p-2 rounded-lg border text-left transition-colors ${type === t.id ? 'border-red-500 bg-red-500/15' : 'border-border hover:bg-secondary'}`}>
              <t.icon className="w-4 h-4 text-red-400 mb-1" />
              <p className="text-xs font-semibold">{t.id}</p>
              <p className="text-[10px] text-muted-foreground">{t.desc}</p>
            </button>
          ))}
        </div>
        <div><Label>User Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} placeholder="user@email.com" className="mt-1" /></div>
        <div><Label>Reason (optional)</Label><Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Spamming" className="mt-1" /></div>
        <Button variant="destructive" className="w-full" disabled={busy || !email.trim()} onClick={() => {
          const t = email.trim().toLowerCase();
          if (isOwnerEmail(t)) { toast.error("Can't ban the owner!"); return; }
          run('ban', t);
        }}>
          {busy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Ban className="w-4 h-4 mr-2" />}{type}
        </Button>
        <p className="text-[10px] text-muted-foreground">IP and hard bans block every IP/device the user has signed in from. Users who haven't opened the app yet only get an account ban until they do.</p>
      </div>
      <h3 className="font-semibold text-sm">Banned Users ({grouped.length})</h3>
      {grouped.length === 0 && <p className="text-center text-muted-foreground text-sm py-4">No banned users</p>}
      {grouped.map(g => (
        <div key={g.email} className="flex items-center gap-3 p-3 bg-card border border-destructive/30 rounded-xl">
          <Ban className="w-4 h-4 text-red-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{g.email}</p>
            <p className="text-[10px] text-muted-foreground">{[...g.types].join(', ')} • {g.ips} IPs • {g.devs} devices • by {g.by}</p>
          </div>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => run('unban', g.email)}>Unban</Button>
        </div>
      ))}
    </div>
  );
}
