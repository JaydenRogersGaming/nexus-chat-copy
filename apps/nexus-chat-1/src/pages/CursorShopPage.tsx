import { useState } from 'react';
import { MousePointer2, Check } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import { CURSORS, CursorItem, addOwned, equip, getEquipped, getOwned, cursorCss } from '../lib/cursors';

export default function CursorShopPage() {
  const { profile, addGems } = useApp();
  const email = profile?.email || '';
  const [owned, setOwned] = useState(() => getOwned(email));
  const [equipped, setEquipped] = useState(() => getEquipped(email));
  if (!profile) return null;

  function buy(c: CursorItem) {
    if (profile!.gems < c.price) { toast.error(`You need 💎 ${c.price}`); return; }
    addGems(-c.price);
    addOwned(email, c.id);
    setOwned(getOwned(email));
    use(c);
    toast.success(`${c.emoji} ${c.name} cursor bought and equipped!`);
  }
  function use(c: CursorItem) { equip(email, c.id); setEquipped(c.id); }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><MousePointer2 className="w-6 h-6 text-primary" /> Cursor Shop</h1>
        <p className="text-sm text-muted-foreground">Change how your mouse looks everywhere in Nexus Hub. Hover a card to try it before you buy.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {CURSORS.map(c => {
          const has = owned.includes(c.id), on = equipped === c.id;
          return (
            <div key={c.id} style={{ cursor: cursorCss(c.id) || undefined }}
              className={`rounded-2xl border bg-card p-4 text-center space-y-2 transition-colors ${on ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}>
              <div className="text-4xl">{c.emoji}</div>
              <p className="font-semibold text-sm">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.price ? `💎 ${c.price}` : 'Free'}</p>
              {on ? <Button size="sm" variant="secondary" className="w-full gap-1" disabled><Check className="w-3.5 h-3.5" />Equipped</Button>
                : has ? <Button size="sm" variant="outline" className="w-full" onClick={() => use(c)}>Equip</Button>
                : <Button size="sm" className="w-full" onClick={() => buy(c)}>Buy</Button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
