import { useState } from 'react';
import { toast } from 'sonner';
import { Package } from 'lucide-react';
import { listings, ListingsOutputType } from 'zitejs/api';
import { Card } from '@project/components/ui/card';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Badge } from '@project/components/ui/badge';
import ReportButton from './ReportButton';
import { errMsg, money } from '../../hooks/usePermissions';

type Listing = ListingsOutputType['listings'][number];

export default function ListingCard({ l, myEmail, onBought }: { l: Listing; myEmail: string; onBought: () => void }) {
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const mine = l.sellerEmail.toLowerCase() === myEmail.toLowerCase();
  async function buy() {
    setBusy(true);
    try { await listings({ action: 'buy', id: l.id, quantity: qty }); toast.success(`Ordered ${qty} × ${l.title}`); onBought(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  }
  return (
    <Card className="overflow-hidden flex flex-col">
      <div className="aspect-[4/3] bg-secondary flex items-center justify-center">
        {l.imageUrl ? <img src={l.imageUrl} alt={l.title} className="w-full h-full object-cover" /> : <Package className="w-10 h-10 text-muted-foreground" />}
      </div>
      <div className="p-3 flex-1 flex flex-col gap-1.5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{l.title}</h3>
          <span className="font-bold text-primary whitespace-nowrap">{money(l.price)}</span>
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2">{l.description || 'No description'}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{l.inventory} in stock</Badge>
          <span className="truncate">by {l.sellerEmail.split('@')[0]}</span>
        </div>
        <div className="mt-auto pt-2 flex items-center gap-2">
          {mine ? <span className="text-xs text-muted-foreground">Your listing</span> : (
            <>
              <Input type="number" min={1} max={Math.min(100, l.inventory)} value={qty} onChange={e => setQty(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} className="w-16 h-8" />
              <Button size="sm" className="flex-1" onClick={buy} disabled={busy || l.inventory < qty}>{l.inventory ? 'Buy' : 'Sold out'}</Button>
              <ReportButton targetType="Listing" targetId={l.id} subject={l.title} />
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
