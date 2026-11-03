import { useState } from 'react';
import { Gift } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';

const BONUS = 500;
const key = (e: string) => `hub:vip:daily:${e}`;
const today = () => new Date().toISOString().slice(0, 10);

/** VIP perk: 500 free gems once per day. */
export default function VipDailyBonus() {
  const { profile, addGems } = useApp();
  const email = profile?.email || '';
  const [claimed, setClaimed] = useState(() => localStorage.getItem(key(email)) === today());
  if (!profile) return null;
  const claim = () => {
    localStorage.setItem(key(email), today()); setClaimed(true);
    addGems(BONUS, { noBonus: true }); toast.success(`🎁 +${BONUS} VIP daily gems!`);
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-primary/40 bg-primary/5 p-4">
      <div className="flex items-center gap-3"><Gift className="w-6 h-6 text-primary" />
        <div><p className="font-semibold text-sm">VIP daily bonus</p><p className="text-xs text-muted-foreground">{BONUS} free gems every day</p></div>
      </div>
      <Button size="sm" disabled={claimed} onClick={claim}>{claimed ? 'Claimed today' : `Claim ${BONUS} 💎`}</Button>
    </div>
  );
}
