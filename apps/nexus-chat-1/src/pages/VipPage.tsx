import { Lock, Crown } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { useApp } from '../contexts/AppContext';
import { useVip } from '../hooks/useVip';
import { isOwnerEmail } from '../lib/gameData';
import ChatRoom from '../components/ChatRoom';
import VipMembershipCard from '../components/vip/VipMembershipCard';
import VipStyleStudio from '../components/vip/VipStyleStudio';
import VipPerksBoard from '../components/vip/VipPerksBoard';
import VipEarlyAccess from '../components/vip/VipEarlyAccess';
import VipDailyBonus from '../components/vip/VipDailyBonus';
import type * as DB from '../lib/storage';

const PERKS = [
  ['💬', 'VIP Lounge', 'Private chat only VIPs can enter'],
  ['🎨', 'Style Studio', 'Gradient name, glow, animation, role icon & name'],
  ['⚡', 'Early access', 'News, drops and event sign-ups before everyone else'],
  ['🗳️', 'Vote on ideas', 'Suggest songs, topics and server ideas'],
  ['🎁', 'Monthly giveaway', 'One free entry every month'],
  ['🏆', 'VIP of the Month', 'A featured spotlight spot'],
  ['💎', '+25% on all gems', 'Every gem you earn (casino, games, quiz) — except the monthly lottery prize'],
  ['🎃', 'Seasonal role', 'Your VIP role changes with the seasons'],
  ['⌨️', '3× typing gems', '15 gems per chat message instead of 5'],
  ['🎁', 'Daily VIP bonus', 'Claim 500 free gems every day'],
  ['🖱️', 'Free custom cursor', 'Design your own cursor at no cost'],
  ['🏷️', '20% off cursors', 'Every cursor in the shop is cheaper'],
  ['💖', 'VIP-only cursor', 'The exclusive VIP Heart cursor'],
  ['🛡️', 'Prank Shield', 'Turn pranks off so nobody can prank you'],
  ['😈', 'Extra mean pranks', '5 mean pranks instead of 2'],
];

const LOUNGE: DB.ChatRoom = { id: 'vip-lounge', name: '👑 VIP Lounge', type: 'global', members: [], createdBy: 'system' };

export default function VipPage() {
  const { profile } = useApp();
  const { active, style } = useVip(profile?.email);
  if (!profile) return null;
  const unlocked = active || isOwnerEmail(profile.email);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <VipMembershipCard />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {PERKS.map(([e, t, d]) => (
            <div key={t} className="rounded-xl border border-border bg-card p-3">
              <div className="text-xl">{e}</div>
              <p className="font-semibold text-sm mt-1">{t}</p>
              <p className="text-xs text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        {unlocked && <VipDailyBonus />}
        {unlocked ? (
          <Tabs defaultValue="lounge">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="lounge">Lounge</TabsTrigger>
              <TabsTrigger value="style">Style Studio</TabsTrigger>
              <TabsTrigger value="early">Early Access</TabsTrigger>
              <TabsTrigger value="perks">Perks & Votes</TabsTrigger>
            </TabsList>
            <TabsContent value="lounge">
              {style.welcome && <div className="mb-2 rounded-lg bg-primary/10 px-3 py-2 text-sm">{style.icon} {style.welcome}</div>}
              <div className="h-[560px] rounded-xl border border-border overflow-hidden"><ChatRoom room={LOUNGE} /></div>
            </TabsContent>
            <TabsContent value="style"><VipStyleStudio /></TabsContent>
            <TabsContent value="early"><VipEarlyAccess /></TabsContent>
            <TabsContent value="perks"><VipPerksBoard /></TabsContent>
          </Tabs>
        ) : (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
            <p className="font-semibold mt-3 flex items-center justify-center gap-2"><Crown className="w-4 h-4" /> VIP members only</p>
            <p className="text-sm text-muted-foreground mt-1">Subscribe above to unlock the Lounge, Style Studio, early access and more.</p>
          </div>
        )}
      </div>
    </div>
  );
}
