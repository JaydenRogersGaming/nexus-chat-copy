import type { BgTheme, TypingStyle } from './cosmetics';

export type Variant = { name: string; colors: [string, string, string]; particles: string[]; tagline: string; badgeEmoji: string; typing: string };
export type Holiday = { key: string; name: string; emoji: string; date: (y: number) => Date; decor: 'spooky' | 'snow' | 'hearts' | 'fireworks' | 'confetti' | 'leaves' | 'clover' | 'eggs'; variants: Variant[] };

const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
const nthWeekday = (y: number, m: number, wd: number, n: number) => { const f = d(y, m, 1); return d(y, m, 1 + ((wd - f.getDay() + 7) % 7) + (n - 1) * 7); };
function easter(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, dd = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - dd - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  return d(y, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1);
}

export const HOLIDAYS: Holiday[] = [
  { key: 'newyear', name: "New Year's", emoji: '🎆', date: y => d(y, 1, 1), decor: 'fireworks', variants: [
    { name: 'Midnight Gold', colors: ['#0a0a1a', '#3b2a05', '#facc15'], particles: ['🎆', '✨', '🥂'], tagline: 'Out with the old!', badgeEmoji: '🥂', typing: 'is counting down… 3, 2, 1 🎆' },
    { name: 'Neon Countdown', colors: ['#0b0217', '#4c1d95', '#22d3ee'], particles: ['🎇', '🎉', '⭐'], tagline: 'New year, new vibes', badgeEmoji: '🎇', typing: 'is making a resolution ✨' },
    { name: 'Silver Sparkle', colors: ['#020617', '#334155', '#e2e8f0'], particles: ['✨', '🎊', '🪩'], tagline: 'Sparkle into the new year', badgeEmoji: '🪩', typing: 'is popping confetti 🎊' },
  ] },
  { key: 'valentines', name: "Valentine's Day", emoji: '💘', date: y => d(y, 2, 14), decor: 'hearts', variants: [
    { name: 'Rose Petals', colors: ['#2a0510', '#9f1239', '#fb7185'], particles: ['💖', '🌹', '💕'], tagline: 'Love is in the chat', badgeEmoji: '💘', typing: 'is writing a love letter 💌' },
    { name: 'Candy Hearts', colors: ['#3b0a2a', '#db2777', '#fbcfe8'], particles: ['💗', '🍬', '💝'], tagline: 'Be mine?', badgeEmoji: '💝', typing: 'is blushing… 😳💗' },
    { name: 'Cupid Sky', colors: ['#1e1033', '#be185d', '#f9a8d4'], particles: ['💘', '🏹', '💞'], tagline: 'Cupid is online', badgeEmoji: '🏹', typing: 'got hit by cupid 🏹' },
  ] },
  { key: 'stpatricks', name: "St. Patrick's Day", emoji: '☘️', date: y => d(y, 3, 17), decor: 'clover', variants: [
    { name: 'Lucky Meadow', colors: ['#03140a', '#166534', '#4ade80'], particles: ['☘️', '🍀', '🪙'], tagline: 'Feeling lucky?', badgeEmoji: '🍀', typing: 'found a four-leaf clover 🍀' },
    { name: 'Pot of Gold', colors: ['#0a1a05', '#3f6212', '#facc15'], particles: ['🪙', '🌈', '☘️'], tagline: 'Chase the rainbow', badgeEmoji: '🪙', typing: 'is chasing a rainbow 🌈' },
  ] },
  { key: 'easter', name: 'Easter', emoji: '🐣', date: easter, decor: 'eggs', variants: [
    { name: 'Pastel Garden', colors: ['#1a1030', '#7c3aed', '#fde68a'], particles: ['🥚', '🐣', '🌷'], tagline: 'Egg hunt season', badgeEmoji: '🐣', typing: 'is hunting for eggs 🥚' },
    { name: 'Bunny Hop', colors: ['#0f1a2a', '#0e7490', '#f9a8d4'], particles: ['🐰', '🌸', '🥕'], tagline: 'Hop hop hooray', badgeEmoji: '🐰', typing: 'is hopping around 🐰' },
  ] },
  { key: 'july4', name: 'Fourth of July', emoji: '🎇', date: y => d(y, 7, 4), decor: 'fireworks', variants: [
    { name: 'Star Spangled', colors: ['#0a1030', '#1e3a8a', '#dc2626'], particles: ['🎆', '⭐', '🎇'], tagline: 'Light up the sky', badgeEmoji: '🎆', typing: 'is lighting fireworks 🎇' },
    { name: 'Summer Blast', colors: ['#020617', '#7f1d1d', '#60a5fa'], particles: ['🎇', '🌭', '✨'], tagline: 'Boom boom!', badgeEmoji: '🌭', typing: 'is at the cookout 🌭' },
  ] },
  { key: 'halloween', name: 'Halloween', emoji: '🎃', date: y => d(y, 10, 31), decor: 'spooky', variants: [
    { name: 'Haunted Pumpkin', colors: ['#0a0503', '#431407', '#f97316'], particles: ['🎃', '🦇', '🕷️'], tagline: 'Something spooky is in the chat…', badgeEmoji: '🎃', typing: 'is brewing a potion 🧪' },
    { name: 'Witching Hour', colors: ['#07020f', '#3b0764', '#84cc16'], particles: ['🦇', '👻', '🕸️'], tagline: 'The witching hour is here', badgeEmoji: '🧙', typing: 'is casting a hex 🔮' },
    { name: 'Graveyard Fog', colors: ['#030712', '#1f2937', '#a3e635'], particles: ['👻', '💀', '🕯️'], tagline: 'Boo! 👻', badgeEmoji: '💀', typing: 'is rising from the grave 💀' },
  ] },
  { key: 'thanksgiving', name: 'Thanksgiving', emoji: '🦃', date: y => nthWeekday(y, 11, 4, 4), decor: 'leaves', variants: [
    { name: 'Harvest Feast', colors: ['#1a0c03', '#7c2d12', '#f59e0b'], particles: ['🍂', '🍁', '🦃'], tagline: 'Thankful for you', badgeEmoji: '🦃', typing: 'is saying what they’re thankful for 🍂' },
    { name: 'Autumn Glow', colors: ['#120a02', '#92400e', '#fb923c'], particles: ['🍁', '🥧', '🌽'], tagline: 'Pass the pie', badgeEmoji: '🥧', typing: 'is grabbing seconds 🥧' },
  ] },
  { key: 'christmas', name: 'Christmas', emoji: '🎄', date: y => d(y, 12, 25), decor: 'snow', variants: [
    { name: 'Winter Wonderland', colors: ['#020c1b', '#1e3a8a', '#e0f2fe'], particles: ['❄️', '⛄', '✨'], tagline: 'Let it snow!', badgeEmoji: '⛄', typing: 'is building a snowman ⛄' },
    { name: 'Candy Cane', colors: ['#1a0303', '#991b1b', '#16a34a'], particles: ['🎁', '🎄', '❄️'], tagline: 'Ho ho ho!', badgeEmoji: '🎅', typing: 'is wrapping presents 🎁' },
    { name: 'Northern Lights', colors: ['#02061a', '#064e3b', '#a78bfa'], particles: ['❄️', '🌟', '🦌'], tagline: 'Magic in the air', badgeEmoji: '🦌', typing: 'is riding with reindeer 🦌' },
  ] },
];

export type Override = { holidayKey: string; earlyStart: string | null; forceOn: boolean; forceOff: boolean; shopDrop?: number };
export type ActiveEvent = { holiday: Holiday; year: number; variant: Variant; start: Date; end: Date; day: Date };

const DAY = 864e5;
export const variantFor = (h: Holiday, year: number) => h.variants[year % h.variants.length];

/** Normal window: 7 days before through 7 days after the holiday. */
export function windowFor(h: Holiday, year: number, o?: Override) {
  const day = h.date(year);
  const start = o?.earlyStart ? new Date(o.earlyStart + 'T00:00:00') : new Date(day.getTime() - 7 * DAY);
  return { day, start, end: new Date(day.getTime() + 8 * DAY) };
}

export function getActiveEvent(overrides: Override[], now = new Date()): ActiveEvent | null {
  const forced = overrides.find(o => o.forceOn);
  for (const year of [now.getFullYear(), now.getFullYear() + 1, now.getFullYear() - 1]) {
    for (const h of HOLIDAYS) {
      const o = overrides.find(x => x.holidayKey === h.key);
      if (o?.forceOff) continue;
      const w = windowFor(h, year, o);
      const isForced = forced?.holidayKey === h.key && year === now.getFullYear();
      if (isForced || (now >= w.start && now < w.end)) return { holiday: h, year, variant: variantFor(h, year), ...w };
    }
  }
  return null;
}

// ── Limited items: unique ids per holiday + year, so each year's set is gone forever after ──
export type LimitedBadge = { id: string; name: string; emoji: string; color: string; cost: number };
const THEME_NOUNS = ['Skyline', 'Realm', 'Dreamscape', 'Vortex', 'Horizon', 'Sanctuary', 'Nebula', 'Kingdom', 'Mirage', 'Citadel', 'Abyss', 'Paradise'];
const TYPING_NOUNS = ['Whisper', 'Echo', 'Pulse', 'Spark', 'Trail', 'Aura', 'Rhythm', 'Signal'];
const BADGE_NOUNS = ['Crest', 'Sigil', 'Emblem', 'Medal', 'Crown', 'Relic', 'Seal', 'Star'];
const DROP_NAMES = ['', 'Velvet', 'Neon', 'Glow', 'Shadow', 'Prism', 'Frost', 'Blaze', 'Cosmic', 'Retro', 'Royal', 'Aurora', 'Galaxy', 'Crystal', 'Phantom', 'Solar'];
const DROP_TYPING = ['', 'is stirring up magic', 'is glowing up', 'is shining bright', 'is lurking in the shadows', 'is splitting light', 'is freezing the chat', 'is on fire', 'is out of this world', 'is going retro', 'is making a royal entrance', 'is dancing in the aurora', 'is orbiting the chat', 'is crystallizing', 'is haunting the chat', 'is blazing like the sun'];
const BONUS_EMOJI = ['💎', '👑', '🌟', '🔮', '⚡', '🌈', '🪐', '🦄', '🐉', '🌌', '🏆', '🔥'];

const LIMITED_TYPING_FX: Record<Holiday['decor'], string> = { spooky: 'lt-flicker', snow: 'lt-shimmer', hearts: 'lt-beat', fireworks: 'lt-sparkle', confetti: 'lt-sparkle', leaves: 'lt-sway', clover: 'lt-shimmer', eggs: 'lt-hop' };
const FX_POOL = ['lt-flicker', 'lt-shimmer', 'lt-beat', 'lt-sparkle', 'lt-sway', 'lt-hop'];

/** Each refresh climbs a rarity tier, so newer drops are fancier (and pricier). */
export const TIERS = [
  { name: 'Rare', mult: 1, glow: '' },
  { name: 'Epic', mult: 1.5, glow: 'lt-glow' },
  { name: 'Legendary', mult: 2.2, glow: 'lt-glow' },
  { name: 'Mythic', mult: 3, glow: 'lt-mythic' },
] as const;
export const tierFor = (drop: number) => TIERS[drop === 0 ? 0 : drop <= 2 ? 1 : drop <= 5 ? 2 : 3];

function seeded(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return () => { h = Math.imul(h ^ (h >>> 15), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
}
/** Rotate a hex color's hue so every year gets its own palette. */
function shiftHue(hex: string, deg: number, satBoost = 0) {
  const n = parseInt(hex.slice(1), 16); let r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let hh = 0, ss = 0;
  if (mx !== mn) { const d = mx - mn; ss = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); hh = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; hh *= 60; }
  hh = (hh + deg + 360) % 360; ss = Math.min(1, ss + satBoost);
  const k = (m: number) => (m + hh / 30) % 12, a = ss * Math.min(l, 1 - l);
  const f = (m: number) => Math.round((l - a * Math.max(-1, Math.min(k(m) - 3, 9 - k(m), 1))) * 255).toString(16).padStart(2, '0');
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** drop = how many times the owner refreshed this event's limited shop (0 = original items). */
export function limitedItems(e: Pick<ActiveEvent, 'holiday' | 'year' | 'variant'>, drop = 0) {
  const { holiday: h, year, variant: v } = e;
  const rnd = seeded(`${h.key}-${year}-${drop}`);
  const tier = tierFor(drop);
  // Year shifts the palette (same holiday looks different every year); drops push it further + more saturated
  const hue = Math.round((year * 47) % 60) - 30 + drop * 37 + Math.round(rnd() * 20);
  const [c1, c2, c3] = v.colors.map((c, i) => shiftHue(c, i === 0 ? hue / 3 : hue, drop * 0.06));
  const sfx = drop ? `-d${drop}` : '';
  const pick = <T,>(arr: readonly T[], skip = 0) => arr[(Math.floor(rnd() * arr.length) + skip) % arr.length];
  const adj = drop ? DROP_NAMES[1 + ((drop + year) % (DROP_NAMES.length - 1))] : '';
  const tag = adj ? ` ${adj}` : '';
  const yearTyping = DROP_TYPING[1 + ((drop * 3 + year) % (DROP_TYPING.length - 1))];
  const ang = Math.round(rnd() * 360);
  const patterns = [
    `radial-gradient(circle at 80% 10%, ${c3}55 0%, transparent 45%), linear-gradient(${ang}deg, ${c1} 0%, ${c2} 60%, ${c1} 100%)`,
    `radial-gradient(ellipse at 20% 0%, ${c3}66 0%, transparent 50%), radial-gradient(ellipse at 90% 100%, ${c2}aa 0%, transparent 55%), ${c1}`,
    `conic-gradient(from ${ang}deg at 50% 120%, ${c1}, ${c2}, ${c3}55, ${c2}, ${c1})`,
    `radial-gradient(${c3}88 1px, transparent 1.5px) 0 0/22px 22px, radial-gradient(${c3}44 1px, transparent 1.5px) 11px 11px/22px 22px, linear-gradient(${ang}deg, ${c1}, ${c2})`,
    `repeating-linear-gradient(${ang}deg, ${c3}14 0 12px, transparent 12px 28px), linear-gradient(${ang + 90}deg, ${c1}, ${c2} 70%, ${c3}66)`,
    `radial-gradient(circle at 30% 30%, ${c3}77, transparent 35%), radial-gradient(circle at 70% 60%, ${c2}cc, transparent 45%), radial-gradient(circle at 50% 100%, ${c3}55, transparent 50%), ${c1}`,
  ];
  // Higher tiers unlock the fancier patterns
  const pIdx = drop === 0 ? (year % 2) : Math.min(patterns.length - 1, 1 + Math.floor(rnd() * Math.min(patterns.length - 1, 2 + drop)));
  const cost = (base: number) => Math.round(base * tier.mult / 50) * 50;
  const theme: BgTheme = { id: `ev-${h.key}-${year}${sfx}`, name: `${h.emoji} ${v.name}${tag} ${pick(THEME_NOUNS, year)} ${year} · ${tier.name}`, cost: cost(1500), css: patterns[pIdx] };
  const fx = drop === 0 ? LIMITED_TYPING_FX[h.decor] : FX_POOL[Math.floor(rnd() * FX_POOL.length)];
  const particle = drop >= 3 ? BONUS_EMOJI[Math.floor(rnd() * BONUS_EMOJI.length)] : v.particles[(drop + year) % v.particles.length];
  const typing: TypingStyle = { id: `evt-${h.key}-${year}${sfx}`, name: `${v.badgeEmoji} ${h.name}${tag} ${pick(TYPING_NOUNS, year)} ${year} · ${tier.name}`, cost: cost(800), text: `${drop ? yearTyping : v.typing} ${particle}${drop >= 6 ? particle : ''}`, className: `limited-typing ${fx} ${tier.glow}`.trim(), color: c3 };
  const emoji = drop >= 3 ? `${v.badgeEmoji}${BONUS_EMOJI[Math.floor(rnd() * BONUS_EMOJI.length)]}` : v.badgeEmoji;
  const badge: LimitedBadge = { id: `evb-${h.key}-${year}${sfx}`, name: `${h.name}${tag} ${pick(BADGE_NOUNS, year)} ${year}`, emoji, color: c3, cost: cost(1000) };
  return { theme, typing, badge, tier };
}

/** Every limited item that could ever exist (for rendering owned items after the event ends). */
function allYears() { const y = new Date().getFullYear(); return Array.from({ length: 6 }, (_, i) => y - 3 + i); }
const DROPS = Array.from({ length: 16 }, (_, i) => i);
export function allLimitedThemes(): BgTheme[] { return HOLIDAYS.flatMap(h => allYears().flatMap(y => DROPS.map(dr => limitedItems({ holiday: h, year: y, variant: variantFor(h, y) }, dr).theme))); }
export function allLimitedTyping(): TypingStyle[] { return HOLIDAYS.flatMap(h => allYears().flatMap(y => DROPS.map(dr => limitedItems({ holiday: h, year: y, variant: variantFor(h, y) }, dr).typing))); }
export function allLimitedBadges(): LimitedBadge[] { return HOLIDAYS.flatMap(h => allYears().flatMap(y => DROPS.map(dr => limitedItems({ holiday: h, year: y, variant: variantFor(h, y) }, dr).badge))); }
