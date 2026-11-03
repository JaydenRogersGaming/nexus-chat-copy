import { HOLIDAYS, variantFor } from './holidays';

// Every holiday + year gets an ORIGINAL song: its own seeded melody, chords,
// genre, instruments and mood. Nothing is reused from earlier years.
type Wave = 'square' | 'triangle' | 'sine' | 'saw';
type Style = { genre: string; mood: string; lead: Wave; pad: Wave; bpm: number; scale: number[]; drums: 'none' | 'soft' | 'four' | 'swing' | 'march'; swing: number; instruments: string };

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10], DORIAN = [0, 2, 3, 5, 7, 9, 10], PENTA = [0, 2, 4, 7, 9], BLUES = [0, 3, 5, 6, 7, 10];

const STYLES: Record<string, Style[]> = {
  halloween: [
    { genre: 'Jazzy swing', mood: 'playful', lead: 'triangle', pad: 'sine', bpm: 138, scale: BLUES, drums: 'swing', swing: .33, instruments: 'walking bass, brushed drums, muted lead' },
    { genre: 'Spooky synth-pop', mood: 'eerie', lead: 'saw', pad: 'square', bpm: 112, scale: MINOR, drums: 'four', swing: 0, instruments: 'analog saw lead, pulsing bass, drum machine' },
    { genre: 'Haunted music box', mood: 'creepy-sweet', lead: 'sine', pad: 'triangle', bpm: 92, scale: MINOR, drums: 'none', swing: 0, instruments: 'music box, low drone' },
    { genre: 'Monster chiptune', mood: 'mischievous', lead: 'square', pad: 'triangle', bpm: 156, scale: DORIAN, drums: 'four', swing: 0, instruments: '8-bit pulse, noise drums' },
  ],
  christmas: [
    { genre: 'Cozy jazz', mood: 'warm', lead: 'triangle', pad: 'sine', bpm: 120, scale: MAJOR, drums: 'swing', swing: .3, instruments: 'soft keys, upright bass, brushes' },
    { genre: 'Sleigh-bell pop', mood: 'joyful', lead: 'square', pad: 'triangle', bpm: 140, scale: MAJOR, drums: 'four', swing: 0, instruments: 'bells, bright synth, claps' },
    { genre: 'Snowfall lullaby', mood: 'peaceful', lead: 'sine', pad: 'sine', bpm: 84, scale: PENTA, drums: 'none', swing: 0, instruments: 'celesta, warm pad' },
    { genre: 'Retro synthwave', mood: 'nostalgic', lead: 'saw', pad: 'triangle', bpm: 108, scale: MAJOR, drums: 'four', swing: 0, instruments: 'saw lead, gated drums' },
  ],
};
const GENERIC: Style[] = [
  { genre: 'Bright pop', mood: 'celebratory', lead: 'square', pad: 'triangle', bpm: 128, scale: MAJOR, drums: 'four', swing: 0, instruments: 'synth lead, punchy drums' },
  { genre: 'Folk dance', mood: 'lively', lead: 'triangle', pad: 'sine', bpm: 144, scale: DORIAN, drums: 'march', swing: .2, instruments: 'fiddle-like lead, stomp drums' },
  { genre: 'Dreamy lo-fi', mood: 'mellow', lead: 'sine', pad: 'triangle', bpm: 88, scale: PENTA, drums: 'soft', swing: .25, instruments: 'soft keys, dusty beat' },
  { genre: 'Marching band', mood: 'proud', lead: 'saw', pad: 'square', bpm: 116, scale: MAJOR, drums: 'march', swing: 0, instruments: 'brass-like lead, snare' },
  { genre: 'Chiptune party', mood: 'hyper', lead: 'square', pad: 'square', bpm: 160, scale: MAJOR, drums: 'four', swing: 0, instruments: '8-bit pulse, noise drums' },
];

// Lyric building blocks per holiday — combined per year so each chorus is new.
const WORDS: Record<string, [string[], string[]]> = {
  halloween: [['porch lights flicker', 'candy in a pillowcase', 'masks we made from cardboard', 'the moon is wearing orange'], ['knock knock, who\'s there tonight', 'trade a scare for something sweet', 'every street becomes a story', 'we glow until the morning']],
  christmas: [['cocoa on the windowsill', 'paper torn on purpose', 'grandma\'s cookie tin', 'boots lined up by the door'], ['stay a little longer here', 'light another window', 'the whole house hums together', 'we wrap the year in ribbon']],
  newyear: [['countdown on the rooftop', 'last year\'s photos', 'confetti in our sleeves', 'a fresh blank page'], ['ten, nine, hold my hand', 'we start again at midnight', 'make the first song loud', 'here\'s to what we\'ll find']],
  july4: [['picnic blankets', 'sparklers spelling names', 'lemonade and thunder', 'the whole town on the hill'], ['paint the night in red and blue', 'boom, the sky is singing', 'summer\'s at its brightest', 'we watch it light together']],
  valentines: [['handwritten notes', 'two straws one milkshake', 'a pocket full of hearts', 'your laugh across the room'], ['say it out loud this time', 'you\'re my favorite hello', 'stay close, the night is soft', 'one heart, two names']],
  stpatricks: [['clover in the sidewalk', 'fiddles in the pub', 'green on every sleeve', 'a lucky penny found'], ['spin around and stomp along', 'luck is who you dance with', 'raise it up for March', 'the rainbow ends right here']],
  thanksgiving: [['extra chairs at the table', 'pie cooling on the stove', 'stories passed with gravy', 'leaves against the glass'], ['thank you for the little things', 'save a seat for everyone', 'full plates, fuller hearts', 'we gather and we stay']],
  easter: [['baskets in the grass', 'painted eggs in rows', 'tulips waking up', 'a sunrise after rain'], ['hop along, the spring is here', 'find the hidden colors', 'everything begins again', 'bloom, bloom, sing it out']],
};

function rng(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

function styleFor(key: string, year: number): Style { const list = STYLES[key] || GENERIC; return list[(year + hash(key)) % list.length]; }

export function songLyrics(key: string, year: number): string[] {
  const [a, b] = WORDS[key] || [['lights across the city', 'friends around the fire', 'the calendar turns', 'a song we all know'], ['sing it once together', 'this day is ours', 'louder now, all in', 'see you here next year']];
  const r = rng(hash(key + year));
  const pick = (arr: string[]) => arr[Math.floor(r() * arr.length)];
  const hook = pick(b);
  return [`${pick(a)}, ${pick(a)}`, hook, `${pick(a)}, ${pick(b)}`, `${hook} — ${year}!`];
}

export type HolidaySong = { id: string; name: string; url: string; holidayKey: string; year: number; cost: number; genre?: string; mood?: string; instruments?: string; lyrics?: string[] };
export const SONG_COST = 600;

export function holidaySong(holidayKey: string, year: number): HolidaySong {
  const h = HOLIDAYS.find(x => x.key === holidayKey)!;
  const s = styleFor(h.key, year);
  return { id: `evs-${h.key}-${year}`, name: `${h.emoji} ${variantFor(h, year).name} — ${s.genre} ${year}`, url: `synth:${h.key}:${year}`, holidayKey: h.key, year, cost: SONG_COST, genre: s.genre, mood: s.mood, instruments: s.instruments, lyrics: songLyrics(h.key, year) };
}
export function allHolidaySongs(): HolidaySong[] {
  const y = new Date().getFullYear();
  return HOLIDAYS.flatMap(h => Array.from({ length: 6 }, (_, i) => holidaySong(h.key, y - 3 + i)));
}

const cache = new Map<string, string>();
const osc = (w: Wave, p: number) => w === 'sine' ? Math.sin(2 * Math.PI * p) : w === 'square' ? (p % 1 < .5 ? 1 : -1) * .5 : w === 'saw' ? ((p % 1) * 2 - 1) * .5 : 1 - 4 * Math.abs((p % 1) - .5);
const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);

/** Composes the original song for "synth:holiday:year" and returns a playable blob URL. */
export function resolveSongUrl(url: string): string {
  if (!url.startsWith('synth:')) return url;
  if (cache.has(url)) return cache.get(url)!;
  const [, key, yr] = url.split(':');
  const year = Number(yr), s = styleFor(key, year), r = rng(hash(url));
  const SR = 22050, beat = 60 / s.bpm, bars = 16, steps = bars * 8; // 8th notes
  const root = 55 + Math.floor(r() * 7);
  const deg = (d: number) => { const n = s.scale.length; return root + s.scale[((d % n) + n) % n] + 12 * Math.floor(d / n); };
  const progs = [[0, 5, 3, 4], [0, 3, 4, 0], [5, 3, 0, 4], [0, 4, 5, 3]];
  const prog = progs[Math.floor(r() * progs.length)];
  // Verse motif + a distinct, repeated chorus hook (bars 9-16).
  const motif = (len: number) => { const m: (number | null)[] = []; let d = 2 + Math.floor(r() * 3); for (let i = 0; i < len; i++) { if (r() < .18) { m.push(null); continue; } d += [-2, -1, 0, 1, 1, 2][Math.floor(r() * 6)]; d = Math.max(-1, Math.min(9, d)); m.push(d); } return m; };
  const verse = motif(16), hook = motif(16);
  const melody = [...verse, ...verse.map(n => n === null ? null : n + 1), ...hook, ...hook.slice(0, 14), 0, 0];

  const total = Math.ceil(steps * beat / 2 * SR) + SR;
  const L = new Float32Array(total);
  const stepAt = (i: number) => Math.floor((i * beat / 2 + (i % 2 ? s.swing * beat / 2 : 0)) * SR);
  const note = (start: number, len: number, f: number, w: Wave, vol: number, decay = .6) => {
    for (let i = 0; i < len && start + i < total; i++) L[start + i] += osc(w, f * i / SR) * vol * Math.min(1, i / 150) * Math.max(0, 1 - i / len) ** decay;
  };
  const noise = (start: number, len: number, vol: number, low = false) => {
    let last = 0;
    for (let i = 0; i < len && start + i < total; i++) { const n = Math.random() * 2 - 1; last = low ? last * .9 + n * .1 : n; L[start + i] += last * vol * (1 - i / len) ** 2; }
  };
  for (let i = 0; i < steps; i++) {
    const t = stepAt(i), bar = Math.floor(i / 8), chord = prog[bar % 4];
    const m = melody[i % melody.length];
    if (m !== null && m !== undefined) note(t, Math.floor(beat / 2 * SR * 1.6), hz(deg(m) + 12), s.lead, .26);
    if (i % 8 === 0) [0, 2, 4].forEach(k => note(t, Math.floor(beat * 4 * SR), hz(deg(chord + k)), s.pad, .07, 1.2));
    if (i % 2 === 0) note(t, Math.floor(beat * SR * .9), hz(deg(chord + (i % 4 ? 4 : 0)) - 12), 'sine', .22);
    if (s.drums !== 'none') {
      const kick = s.drums === 'four' ? i % 2 === 0 : i % 4 === 0;
      if (kick) { for (let k = 0; k < 2500 && t + k < total; k++) L[t + k] += Math.sin(2 * Math.PI * (60 + 90 * Math.exp(-k / 400)) * k / SR) * .35 * (1 - k / 2500); }
      if (i % 8 === 4 || (s.drums === 'march' && i % 8 === 6)) noise(t, 3000, s.drums === 'soft' ? .08 : .16);
      if (s.drums !== 'soft' && i % 2 === 1) noise(t, 600, .05);
    }
  }
  // ending chord
  const end = stepAt(steps);
  [0, 2, 4, 7].forEach(k => note(end, SR, hz(deg(k)), s.pad, .1, 1.5));

  const buf = new ArrayBuffer(44 + total * 2), dv = new DataView(buf);
  const w = (o: number, str: string) => [...str].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); dv.setUint32(4, 36 + total * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, total * 2, true);
  for (let i = 0; i < total; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, L[i] * .8)) * 0x7fff, true);
  const out = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  cache.set(url, out);
  return out;
}
