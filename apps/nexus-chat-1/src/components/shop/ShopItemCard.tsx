import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Gem, Crown, Users } from 'lucide-react';
import { Button } from '@project/components/ui/button';

export type ShopRow = { id: string; label: string; name: string; cost: number; preview: ReactNode; sub?: ReactNode; description?: string; on: boolean; use: () => void };
type Stat = { count: number; firstEmail: string; firstName: string };

export default function ShopItemCard({ row, index, accent, tierName, owned, stat, me, onBuy }: {
  row: ShopRow; index: number; accent: string; tierName: string; owned: boolean; stat?: Stat; me: string; onBuy: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06, duration: 0.3 }}
      className="group relative flex flex-col gap-3 rounded-2xl border border-white/15 bg-card/85 backdrop-blur-md p-4 shadow-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
      style={{ boxShadow: `0 0 0 1px ${accent}22, 0 10px 30px -12px ${accent}66` }}>
      <div className="flex items-start gap-3">
        <div className="shrink-0">{row.preview}</div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.14em] font-bold" style={{ color: accent }}>{row.label}</p>
          <p className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{row.name}</p>
          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full border" style={{ color: accent, borderColor: `${accent}66`, background: `${accent}14` }}>{tierName}</span>
        </div>
      </div>
      {row.description && <p className="text-xs text-muted-foreground leading-relaxed">{row.description}</p>}
      {row.sub}
      {stat && (
        <p className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" />{stat.count.toLocaleString()} own this</span>
          <span className="flex items-center gap-1 text-amber-400 font-semibold"><Crown className="w-3 h-3" />{stat.firstEmail === me ? 'You were first!' : `First: ${stat.firstName}`}</span>
        </p>
      )}
      <div className="mt-auto">
        {owned
          ? <Button size="sm" className="w-full" variant={row.on ? 'secondary' : 'outline'} onClick={row.use}>{row.on ? 'Equipped ✓' : 'Equip'}</Button>
          : <Button size="sm" className="w-full gap-1.5 font-bold" onClick={onBuy}><Gem className="w-3.5 h-3.5" />{row.cost.toLocaleString()}</Button>}
      </div>
    </motion.div>
  );
}
