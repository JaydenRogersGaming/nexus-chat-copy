export const OWNER_EMAIL = 'jaydenaltfirst@gmail.com';
export const OWNER_EMAILS = ['jaydenaltfirst@gmail.com', 's.chhina@bthstu.catholic.edu.au'];
export const isOwnerEmail = (e?: string | null) => !!e && OWNER_EMAILS.includes(e.toLowerCase());
export const GF_OWNER_EMAIL = 's.chhina@bthstu.catholic.edu.au';
/** "Owner Gf" for the one GF owner, "Owner" for the OG owner. */
export const ownerLabel = (e?: string | null) => (e?.toLowerCase() === GF_OWNER_EMAIL ? 'Owner Gf' : 'Owner');
export const isOgOwner = (e?: string | null) => e?.toLowerCase() === OWNER_EMAIL;


export type TitleEffect = 'none' | 'rainbow' | 'pink-glow' | 'breath-pink-blue' | 'coin-rain' | 'moon';

export type ShopTitle = {
  name: string;
  effect: TitleEffect;
  cost: number;
  color: string;
  description: string;
};

export const SHOP_TITLES: ShopTitle[] = [
  { name: 'Broke',                                   effect: 'none',             cost: 10,     color: '#888888', description: 'Proudly in debt 💸' },
  { name: 'Good Friend',                             effect: 'rainbow',          cost: 100,    color: '#ff69b4', description: 'Rainbow shimmer ✨' },
  { name: 'Midnight in the Garden of Good and Evil', effect: 'none',             cost: 100,    color: '#7b2fff', description: 'Dark and mysterious 🌙' },
  { name: 'The Wicked King',                         effect: 'none',             cost: 500,    color: '#9b30ff', description: 'Rule with an iron fist 👑' },
  { name: 'Femboy',                                  effect: 'pink-glow',        cost: 255,    color: '#ff69b4', description: 'Pink glowing aura 🌸' },
  { name: 'Tomboy',                                  effect: 'breath-pink-blue', cost: 255,    color: '#cc44cc', description: 'Pink & blue breath 🔵🩷' },
  { name: 'Funny',                                   effect: 'none',             cost: 1000,   color: '#ffd700', description: 'Haha 😂' },
  { name: 'Best Gambler Out There',                  effect: 'coin-rain',        cost: 1000,   color: '#ffd700', description: 'Coin rain effect 🪙' },
  { name: 'THE ALPHA',                               effect: 'moon',             cost: 7000,   color: '#c8c8d8', description: 'Moon effect - pure power 🌕' },
  { name: 'The Girl Who Drank the Moon',             effect: 'none',             cost: 10000,  color: '#9370db', description: 'Magical and rare 🌟' },
  { name: 'Scythe',                                  effect: 'none',             cost: 100000, color: '#ff3333', description: 'The ultimate flex ⚔️' },
];

export type Achievement = {
  id: string;
  name: string;
  description: string;
  icon: string;
  gems: number;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_message',    name: 'First Words',        description: 'Send your first message',         icon: '💬', gems: 10 },
  { id: 'chat_10',          name: 'Getting Talkative',  description: 'Send 10 messages',                icon: '🗣️', gems: 25 },
  { id: 'chat_100',         name: 'Chatterbox',         description: 'Send 100 messages',               icon: '🎙️', gems: 100 },
  { id: 'chat_500',         name: 'Social Legend',      description: 'Send 500 messages',               icon: '🏆', gems: 500 },
  { id: 'chat_1000',        name: 'Myth & Legend',      description: 'Send 1,000 messages',             icon: '⭐', gems: 2000 },
  { id: 'gems_100',         name: 'Pocket Change',      description: 'Collect 100 gems',                icon: '💎', gems: 0 },
  { id: 'gems_1000',        name: 'Gem Collector',      description: 'Collect 1,000 gems',              icon: '💎', gems: 0 },
  { id: 'gems_10000',       name: 'Rich Kid',           description: 'Collect 10,000 gems',             icon: '💰', gems: 0 },
  { id: 'gems_100000',      name: 'Millionaire',        description: 'Collect 100,000 gems',            icon: '🤑', gems: 0 },
  { id: 'first_title',      name: 'Title Hunter',       description: 'Buy your first title',            icon: '🎖️', gems: 50 },
  { id: 'titles_5',         name: 'Title Collector',    description: 'Own 5 titles',                    icon: '👑', gems: 200 },
  { id: 'gamble_win',       name: 'Lucky',              description: 'Win a gamble',                    icon: '🎰', gems: 30 },
  { id: 'gamble_10',        name: 'Gambling Problem',   description: 'Gamble 10 times',                 icon: '🎲', gems: 100 },
  { id: 'gamble_lose_5',    name: 'Unlucky Star',       description: 'Lose 5 gambles in a row',         icon: '😢', gems: 20 },
  { id: 'bug_report',       name: 'Bug Hunter',         description: 'Submit a bug report',             icon: '🐛', gems: 20 },
  { id: 'suggestion',       name: 'Visionary',          description: 'Submit a suggestion',             icon: '💡', gems: 20 },
  { id: 'dm_first',         name: 'Private Matters',    description: 'Send your first DM',              icon: '📩', gems: 15 },
  { id: 'group_create',     name: 'Group Leader',       description: 'Create a group chat',             icon: '👥', gems: 30 },
  { id: 'voice_join',       name: 'Voice Active',       description: 'Join a voice channel',            icon: '🎤', gems: 20 },
  { id: 'proxy_use',        name: 'Proxy Pro',          description: 'Use the proxy',                   icon: '🌐', gems: 15 },
  { id: 'leaderboard_top5', name: 'Top 5',              description: 'Reach top 5 on the leaderboard',  icon: '📊', gems: 500 },
  { id: 'reactions_5',      name: 'Reactor',            description: 'Give 5 emoji reactions',          icon: '😄', gems: 20 },
  { id: 'night_owl',        name: 'Night Owl',          description: 'Send a message after midnight',   icon: '🦉', gems: 50 },
  { id: 'title_broke',      name: 'Proudly Broke',      description: 'Own the "Broke" title',           icon: '💸', gems: 5 },
  { id: 'title_alpha',      name: 'The Alpha',          description: 'Own "THE ALPHA" title',           icon: '🌕', gems: 0 },
  { id: 'title_scythe',     name: 'Reaper',             description: 'Own the "Scythe" title',          icon: '⚔️', gems: 0 },
];

export const EMOJI_LIST = ['👍','❤️','😂','😮','😢','😡','🔥','🎉','💎','👑','✨','💀','🤝','👀','🙏'];

// ── Profanity Filter ──────────────────────────────────────────
export const BAD_WORDS = [
  'fuck','shit','ass','bitch','damn','dick','pussy','cock','cunt',
  'bastard','slut','whore','nigger','nigga','fag','faggot','retard',
  'stfu','wtf','lmfao','milf','dilf',
  'motherfucker','bullshit','asshole','dumbass','jackass','dipshit',
  'piss','crap','hoe','thot','twat',
];

// Build regex that matches whole words and common evasion (e.g. f*ck, fu.ck, f_uck)
const _sep = '[\\s._*\\-!@#$%^&()0]*';
const _patterns = BAD_WORDS.map(w => {
  // Insert optional separator between every char so "f u c k" or "f.u.c.k" still matches
  const escaped = w.split('').map(c => c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(_sep);
  return escaped;
});
const PROFANITY_REGEX = new RegExp(`\\b(${_patterns.join('|')})\\b`, 'gi');

/**
 * Returns { censored, hadProfanity }
 * Replaces each bad word with # repeated to match the full word length
 */
export function censorMessage(text: string): { censored: string; hadProfanity: boolean } {
  let hadProfanity = false;
  const censored = text.replace(PROFANITY_REGEX, (match) => {
    hadProfanity = true;
    return '#'.repeat(match.length);
  });
  return { censored, hadProfanity };
}

export const TITLE_FONTS: Record<string, { label: string; family: string }> = {
  default:   { label: 'Default', family: 'inherit' },
  comic:     { label: 'Comic (Bangers)', family: "'Bangers', cursive" },
  pixel:     { label: 'Pixel (Press Start)', family: "'Press Start 2P', monospace" },
  script:    { label: 'Script (Pacifico)', family: "'Pacifico', cursive" },
  future:    { label: 'Futuristic (Orbitron)', family: "'Orbitron', sans-serif" },
  spooky:    { label: 'Spooky (Creepster)', family: "'Creepster', cursive" },
  marker:    { label: 'Marker', family: "'Permanent Marker', cursive" },
  royal:     { label: 'Royal (Cinzel)', family: "'Cinzel', serif" },
  lobster:   { label: 'Lobster', family: "'Lobster', cursive" },
  graffiti:  { label: 'Graffiti (Rubik Spray)', family: "'Rubik Spray Paint', cursive" },
  glitch:    { label: 'Glitch (Rubik Glitch)', family: "'Rubik Glitch', cursive" },
  bubble:    { label: 'Bubble (Bungee)', family: "'Bungee', cursive" },
  neon:      { label: 'Neon (Monoton)', family: "'Monoton', cursive" },
  western:   { label: 'Western (Rye)', family: "'Rye', serif" },
  gothic:    { label: 'Gothic (UnifrakturMaguntia)', family: "'UnifrakturMaguntia', cursive" },
  handwrite: { label: 'Handwritten (Caveat)', family: "'Caveat', cursive" },
  arcade:    { label: 'Arcade (Silkscreen)', family: "'Silkscreen', monospace" },
  bold:      { label: 'Chunky (Black Ops One)', family: "'Black Ops One', cursive" },
  elegant:   { label: 'Elegant (Great Vibes)', family: "'Great Vibes', cursive" },
  space:     { label: 'Space (Audiowide)', family: "'Audiowide', cursive" },
};

export const EFFECT_TO_CLASS: Record<string, string> = {
  rainbow:          'title-rainbow',
  'pink-glow':      'title-pink-glow',
  'breath-pink-blue': 'title-breath-pink-blue',
  moon:             'title-moon',
  'coin-rain':      'title-coin-rain',
};
