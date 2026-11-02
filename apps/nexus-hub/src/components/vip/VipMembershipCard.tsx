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
import OwnerVipPrice from './OwnerVipPrice';

export default function VipMembershipCard() {
  const { profile, updateProfile } = useApp();
  const { active, owner, status, days, style, monthlyPrice } = useVip(profile?.email);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!profile) return null;
  const season = Vip.seasonalVariant();
  const price = Vip.nextPrice(profile.email);
  const first = price === Vip.VIP_UNLOCK_PRICE;
  const canAfford = isInfiniteGems(profile.gems) || profile.gems >= price;

  const pay = () => {
    setBusy(true);
    const fresh = profile;
    if (!isInfiniteGems(fresh.gems) && fresh.gems < price) { toast.error('Not enough gems'); setBusy(false); return; }
    const updates: Partial<typeof fresh> = isInfiniteGems(fresh.gems) ? {} : { gems: fresh.gems - price };
    if (fresh.role === 'user') updates.role = 'vip'; // never changes staff roles
    updateProfile(updates);
    Vip.markUnlocked(fresh.email);
    const s = Vip.extendVip(fresh.email);
    toast.success(`👑 VIP active until ${new Date(s.expiresAt).toLocaleDateString()}`);
    setBusy(false); setConfirm(false);
  };

  if (owner) return (
    <div className="relative overflow-hidden rounded-2xl border border-border p-6"
      style={{ background: `linear-gradient(135deg, ${style.color1}22, ${style.color2}22)` }}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground"><Crown className="w-4 h-4" /> Nexus VIP · Owner</div>
      <h2 className="text-3xl font-black mt-2" style={Vip.nameStyle(style)}>VIP forever — free for the owner</h2>
      <p className="text-sm text-muted-foreground mt-1">You always have every VIP perk and never pay the monthly fee.</p>
      <OwnerVipPrice current={monthlyPrice} />
    </div>
  );

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
        {Vip.VIP_UNLOCK_PRICE.toLocaleString()} gems one-time to unlock (includes your first {Vip.VIP_DAYS} days), then {monthlyPrice.toLocaleString()} gems every month. Perks, private spaces and gem boosts —
        VIP never grants moderation powers.
      </p>
      <div className="flex flex-wrap items-center gap-3 mt-5">
        <Button onClick={() => setConfirm(true)} disabled={!canAfford || busy} className="gap-2">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : active ? <RefreshCw className="w-4 h-4" /> : <Gem className="w-4 h-4" />}
          {first ? 'Unlock VIP' : active ? 'Add 30 days' : 'Renew VIP'}{status && status.months >= 12 ? ` (${Vip.durationLabel(status.months)} so far)` : ''} · {price.toLocaleString()} 💎
        </Button>
        {!canAfford && <span className="text-xs text-destructive">You need {(price - profile.gems).toLocaleString()} more gems</span>}
        {status && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Switch checked={status.autoRenew} onCheckedChange={v => { Vip.setAutoRenew(profile.email, v); toast(v ? 'Auto-renew on' : 'Auto-renew off — VIP ends when time runs out'); }} />
            Auto-renew
          </label>
        )}
        {status && <span className="text-xs text-muted-foreground">{Vip.durationLabel(status.months)} supported</span>}
      </div>
      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{active ? 'Extend VIP?' : 'Start VIP?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {price.toLocaleString()} gems will be taken from your balance for {Vip.VIP_DAYS} days of VIP{first ? ` (after this, VIP is ${monthlyPrice.toLocaleString()} gems/month)` : ''}. Gems aren't refunded if you cancel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={pay}>Pay {price.toLocaleString()} 💎</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
