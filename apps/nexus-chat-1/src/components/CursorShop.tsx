import { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import { CURSORS, CursorItem, addOwned, equip, getEquipped, getOwned, cursorCss } from '../lib/cursors';

export default function CursorShop() {
  const { profile, addGems } = useApp();
  const email = profile?.email || '';
  const [owned, setOwned] = useState(() => getOwned(email));
  const [equipped, setEquipped] = useState(() => getEquipped(email));
  if (!profile) return null;

  function use(c: CursorItem) { equip(email, c.id); setEquipped(c.id); }
  function buy(c: CursorItem) {
    if (profile!.gems < c.price) { toast.error(`You need 💎 ${c.price}`); return; }
    addGems(-c.price);
    addOwned(email, c.id);
    setOwned(getOwned(email));
    use(c);
    toast.success(`${c.emoji} ${c.name} cursor bought and equipped!`);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Change how your mouse looks everywhere. Hover a card to try it.</p>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {CURSORS.map(c => {
          const has = owned.includes(c.id), on = equipped === c.id;
          return (
            <div key={c.id} style={{ cursor: cursorCss(c.id) || undefined }}
              className={`rounded-xl border p-2 text-center space-y-1 ${on ? 'border-primary bg-primary/10' : 'border-border'}`}>
              <div className="text-3xl">{c.emoji}</div>
              <p className="font-semibold text-xs truncate">{c.name}</p>
              <p className="text-[10px] text-muted-foreground">{c.price ? `💎 ${c.price}` : 'Free'}</p>
              {on ? <Button size="sm" variant="secondary" className="w-full h-7 text-xs gap-1" disabled><Check className="w-3 h-3" />On</Button>
                : has ? <Button size="sm" variant="outline" className="w-full h-7 text-xs" onClick={() => use(c)}>Equip</Button>
                : <Button size="sm" className="w-full h-7 text-xs" onClick={() => buy(c)}>Buy</Button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
