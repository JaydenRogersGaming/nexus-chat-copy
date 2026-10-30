import { useState } from 'react';
import { Gem } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { getShopBgThemes, getShopTypingStyles } from '../lib/cosmetics';
import { COSMETICS_EVENT } from './SettingsExtras';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { toast } from 'sonner';
import { shopPrice, isVip } from '../lib/vip';

// Shop section for backgrounds and typing styles — buy, then equip right away
export default function CosmeticShop({ kind }: { kind: 'bg' | 'typing' }) {
  const { profile, addGems } = useApp();
  const [, bump] = useState(0);
  if (!profile) return null;
  const owned = DB.getUserItems(profile.email);
  const eq = DB.getEquipped(profile.email);
  const items = kind === 'bg' ? getShopBgThemes() : getShopTypingStyles();

  function equip(id: string) {
    DB.setEquipped(profile!.email, kind === 'bg' ? { bg: id } : { typing: id });
    window.dispatchEvent(new Event(COSMETICS_EVENT));
    bump(n => n + 1);
  }
  function buy(id: string, base: number, name: string) {
    const cost = shopPrice(base, profile!.email);
    if (profile!.gems < cost) { toast.error(`Need ${cost - profile!.gems} more gems!`); return; }
    addGems(-cost);
    DB.addUserItem(profile!.email, id);
    equip(id);
    toast.success(`🎉 Unlocked & equipped ${name}!`);
  }

  return (
    <div className="space-y-2">
      {items.map(it => {
        const isOwned = owned.includes(it.id);
        const isOn = (kind === 'bg' ? eq.bg : eq.typing) === it.id;
        return (
          <div key={it.id} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-secondary/30">
            {'css' in it
              ? <div className="w-14 h-10 rounded-lg border border-border flex-shrink-0" style={{ background: it.css }} />
              : <div className="w-14 h-10 rounded-lg border border-border bg-background flex items-center justify-center text-[10px] flex-shrink-0">
                  <span className={it.className} style={{ color: it.color }}>{it.text.split(' ')[0]}</span>
                </div>}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{it.name}</p>
              {'text' in it && <p className={`text-[11px] ${it.className}`} style={{ color: it.color }}>You {it.text}</p>}
            </div>
            {isOwned
              ? <Button size="sm" variant={isOn ? 'secondary' : 'outline'} className="text-xs" onClick={() => equip(isOn ? '' : it.id)}>{isOn ? 'Equipped ✓' : 'Equip'}</Button>
              : <Button size="sm" className="text-xs gap-1" disabled={profile.gems < shopPrice(it.cost, profile.email)} onClick={() => buy(it.id, it.cost, it.name)}><Gem className="w-3 h-3" />{shopPrice(it.cost, profile.email).toLocaleString()}{isVip(profile.email) && <span className="text-[10px]">👑−25%</span>}</Button>}
          </div>
        );
      })}
    </div>
  );
}
