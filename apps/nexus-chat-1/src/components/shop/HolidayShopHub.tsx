import { useState } from 'react';
import { format } from 'date-fns';
import Countdown from './Countdown';
import { ShoppingBag } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { HOLIDAYS, Holiday, ActiveEvent, COUNTRIES, nextWindow, variantFor } from '../../lib/holidays';
import { useActiveEvent } from '../../hooks/useActiveEvent';
import EventShop from '../EventShop';

function Row({ h, onOpen }: { h: Holiday; onOpen: (e: ActiveEvent) => void }) {
  const { overrides } = useActiveEvent();
  const w = nextWindow(h, overrides);
  const v = variantFor(h, w.year);
  const country = h.countries?.[0];
  return (
    <button disabled={!w.live} onClick={() => onOpen({ holiday: h, year: w.year, variant: v, start: w.start, end: w.end, day: w.day })}
      className="w-full flex items-center gap-3 rounded-xl border border-border p-3 text-left transition enabled:hover:border-primary disabled:opacity-60"
      style={{ background: `linear-gradient(90deg, ${v.colors[1]}33, transparent)` }}>
      <span className="text-2xl">{h.emoji}</span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-sm truncate">{h.name}</p>
        <p className="text-[11px] text-muted-foreground truncate">{country ? `${COUNTRIES[country] ?? country} · ` : ''}{format(w.day, 'MMM d, yyyy')}</p>
      </div>
      {w.live
        ? <span className="text-[10px] font-bold rounded-full bg-primary text-primary-foreground px-2 py-0.5">LIVE · <Countdown to={w.end} /></span>
        : <span className="text-[10px] text-muted-foreground whitespace-nowrap">Opens in <Countdown to={w.start} /></span>}
    </button>
  );
}

const sortByNext = (list: Holiday[]) => [...list].sort((a, b) => {
  const wa = nextWindow(a), wb = nextWindow(b);
  return Number(wb.live) - Number(wa.live) || wa.start.getTime() - wb.start.getTime();
});

export default function HolidayShopHub() {
  const [open, setOpen] = useState(false);
  const [shop, setShop] = useState<ActiveEvent | null>(null);
  const holidays = sortByNext(HOLIDAYS.filter(h => !h.countries));
  const national = sortByNext(HOLIDAYS.filter(h => h.countries));
  const pick = (e: ActiveEvent) => { setShop(e); setOpen(false); };
  return (
    <>
      <button onClick={() => setOpen(true)} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors flex items-center gap-1">
        <ShoppingBag className="w-3.5 h-3.5" />Limited
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🛍️ Limited Shops</DialogTitle>
            <DialogDescription>Holiday shops run for two weeks. National-day shops from around the world are open for <b>one day only</b>.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="holidays">
            <TabsList className="w-full">
              <TabsTrigger value="holidays" className="flex-1">🎉 Holidays</TabsTrigger>
              <TabsTrigger value="national" className="flex-1">🌍 National Days</TabsTrigger>
            </TabsList>
            <TabsContent value="holidays" className="space-y-2">{holidays.map(h => <Row key={h.key} h={h} onOpen={pick} />)}</TabsContent>
            <TabsContent value="national" className="space-y-2">{national.map(h => <Row key={h.key} h={h} onOpen={pick} />)}</TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
      {shop && <EventShop event={shop} open={!!shop} onOpenChange={o => !o && setShop(null)} />}
    </>
  );
}
