import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Search, Store } from 'lucide-react';
import { useAuth } from 'zitejs/auth';
import { listings, ListingsOutputType } from 'zitejs/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { Input } from '@project/components/ui/input';
import { Skeleton } from '@project/components/ui/skeleton';
import ListingCard from '../components/market/ListingCard';
import MyListings from '../components/market/MyListings';
import OrdersTable from '../components/market/OrdersTable';
import { errMsg, usePermissions } from '../hooks/usePermissions';

type Listing = ListingsOutputType['listings'][number];
type Order = ListingsOutputType['orders'][number];

export default function MarketplacePage() {
  const { user } = useAuth();
  const { has, marketRole, restriction } = usePermissions();
  const [all, setAll] = useState<Listing[] | null>(null);
  const [q, setQ] = useState('');
  const [sales, setSales] = useState<Order[]>([]);
  const [purchases, setPurchases] = useState<Order[]>([]);

  const loadBrowse = () => listings({ action: 'browse' }).then(r => setAll(r.listings)).catch(e => toast.error(errMsg(e)));
  const loadOrders = () => {
    listings({ action: 'myPurchases' }).then(r => setPurchases(r.orders)).catch(() => {});
    listings({ action: 'sellerOrders' }).then(r => setSales(r.orders)).catch(() => {});
  };
  useEffect(() => { loadBrowse(); loadOrders(); }, []);

  const shown = useMemo(() => (all ?? []).filter(l => `${l.title} ${l.description}`.toLowerCase().includes(q.toLowerCase())), [all, q]);
  const canSell = has('listings.sell');
  const patch = (setter: typeof setSales) => (o: Order) => setter(list => list.map(x => (x.id === o.id ? o : x)));

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 max-w-6xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"><Store className="w-5 h-5 text-primary" /></div>
        <div>
          <h1 className="text-2xl font-bold">Marketplace</h1>
          <p className="text-xs text-muted-foreground">You're a {marketRole}{restriction !== 'None' && ` · ${restriction}`}</p>
        </div>
      </div>
      <Tabs defaultValue="browse">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="browse">Browse</TabsTrigger>
          {canSell && <TabsTrigger value="sell">My listings</TabsTrigger>}
          {canSell && <TabsTrigger value="sales">Orders to fill</TabsTrigger>}
          <TabsTrigger value="purchases">My purchases</TabsTrigger>
        </TabsList>
        <TabsContent value="browse" className="space-y-4">
          <div className="relative max-w-sm"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Search listings" value={q} onChange={e => setQ(e.target.value)} /></div>
          {!all ? <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-64" />)}</div>
            : !shown.length ? <p className="text-sm text-muted-foreground py-10 text-center">No listings found.</p>
            : <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">{shown.map(l => <ListingCard key={l.id} l={l} myEmail={user?.email ?? ''} onBought={() => { loadBrowse(); loadOrders(); }} />)}</div>}
          {!canSell && <p className="text-xs text-muted-foreground">Want to sell? Ask an Admin to give you the Seller role.</p>}
        </TabsContent>
        {canSell && <TabsContent value="sell"><MyListings /></TabsContent>}
        {canSell && <TabsContent value="sales"><OrdersTable orders={sales} editable onChange={patch(setSales)} /></TabsContent>}
        <TabsContent value="purchases"><OrdersTable orders={purchases} editable={false} showBuyer={false} onChange={patch(setPurchases)} /></TabsContent>
      </Tabs>
    </div>
  );
}
