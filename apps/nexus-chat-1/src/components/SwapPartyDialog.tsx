import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Repeat2, Copy, LogOut } from 'lucide-react';
import { swapParty, SwapPartyOutputType } from 'zitejs/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';

type Party = SwapPartyOutputType['party'];
const DURATIONS = [['15', '15 minutes'], ['30', '30 minutes'], ['60', '1 hour'], ['180', '3 hours'], ['1440', '1 day']];

export function useSwapParty() {
  const [party, setParty] = useState<Party>(null);
  const refresh = useCallback(() => swapParty({ action: 'mine' }).then(r => setParty(r.party)).catch(() => {}), []);
  useEffect(() => { refresh(); const t = setInterval(refresh, 20000); return () => clearInterval(t); }, [refresh]);
  useEffect(() => {
    if (!party?.endsAt) return;
    const ms = new Date(party.endsAt).getTime() - Date.now();
    const t = setTimeout(() => { setParty(null); toast('🎉 Swap party ended — your theme is back!'); }, Math.max(ms, 0));
    return () => clearTimeout(t);
  }, [party?.endsAt]);
  return { party, setParty };
}

function timeLeft(iso: string) {
  const m = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

export default function SwapPartyDialog({ party, setParty, theme }: {
  party: Party; setParty: (p: Party) => void; theme?: { name: string; css: string };
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState('');
  const [mins, setMins] = useState('30');
  const [busy, setBusy] = useState(false);

  async function run(action: 'host' | 'join' | 'leave') {
    setBusy(true);
    try {
      const r = await swapParty({ action, code, minutes: Number(mins), themeName: theme?.name, themeCss: theme?.css });
      setParty(r.party);
      if (action === 'host') toast.success('Party started! Share the code with friends.');
      if (action === 'join') toast.success('Joined! Themes rotate as friends join.');
    } catch (e) {
      toast.error((e as { userFacingMessage?: string }).userFacingMessage || 'Something went wrong');
    } finally { setBusy(false); }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} title="Theme Swap Party"
        className="fixed bottom-4 right-4 z-40 h-11 px-4 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-2 text-sm font-semibold hover:brightness-110 transition">
        <Repeat2 className="h-4 w-4" />{party ? `Swap · ${timeLeft(party.endsAt)}` : 'Swap Party'}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>🔁 Theme Swap Party</DialogTitle>
            <DialogDescription>Trade your equipped background with friends for a while. Everyone wears the next friend's theme.</DialogDescription>
          </DialogHeader>
          {party ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border p-3">
                <div><p className="text-xs text-muted-foreground">Party code</p><p className="text-2xl font-black tracking-widest">{party.code}</p></div>
                <Button size="icon" variant="outline" onClick={() => { navigator.clipboard.writeText(party.code); toast('Code copied'); }}><Copy className="h-4 w-4" /></Button>
              </div>
              <p className="text-sm">Ends in <b>{timeLeft(party.endsAt)}</b></p>
              {party.myTheme
                ? <div className="h-16 rounded-lg flex items-end p-2 text-white text-xs font-semibold" style={{ background: party.myTheme.css }}>Wearing {party.myTheme.name} from {party.myTheme.from}</div>
                : <p className="text-sm text-muted-foreground">Waiting for friends to join…</p>}
              <ul className="space-y-1">
                {party.members.map(m => <li key={m.email} className="text-sm flex justify-between"><span>{m.name}</span><span className="text-muted-foreground">{m.themeName}</span></li>)}
              </ul>
              <Button variant="destructive" className="w-full" disabled={busy} onClick={() => run('leave')}>
                <LogOut className="h-4 w-4 mr-2" />{party.isHost ? 'End party for everyone' : 'Leave party'}
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm">You bring: <b>{theme?.name || 'nothing yet — equip a background in Settings'}</b></p>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Host a party</p>
                <div className="flex gap-2">
                  <Select value={mins} onValueChange={setMins}>
                    <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{DURATIONS.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                  <Button disabled={busy || !theme} onClick={() => run('host')}>Host</Button>
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-semibold">Join a friend's party</p>
                <div className="flex gap-2">
                  <Input value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="CODE" maxLength={6} />
                  <Button disabled={busy || !theme || code.length < 6} onClick={() => run('join')}>Join</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
