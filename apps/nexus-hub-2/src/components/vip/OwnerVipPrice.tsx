import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { vipSettings } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import * as Vip from '../../lib/vip';

/** Owner-only: change the VIP monthly price for everyone. */
export default function OwnerVipPrice({ current }: { current: number }) {
  const [val, setVal] = useState(String(current));
  const [busy, setBusy] = useState(false);
  const n = Number(val);
  const ok = Number.isInteger(n) && n >= 0 && n !== current;
  async function save() {
    setBusy(true);
    try { const r = await vipSettings({ monthlyPrice: n }); Vip.setMonthlyPrice(r.monthlyPrice); toast.success(`VIP is now ${r.monthlyPrice.toLocaleString()} gems/month`); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Could not save'); } finally { setBusy(false); }
  }
  return (
    <div className="mt-5 max-w-sm space-y-1.5">
      <label htmlFor="vip-price" className="text-sm font-semibold">Monthly VIP price (gems)</label>
      <div className="flex gap-2">
        <Input id="vip-price" type="number" min={0} value={val} onChange={e => setVal(e.target.value)} />
        <Button onClick={save} disabled={!ok || busy}>{busy && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}Save</Button>
      </div>
      <p className="text-xs text-muted-foreground">Currently {current.toLocaleString()} 💎/month for everyone else.</p>
    </div>
  );
}
