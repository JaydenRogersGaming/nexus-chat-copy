import { HOLIDAYS, variantFor } from './holidays';

// Melodies as [midi note | 0 for rest, beats]. Public-domain tunes.
type Tune = [number, number][];
const JINGLE: Tune = [[64,1],[64,1],[64,2],[64,1],[64,1],[64,2],[64,1],[67,1],[60,1.5],[62,.5],[64,4],[65,1],[65,1],[65,1.5],[65,.5],[65,1],[64,1],[64,1],[64,.5],[64,.5],[64,1],[62,1],[62,1],[64,1],[62,2],[67,2]];
const SPOOKY: Tune = [[57,1.5],[57,1],[57,.5],[57,1.5],[60,1],[59,.5],[59,1],[57,1],[57,1],[56,1],[57,3],[0,1],[52,.5],[55,.5],[58,.5],[61,.5],[64,2],[63,.5],[60,.5],[57,1],[0,1]];
const AULD: Tune = [[60,1],[65,1.5],[65,.5],[65,1],[69,1],[67,1.5],[65,.5],[67,1],[69,.5],[67,.5],[65,1.5],[65,.5],[69,1],[72,1],[74,3],[0,1]];
const YANKEE: Tune = [[60,1],[60,1],[62,1],[64,1],[60,1],[64,1],[62,2],[60,1],[60,1],[62,1],[64,1],[60,2],[59,2],[60,1],[60,1],[62,1],[64,1],[65,1],[64,1],[62,1],[60,1],[59,1],[55,1],[57,1],[59,1],[60,2],[60,2]];
const LOVE: Tune = [[67,1],[72,1.5],[71,.5],[69,1],[67,1],[64,2],[0,.5],[65,.5],[67,1],[69,1.5],[67,.5],[65,1],[64,1],[62,3],[0,1]];
const JIG: Tune = [[67,.5],[69,.5],[71,.5],[67,.5],[74,.5],[71,.5],[69,.5],[67,.5],[66,.5],[69,.5],[72,.5],[69,.5],[67,1],[0,.5],[62,.5],[67,.5],[71,.5],[74,1],[72,.5],[71,.5],[69,1.5]];
const HARVEST: Tune = [[60,1],[64,1],[67,1],[72,2],[69,1],[67,1],[65,1],[64,2],[62,1],[64,1],[65,1],[67,2],[64,1],[62,1],[60,3],[0,1]];
const SPRING: Tune = [[72,.5],[74,.5],[76,1],[79,1],[76,.5],[74,.5],[72,1],[67,1],[69,.5],[71,.5],[72,1],[74,1],[72,2],[0,1]];

const TUNES: Record<string, Tune> = { christmas: JINGLE, halloween: SPOOKY, newyear: AULD, july4: YANKEE, valentines: LOVE, stpatricks: JIG, thanksgiving: HARVEST, easter: SPRING };
type Wave = 'square' | 'triangle' | 'sine' | 'saw';
const VARIANTS: { wave: Wave; bpm: number; shift: number; label: string }[] = [
  { wave: 'triangle', bpm: 132, shift: 0, label: 'Theme' },
  { wave: 'square', bpm: 150, shift: 0, label: 'Chiptune' },
  { wave: 'sine', bpm: 104, shift: -12, label: 'Lullaby' },
  { wave: 'saw', bpm: 120, shift: 0, label: 'Synthwave' },
];

export type HolidaySong = { id: string; name: string; url: string; holidayKey: string; year: number; cost: number };
export const SONG_COST = 600;

export function holidaySong(holidayKey: string, year: number): HolidaySong {
  const h = HOLIDAYS.find(x => x.key === holidayKey)!;
  const v = VARIANTS[year % VARIANTS.length];
  return { id: `evs-${h.key}-${year}`, name: `${h.emoji} ${variantFor(h, year).name} ${v.label} ${year}`, url: `synth:${h.key}:${year}`, holidayKey: h.key, year, cost: SONG_COST };
}
export function allHolidaySongs(): HolidaySong[] {
  const y = new Date().getFullYear();
  return HOLIDAYS.flatMap(h => Array.from({ length: 6 }, (_, i) => holidaySong(h.key, y - 3 + i)));
}

const cache = new Map<string, string>();
const osc = (w: Wave, p: number) => w === 'sine' ? Math.sin(2 * Math.PI * p) : w === 'square' ? (p % 1 < .5 ? 1 : -1) * .6 : w === 'saw' ? ((p % 1) * 2 - 1) * .6 : 1 - 4 * Math.abs((p % 1) - .5);

/** Turns a "synth:holiday:year" URL into a playable blob URL (built once, then cached). */
export function resolveSongUrl(url: string): string {
  if (!url.startsWith('synth:')) return url;
  if (cache.has(url)) return cache.get(url)!;
  const [, key, yr] = url.split(':');
  const year = Number(yr);
  const tune = TUNES[key] || SPRING;
  const v = VARIANTS[year % VARIANTS.length];
  const SR = 22050, beat = 60 / v.bpm;
  const total = Math.ceil(tune.reduce((s, [, b]) => s + b, 0) * beat * 2 * SR);
  const data = new Float32Array(total);
  let t = 0;
  for (let rep = 0; rep < 2; rep++) for (const [n, b] of tune) {
    const len = Math.floor(b * beat * SR);
    if (n) {
      const f = 440 * 2 ** ((n + v.shift - 69) / 12);
      for (let i = 0; i < len && t + i < total; i++) {
        const env = Math.min(1, i / 200) * Math.max(0, 1 - i / len) ** 0.6;
        data[t + i] += (osc(v.wave, f * i / SR) * 0.35 + osc('sine', f / 2 * i / SR) * 0.2) * env;
      }
    }
    t += len;
  }
  // 16-bit mono WAV
  const buf = new ArrayBuffer(44 + total * 2), dv = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); dv.setUint32(4, 36 + total * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, total * 2, true);
  for (let i = 0; i < total; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, data[i])) * 0x7fff, true);
  const out = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  cache.set(url, out);
  return out;
}
