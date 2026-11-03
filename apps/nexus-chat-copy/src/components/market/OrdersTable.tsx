import { toast } from 'sonner';
import { listings, ListingsOutputType } from 'zitejs/api';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@project/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Badge } from '@project/components/ui/badge';
import { errMsg, money, when } from '../../hooks/usePermissions';

type Order = ListingsOutputType['orders'][number];
const STATUSES = ['Placed', 'Shipped', 'Completed', 'Cancelled'] as const;

export default function OrdersTable({ orders, editable, onChange, showBuyer = true }: { orders: Order[]; editable: boolean; onChange: (o: Order) => void; showBuyer?: boolean }) {
  async function setStatus(o: Order, s: typeof STATUSES[number]) {
    onChange({ ...o, status: s });
    try { await listings({ action: 'setOrderStatus', id: o.id, orderStatus: s }); }
    catch (e) { onChange(o); toast.error(errMsg(e)); }
  }
  if (!orders.length) return <p className="text-sm text-muted-foreground py-10 text-center">No orders yet.</p>;
  return (
    <div className="border border-border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader><TableRow>
          <TableHead>#</TableHead><TableHead>Item</TableHead><TableHead>{showBuyer ? 'Buyer' : 'Seller'}</TableHead>
          <TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {orders.map(o => (
            <TableRow key={o.id}>
              <TableCell className="font-mono text-xs">{o.orderNumber}</TableCell>
              <TableCell className="font-medium">{o.listingTitle}</TableCell>
              <TableCell className="text-xs">{showBuyer ? o.buyerEmail : o.sellerEmail}</TableCell>
              <TableCell className="text-right">{o.quantity}</TableCell>
              <TableCell className="text-right">{money(o.total)}</TableCell>
              <TableCell>
                {editable ? (
                  <Select value={o.status} onValueChange={v => setStatus(o, v as typeof STATUSES[number])}>
                    <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                ) : <Badge variant="secondary">{o.status}</Badge>}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{when(o.orderedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
