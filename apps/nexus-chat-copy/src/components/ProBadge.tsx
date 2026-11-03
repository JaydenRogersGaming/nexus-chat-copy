import * as Icons from 'lucide-react';
import { cn } from '@project/components/lib/utils';
import { BADGE_DEFS } from '../lib/badges';
import * as DB from '../lib/storage';

// Icons offered in the badge maker (lucide names)
export const BADGE_ICONS = ['Award', 'Trophy', 'Crown', 'Star', 'Shield', 'Gem', 'Flame', 'Zap', 'Heart', 'Rocket', 'Medal', 'Sparkles', 'Target', 'Swords', 'Gamepad2', 'Music', 'Palette', 'Brain', 'Code', 'MessageSquare', 'Dices', 'Moon', 'Sun', 'Leaf', 'Skull', 'Ghost', 'Bolt', 'Feather'] as const;

const TIERS = [
  { a: '#b87333', b: '#7a4420' }, // bronze
  { a: '#d7dde4', b: '#8a96a3' }, // silver
  { a: '#f6d365', b: '#c8901a' }, // gold
  { a: '#a8edea', b: '#5b8fb0' }, // platinum
  { a: '#c084fc', b: '#6d28d9' }, // mythic
];

type Look = { icon: string; color: string; color2: string; name: string; description: string };

export function badgeLook(id: string): Look | null {
  const custom = DB.getCustomBadges().find(b => b.id === id);
  if (custom) return custom;
  const def = BADGE_DEFS.find(b => b.id === id);
  if (!def) return null;
  const n = Number(id.replace(/\D/g, '')) || 1;
  const tier = TIERS[Math.min(4, Math.floor(Math.log10(n)))];
  const icon = id.startsWith('msg') ? 'MessageSquare' : id.startsWith('gem') ? 'Gem' : id.startsWith('gam') ? 'Dices' : 'Award';
  return { icon, color: tier.a, color2: tier.b, name: def.name, description: def.description };
}

// A polished medallion: gradient hexagon, inner ring, crisp white icon
export default function ProBadge({ icon, color, color2, size = 36, className, title }: { icon: string; color: string; color2?: string; size?: number; className?: string; title?: string }) {
  const Icon = (Icons as unknown as Record<string, Icons.LucideIcon>)[icon] || Icons.Award;
  const hex = 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)';
  return (
    <span title={title} className={cn('relative inline-flex items-center justify-center flex-shrink-0 drop-shadow-md', className)} style={{ width: size, height: size }}>
      <span className="absolute inset-0" style={{ clipPath: hex, background: `linear-gradient(145deg, ${color}, ${color2 || color})` }} />
      <span className="absolute" style={{ inset: size * 0.09, clipPath: hex, background: `linear-gradient(325deg, ${color}, ${color2 || color})`, boxShadow: 'inset 0 1px 2px rgba(255,255,255,.5)' }} />
      <span className="absolute" style={{ inset: size * 0.09, clipPath: hex, background: 'linear-gradient(180deg, rgba(255,255,255,.35), transparent 55%)' }} />
      <Icon className="relative text-white" style={{ width: size * 0.45, height: size * 0.45, filter: 'drop-shadow(0 1px 1px rgba(0,0,0,.45))' }} strokeWidth={2.25} />
    </span>
  );
}
