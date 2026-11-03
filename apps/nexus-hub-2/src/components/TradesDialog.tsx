import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { ArrowLeftRight, Check, X } from 'lucide-react';
import { trades as tradesApi, TradesOutputType } from 'zitejs/api';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@project/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import { useApp } from '../contexts/AppContext';
import { getInventory, giveItem, takeItem, notifyInventory, InvItem } from '../lib/inventory';

type Trade = TradesOutputType['trades'][number];
const ICON: Record<string, string> = { theme: '🎨', typing: '⌨️', title: '🏷️', song: '🎵' };

function ItemPicker({ items, picked, toggle }: { items: InvItem[]; picked: string[]; toggle: (k: string) => void }) {
  if (!items.length) return <p className="text-xs text-muted-foreground">You don't own any tradeable items yet.</p>;
  return (
    <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
      {items.map(i => {
        const k = `${i.kind}:${i.id}`, on = picked.includes(k);
        return <button key={k} onClick={() => toggle(k)} className={`px-2 py-1 rounded-lg border text-[11px] transition ${on ? 'border-primary bg-primary/15 font-semibold' : 'border-border text-muted-foreground hover:bg-secondary'}`}>
          {ICON[i.kind]} {i.name}{i.limited && ' ✦'}
        </button>;
      })}
    </div>
  );
}

const Items = ({ list }: { list: Trade['offer'] }) =>
  list.length ? <span>{list.map(i => `${ICON[i.kind]} ${i.name}`).join(', ')}</span> : <span className="text-muted-foreground">nothing (gift)</span>;

export default function TradesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { profile } = useApp();
  const email = profile?.email ?? '';
  const [list, setList] = useState<Trade[]>([]);
  const [to, setTo] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [answering, setAnswering] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inv = email ? getInventory(email) : [];
  const toggle = (k: string) => setPicked(p => p.includes(k) ? p.filter(x => x !== k) : [...p, k]);
  const pickedItems = () => inv.filter(i => picked.includes(`${i.kind}:${i.id}`)).map(({ kind, id, name }) => ({ kind, id, name }));

  // Apply accepted trades to this browser's inventory exactly once.
  const sync = useCallback((ts: Trade[]) => {
    setList(ts);
    for (const t of ts.filter(x => x.needsApply)) {
      const give = t.mine ? t.offer : t.giveBack, get = t.mine ? t.giveBack : t.offer;
      give.forEach(i => takeItem(email, i)); get.forEach(i => giveItem(email, i));
      tradesApi({ action: 'applied', id: t.id }).catch(() => {});
      notifyInventory();
      toast.success(`Trade complete! You got ${get.map(i => i.name).join(', ') || 'nothing'}.`);
    }
  }, [email]);

  useEffect(() => {
    if (!email) return;
    const load = () => tradesApi({ action: 'list' }).then(r => sync(r.trades)).catch(() => {});
    load(); const t = setInterval(load, 20000); return () => clearInterval(t);
  }, [email, sync]);

  async function run(action: 'offer' | 'accept' | 'decline' | 'cancel', id?: string) {
    setBusy(true);
    try {
      const r = await tradesApi({ action, id, toEmail: to, items: action === 'offer' || action === 'accept' ? pickedItems() : undefined });
      sync(r.trades); setPicked([]); setAnswering(null);
      if (action === 'offer') { setTo(''); toast.success('Trade offer sent!'); }
    } catch (e) { toast.error((e as { userFacingMessage?: string }).userFacingMessage || 'Something went wrong'); }
    finally { setBusy(false); }
  }

  const incoming = list.filter(t => !t.mine && t.status === 'Pending');
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ArrowLeftRight className="w-5 h-5" />Trade Items</DialogTitle>
          <DialogDescription>Trade themes, typing effects, titles and songs (✦ = limited) with other users.</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue={incoming.length ? 'inbox' : 'new'}>
          <TabsList className="w-full">
            <TabsTrigger value="new" className="flex-1">New offer</TabsTrigger>
            <TabsTrigger value="inbox" className="flex-1">Inbox {incoming.length > 0 && <Badge className="ml-1 h-4 px-1">{incoming.length}</Badge>}</TabsTrigger>
            <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
          </TabsList>
          <TabsContent value="new" className="space-y-3">
            <Input placeholder="Their email" value={to} onChange={e => setTo(e.target.value)} />
            <p className="text-xs font-semibold">What you'll give</p>
            <ItemPicker items={inv} picked={picked} toggle={toggle} />
            <p className="text-[11px] text-muted-foreground">They choose what to give back when they accept.</p>
            <Button className="w-full" disabled={busy || !to.trim() || !picked.length} onClick={() => run('offer')}>Send offer</Button>
          </TabsContent>
          <TabsContent value="inbox" className="space-y-2 max-h-96 overflow-y-auto">
            {incoming.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No trade offers right now.</p>}
            {incoming.map(t => (
              <div key={t.id} className="border border-border rounded-lg p-3 space-y-2 text-xs">
                <p><b>{t.fromEmail}</b> offers: <Items list={t.offer} /></p>
                {answering === t.id ? (
                  <>
                    <p className="font-semibold">Pick what to give back (or nothing):</p>
                    <ItemPicker items={inv} picked={picked} toggle={toggle} />
                    <div className="flex gap-2"><Button size="sm" disabled={busy} onClick={() => run('accept', t.id)}><Check className="w-3 h-3 mr-1" />Confirm trade</Button><Button size="sm" variant="ghost" onClick={() => setAnswering(null)}>Back</Button></div>
                  </>
                ) : (
                  <div className="flex gap-2"><Button size="sm" onClick={() => { setPicked([]); setAnswering(t.id); }}>Accept…</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => run('decline', t.id)}><X className="w-3 h-3 mr-1" />Decline</Button></div>
                )}
              </div>
            ))}
          </TabsContent>
          <TabsContent value="history" className="space-y-2 max-h-96 overflow-y-auto">
            {list.filter(t => t.mine || t.status !== 'Pending').map(t => (
              <div key={t.id} className="border border-border rounded-lg p-2.5 text-xs flex items-start gap-2">
                <div className="flex-1 space-y-0.5">
                  <p>{t.mine ? <>To <b>{t.toEmail}</b></> : <>From <b>{t.fromEmail}</b></>}</p>
                  <p>Offered: <Items list={t.offer} /></p>
                  {t.status === 'Accepted' && <p>Back: <Items list={t.giveBack} /></p>}
                </div>
                <Badge variant="outline">{t.status}</Badge>
                {t.mine && t.status === 'Pending' && <Button size="sm" variant="ghost" className="h-6 px-2" disabled={busy} onClick={() => run('cancel', t.id)}>Cancel</Button>}
              </div>
            ))}
            {list.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No trades yet.</p>}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
