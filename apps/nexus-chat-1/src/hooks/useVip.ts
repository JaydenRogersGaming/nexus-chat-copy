import { useEffect, useState } from 'react';
import { vipSettings } from 'zitejs/api';
import * as Vip from '../lib/vip';

let priceLoaded = false;

/** Re-renders whenever VIP data changes; returns live VIP info for an email. */
export function useVip(email: string | undefined) {
  const [, tick] = useState(0);
  useEffect(() => {
    const on = () => tick(t => t + 1);
    window.addEventListener('vip-change', on);
    window.addEventListener('storage', on);
    if (!priceLoaded) { priceLoaded = true; vipSettings({}).then(r => Vip.setMonthlyPrice(r.monthlyPrice)).catch(() => { priceLoaded = false; }); }
    return () => { window.removeEventListener('vip-change', on); window.removeEventListener('storage', on); };
  }, []);
  const e = email || '';
  return { active: Vip.isVip(e), owner: Vip.isOwnerVip(e), status: Vip.getVip(e), days: Vip.daysLeft(e), style: Vip.getStyle(e), monthlyPrice: Vip.VIP_PRICE };
}
