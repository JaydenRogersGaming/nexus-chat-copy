import { useState } from 'react';
import { Crown, Gem, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Switch } from '@project/components/ui/switch';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@project/components/ui/alert-dialog';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';
import { useVip } from '../../hooks/useVip';
import * as Vip from '../../lib/vip';
import { isInfiniteGems } from '../../lib/formatGems';

export default function VipMembershipCard() {
  const { profile, updateProfile } = useApp();
  const { active, status, days, style } = useVip(profile?.email);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!profile) return null;
  const season = Vip.seasonalVariant();
  const canAfford = isInfiniteGems(profile.gems) || profile.gems >= Vip.VIP_PRICE;

  const pay = () => {
    setBusy(true);
    const fresh = profile;
    if (!isInfiniteGems(fresh.gems) && fresh.gems < Vip.VIP_PRICE) { toast.error('Not enough gems'); setBusy(false); return; }
    const updates: Partial<typeof fresh> = isInfiniteGems(fresh.gems) ? {} : { gems: fresh.gems - Vip.VIP_PRICE };
    if (fresh.role === 'user') updates.role = 'vip'; // never changes staff roles
    updateProfile(updates);
    const s = Vip.extendVip(fresh.email);
    toast.success(`👑 VIP active until ${new Date(s.expiresAt).toLocaleDateString()}`);
    setBusy(false); setConfirm(false);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border p-6"
      style={{ background: `linear-gradient(135deg, ${style.color1}22, ${style.color2}22)` }}>
      <div className="absolute -right-10 -top-10 text-[140px] opacity-10 select-none">{style.icon}</div>
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <Crown className="w-4 h-4" /> Nexus VIP · {season.emoji} {season.label}
      </div>
      <h2 className="text-3xl font-black mt-2" style={Vip.nameStyle(style)}>
        {active ? `You're VIP — ${days} day${days === 1 ? '' : 's'} left` : 'Become a VIP'}
      </h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-lg">
        {Vip.VIP_PRICE.toLocaleString()} gems for {Vip.VIP_DAYS} days. Cosmetic perks, private spaces and early access —
        VIP never grants moderation powers.
      </p>
      <div className="flex flex-wrap items-center gap-3 mt-5">
        <Button onClick={() => setConfirm(true)} disabled={!canAfford || busy} className="gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : active ? <RefreshCw className="w-4 h-4" /> : <Gem className="w-4 h-4" />}
          {active ? 'Add 30 days' : 'Subscribe'} · {Vip.VIP_PRICE.toLocaleString()} 💎
        </Button>
        {!canAfford && <span className="text-xs text-destructive">You need {Vip.VIP_PRICE - profile.gems} more gems</span>}
        {status && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={status.autoRenew} onCheckedChange={v => { Vip.setAutoRenew(profile.email, v); toast(v ? 'Auto-renew on' : 'Auto-renew off — VIP ends when time runs out'); }} />
            Auto-renew
          </label>
        )}
        {status && <span className="text-xs text-muted-foreground">{status.months} month{status.months === 1 ? '' : 's'} supported</span>}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{active ? 'Extend VIP?' : 'Start VIP?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {Vip.VIP_PRICE.toLocaleString()} gems will be taken from your balance for {Vip.VIP_DAYS} days of VIP. Gems aren't refunded if you cancel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={pay}>Pay {Vip.VIP_PRICE.toLocaleString()} 💎</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
