// Prank catalog. Every prank is harmless, lasts at most 30s, and can be closed.
export type PrankKind = 'flip' | 'shake' | 'blur' | 'invert' | 'rain' | 'popup' | 'fakeBar' | 'spin' | 'tiny' | 'color';
export type Prank = {
  id: string; name: string; emoji: string; mean: boolean;
  kind: PrankKind; text?: string; seconds: number;
};

const f = (id: string, name: string, emoji: string, kind: PrankKind, text?: string, seconds = 8): Prank =>
  ({ id, name, emoji, kind, text, seconds, mean: false });
const m = (id: string, name: string, emoji: string, kind: PrankKind, text?: string, seconds = 15): Prank =>
  ({ id, name, emoji, kind, text, seconds, mean: true });

export const FRIENDLY: Prank[] = [
  f('confetti', 'Confetti Bomb', '🎉', 'rain'), f('hearts', 'Heart Storm', '💖', 'rain'),
  f('ducks', 'Duck Invasion', '🦆', 'rain'), f('tacos', "It's Raining Tacos", '🌮', 'rain'),
  f('cats', 'Cat Parade', '🐱', 'rain'), f('pizza', 'Pizza Party', '🍕', 'rain'),
  f('bananas', 'Banana Peels', '🍌', 'rain'), f('stars', 'Starfall', '⭐', 'rain'),
  f('bubbles', 'Bubble Bath', '🫧', 'rain'), f('frogs', 'Frog Rain', '🐸', 'rain'),
  f('cookies', 'Cookie Crumbs', '🍪', 'rain'), f('balloons', 'Balloon Pop', '🎈', 'rain'),
  f('snow', 'Surprise Snow', '❄️', 'rain'), f('ghosts', 'Friendly Ghosts', '👻', 'rain'),
  f('pumpkins', 'Pumpkin Patch', '🎃', 'rain'), f('rainbows', 'Rainbow Burst', '🌈', 'rain'),
  f('poop', 'Silly Poops', '💩', 'rain'), f('unicorns', 'Unicorn Stampede', '🦄', 'rain'),
  f('donuts', 'Donut Drop', '🍩', 'rain'), f('dinos', 'Dino Walk', '🦖', 'rain'),
  f('wiggle', 'Wiggle Screen', '〰️', 'shake'), f('dizzy', 'Dizzy Spin', '😵‍💫', 'spin'),
  f('upside', 'Upside Down', '🙃', 'flip', undefined, 6), f('tinyworld', 'Tiny World', '🔬', 'tiny'),
  f('disco', 'Disco Mode', '🪩', 'color'), f('negative', 'Photo Negative', '🎞️', 'invert', undefined, 6),
  f('foggy', 'Foggy Glasses', '🌫️', 'blur', undefined, 5),
  f('hug', 'Virtual Hug', '🤗', 'popup', 'You just got a big virtual hug! 🤗'),
  f('compliment', 'Surprise Compliment', '🌟', 'popup', "You're awesome and everyone knows it! 🌟"),
  f('dad', 'Dad Joke', '👨', 'popup', "Why don't skeletons fight? They don't have the guts. 💀"),
  f('fortune', 'Fortune Cookie', '🥠', 'popup', 'Your fortune: great gems are coming your way. 🥠'),
  f('cow', 'Moo!', '🐮', 'popup', 'MOOOOOO 🐮 (a cow has entered the chat)'),
  f('potato', 'You Are a Potato', '🥔', 'popup', 'Breaking news: you have been turned into a potato. 🥔'),
  f('rickroll', 'Never Gonna…', '🕺', 'popup', 'Never gonna give you up, never gonna let you down 🎶'),
  f('alien', 'Alien Contact', '👽', 'popup', 'Greetings earthling. We come in peace. 👽'),
  f('pirate', 'Pirate Speak', '🏴‍☠️', 'popup', 'Arrr! Ye be pranked, matey! 🏴‍☠️'),
  f('birthday', 'Fake Birthday', '🎂', 'popup', "Happy birthday!!! (it's not your birthday) 🎂"),
  f('sneeze', 'Achoo!', '🤧', 'popup', 'ACHOO! Sorry, someone sneezed on your screen. 🤧'),
  f('bee', 'Busy Bee', '🐝', 'popup', 'Bzzzz… a bee is now living in your screen. 🐝'),
  f('high5', 'High Five', '🙌', 'popup', 'Up top! ✋ You got a surprise high five!'),
  f('dance', 'Dance Party', '💃', 'popup', 'Drop everything — it is dance time! 💃🕺'),
  f('magic', 'Abracadabra', '🪄', 'popup', 'Poof! Your screen has been magically pranked ✨'),
  f('sock', 'Missing Sock', '🧦', 'popup', 'We found your missing sock. It was in the chat. 🧦'),
  f('robot', 'Robot Mode', '🤖', 'popup', 'BEEP BOOP. YOU ARE NOW A ROBOT. 🤖'),
  f('nap', 'Nap Time', '😴', 'popup', 'Shh… the screen is taking a quick nap 😴'),
];

export const MEAN: Prank[] = [
  m('fakeban', 'Fake Ban', '🔨', 'popup', '🚫 You have been BANNED from Nexus… just kidding 😜'),
  m('deletegems', 'Deleting Your Gems', '💸', 'fakeBar', 'Deleting all your gems…'),
  m('hacked', "You've Been Hacked", '💻', 'popup', '⚠️ SYSTEM HACKED ⚠️ …by a prankster. Your stuff is fine.'),
  m('virus', 'Fake Virus Scan', '🦠', 'fakeBar', 'Scanning for 9,999 viruses…'),
  m('fullflip', 'Flip It All', '🔄', 'flip'), m('earthquake', 'Earthquake', '🌋', 'shake'),
  m('blind', 'Blurry Vision', '👓', 'blur'), m('inverted', 'Evil Colors', '😈', 'invert'),
  m('tornado', 'Tornado Spin', '🌪️', 'spin'), m('shrink', 'Shrink Ray', '🤏', 'tiny'),
  m('strobe', 'Rave Mode', '🎆', 'color', undefined, 10),
  m('spiders', 'Spider Swarm', '🕷️', 'rain'), m('rats', 'Rat Rush', '🐀', 'rain'),
  m('bugs', 'Bug Invasion', '🪳', 'rain'), m('worms', 'Worm Rain', '🪱', 'rain'),
  m('farts', 'Fart Cloud', '💨', 'rain'), m('clowns', 'Clown Car', '🤡', 'rain'),
  m('reset', 'Account Reset', '♻️', 'fakeBar', 'Resetting your account to level 1…'),
  m('deleteitems', 'Deleting Inventory', '🗑️', 'fakeBar', 'Throwing away your items…'),
  m('demoted', 'Demoted', '📉', 'popup', 'Your role has been changed to: Potato 🥔 (not really)'),
  m('lowbattery', 'Fake Low Battery', '🪫', 'popup', '🔋 Battery 1% — device shutting down… (not really)'),
  m('lag', 'Mega Lag', '🐢', 'blur'), m('error', 'Error 404', '❌', 'popup', 'ERROR 404: Your brain was not found 🧠❓'),
  m('slime', 'Slimed', '🟢', 'rain'), m('jail', 'Gem Jail', '🚔', 'popup', "🚔 You're in gem jail for 15 seconds. Behave!"),
];

export const ALL_PRANKS = [...FRIENDLY, ...MEAN];
/** Regular users get every friendly prank plus these 2 mean ones. */
export const FREE_MEAN_IDS = ['fakeban', 'farts'];
export const findPrank = (id: string) => ALL_PRANKS.find(p => p.id === id);
/** VIPs get 5 mean pranks. */
export const VIP_MEAN_IDS = [...FREE_MEAN_IDS, 'hacked', 'spiders', 'fullflip'];
export function pranksFor(isOwner: boolean, vip = false): Prank[] {
  if (isOwner) return ALL_PRANKS;
  const ids = vip ? VIP_MEAN_IDS : FREE_MEAN_IDS;
  return [...FRIENDLY, ...MEAN.filter(p => ids.includes(p.id))];
}
export const PRANK_EVENT = 'nexus-prank';
export function prankOptOut(email: string) { return localStorage.getItem(`nexus_prank_shield_${email}`) === '1'; }
export function setPrankOptOut(email: string, on: boolean) { localStorage.setItem(`nexus_prank_shield_${email}`, on ? '1' : '0'); }
