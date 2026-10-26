import { formatGems } from '../lib/formatGems';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Gem } from 'lucide-react';
import TitleBadge from './TitleBadge';
import { SHOP_TITLES } from '../lib/gameData';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import CosmeticShop from './CosmeticShop';

type Props = { open: boolean; onClose: () => void };

export default function ShopModal({ open, onClose }: Props) {
  const { profile, addGems, checkAchievements } = useApp();
  const [buying, setBuying] = useState<string | null>(null);

  if (!profile) return null;
  const owned = DB.getUserTitles(profile.email);
  const customShopTitles = DB.getCustomTitles().filter(t => t.availableInShop);

  const allShopItems = [
    ...SHOP_TITLES.map(t => ({ name: t.name, effect: t.effect, cost: t.cost, color: t.color, description: t.description })),
    ...customShopTitles.map(t => ({ name: t.name, effect: t.effect as string, cost: t.cost, color: t.color, description: 'Custom title' })),
  ];

  function buy(title: (typeof allShopItems)[0]) {
    if (!profile) return;
    if (profile.gems < title.cost) { toast.error(`Need ${title.cost - profile.gems} more gems!`); return; }
    if (owned.includes(title.name)) { toast.info('Already owned!'); return; }
    setBuying(title.name);
    addGems(-title.cost);
    DB.addUserTitle(profile.email, title.name);
    toast.success(`🎉 You got "${title.name}"!`);
    setTimeout(() => { checkAchievements(); setBuying(null); }, 500);
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gem className="w-5 h-5 text-purple-400" /> Shop
            <span className="ml-auto text-sm font-normal text-purple-300 flex items-center gap-1">
              <Gem className="w-3.5 h-3.5" />{formatGems(profile.gems)} gems
            </span>
          </DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="titles" className="mt-2">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="titles">Titles</TabsTrigger>
            <TabsTrigger value="bg">Backgrounds</TabsTrigger>
            <TabsTrigger value="typing">Typing</TabsTrigger>
          </TabsList>
          <TabsContent value="bg"><CosmeticShop kind="bg" /></TabsContent>
          <TabsContent value="typing"><CosmeticShop kind="typing" /></TabsContent>
          <TabsContent value="titles">
        <div className="space-y-3 mt-2">
          {allShopItems.map(item => {
            const isOwned = owned.includes(item.name);
            const canAfford = profile.gems >= item.cost;
            return (
              <div key={item.name} className="flex items-center justify-between p-3 rounded-xl border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors">
                <div className="flex flex-col gap-1">
                  <TitleBadge title={item.name} effect={item.effect} color={item.color} size="md" />
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm font-bold flex items-center gap-1">
                    <Gem className="w-3.5 h-3.5 text-purple-400" />{item.cost.toLocaleString()}
                  </span>
                  {isOwned
                    ? <span className="text-xs text-green-400 font-semibold px-2 py-1 bg-green-400/10 rounded-lg">Owned ✓</span>
                    : <Button size="sm" disabled={!canAfford || buying === item.name} onClick={() => buy(item)} className="text-xs">{buying === item.name ? '…' : 'Buy'}</Button>
                  }
                </div>
              </div>
            );
          })}
        </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
