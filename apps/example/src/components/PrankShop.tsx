import { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Switch } from '@project/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { toast } from 'sonner';
import { pranks as pranksApi, presence, type PresenceOutputType } from 'zitejs/api';
import { useApp } from '../contexts/AppContext';
import { useVip } from '../hooks/useVip';
import { isOwnerEmail } from '../lib/gameData';
import { ALL_PRANKS, pranksFor, prankOptOut, setPrankOptOut, type Prank } from '../lib/pranks';

export default function PrankShop() {
  const { profile } = useApp();
  const { active: vip } = useVip(profile?.email);
  const [people, setPeople] = useState<PresenceOutputType['everyone']>([]);
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState('');
  const [shield, setShield] = useState(() => prankOptOut(profile?.email || ''));
  useEffect(() => { presence({ action: 'getOnline' }).then(r => setPeople(r.everyone)).catch(() => {}); }, []);
  if (!profile) return null;
  const owner = isOwnerEmail(profile.email);
  const allowed = new Set(pranksFor(owner, vip).map(p => p.id));
  const others = people.filter(p => p.email.toLowerCase() !== profile.email.toLowerCase());

  async function send(p: Prank) {
    if (!target) { toast.error('Pick someone to prank first'); return; }
    setBusy(p.id);
    try { await pranksApi({ action: 'send', targetEmail: target, prankId: p.id, senderName: profile!.name }); toast.success(`${p.emoji} Prank sent!`); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not send prank'); }
    finally { setBusy(''); }
  }

  const Grid = ({ list }: { list: Prank[] }) => (
    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
      {list.map(p => {
        const ok = allowed.has(p.id);
        return (
          <button key={p.id} disabled={!ok || !!busy} onClick={() => send(p)}
            className={`rounded-xl border p-2 text-center transition ${ok ? 'border-border hover:border-primary hover:bg-primary/5' : 'border-border opacity-40'}`}>
            <div className="text-2xl">{busy === p.id ? <Loader2 className="w-6 h-6 mx-auto animate-spin" /> : p.emoji}</div>
            <p className="text-[11px] font-semibold truncate">{p.name}</p>
            {!ok && <p className="text-[10px] flex items-center justify-center gap-0.5"><Lock className="w-2.5 h-2.5" />Owner</p>}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Pranks are harmless, last up to 30 seconds and can always be closed.</p>
      <Select value={target} onValueChange={setTarget}>
        <SelectTrigger><SelectValue placeholder="Who do you want to prank?" /></SelectTrigger>
        <SelectContent>{others.map(u => <SelectItem key={u.email} value={u.email}>{u.name || u.email}</SelectItem>)}</SelectContent>
      </Select>
      {vip && (
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={shield} onCheckedChange={v => { setPrankOptOut(profile.email, v); setShield(v); }} /> 🛡️ VIP Prank Shield (block pranks on me)
        </label>
      )}
      <h4 className="font-semibold text-sm">😄 Friendly pranks</h4>
      <Grid list={ALL_PRANKS.filter(p => !p.mean)} />
      <h4 className="font-semibold text-sm">😈 Mean pranks {!owner && <span className="text-xs text-muted-foreground font-normal">({vip ? '5 for VIP' : '2 unlocked — VIP gets 5'})</span>}</h4>
      <Grid list={ALL_PRANKS.filter(p => p.mean)} />
    </div>
  );
}
