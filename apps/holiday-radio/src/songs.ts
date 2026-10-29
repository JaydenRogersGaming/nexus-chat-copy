// Original songs generated in the browser — no recordings, so no copyright issues.
export type Song = { id: string; title: string; mood: string; emoji: string; bpm: number; seed: number; minor?: boolean };

export const SONGS: Song[] = [
  { id: 'cocoa', title: 'Cocoa by the Window', mood: 'Cozy', emoji: '☕', bpm: 96, seed: 11 },
  { id: 'sleigh', title: 'Sleigh Bell Sprint', mood: 'Upbeat', emoji: '🛷', bpm: 144, seed: 23 },
  { id: 'snow', title: 'First Snowfall', mood: 'Peaceful', emoji: '❄️', bpm: 80, seed: 37 },
  { id: 'lights', title: 'String the Lights', mood: 'Joyful', emoji: '✨', bpm: 124, seed: 41 },
  { id: 'fire', title: 'Fireside Lullaby', mood: 'Calm', emoji: '🔥', bpm: 72, seed: 53, minor: true },
  { id: 'cookies', title: 'Cookie Tin Shuffle', mood: 'Playful', emoji: '🍪', bpm: 132, seed: 67 },
  { id: 'eve', title: 'Midnight on the Eve', mood: 'Dreamy', emoji: '🌙', bpm: 88, seed: 79, minor: true },
  { id: 'carol', title: 'Carolers on Maple St', mood: 'Warm', emoji: '🎶', bpm: 108, seed: 83 },
];

const SR = 22050;
const cache = new Map<string, string>();
function rng(seed: number) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }

export function songUrl(song: Song): string {
  if (cache.has(song.id)) return cache.get(song.id)!;
  const r = rng(song.seed * 9973);
  const scale = song.minor ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const root = 57 + Math.floor(r() * 5);
  const hz = (n: number) => 440 * 2 ** ((n - 69) / 12);
  const deg = (d: number) => root + scale[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
  const beat = 60 / song.bpm, stepLen = beat / 2;
  const motif = Array.from({ length: 16 }, () => (r() < .15 ? null : Math.floor(r() * 9) - 1));
  const prog = [0, 5, 3, 4];
  const steps = 16 * 8;
  const total = Math.ceil(steps * stepLen * SR) + SR;
  const L = new Float32Array(total);
  const note = (t: number, len: number, f: number, vol: number, bell = false) => {
    for (let i = 0; i < len && t + i < total; i++) {
      const ph = 2 * Math.PI * f * i / SR;
      const v = bell ? Math.sin(ph) + .3 * Math.sin(ph * 2.76) : Math.sin(ph) + .2 * Math.sin(ph * 2);
      L[t + i] += v * vol * Math.min(1, i / 120) * Math.exp(-i / (len * .45));
    }
  };
  for (let i = 0; i < steps; i++) {
    const t = Math.floor(i * stepLen * SR), chord = prog[Math.floor(i / 8) % 4];
    const variation = Math.floor(i / 32) % 2 ? 2 : 0;
    const m = motif[i % 16];
    if (m !== null) note(t, Math.floor(stepLen * SR * 2), hz(deg(m + variation) + 12), .22, true);
    if (i % 8 === 0) [0, 2, 4].forEach(k => note(t, Math.floor(beat * 4 * SR), hz(deg(chord + k)), .06));
    if (i % 2 === 0) note(t, Math.floor(beat * SR), hz(deg(chord) - 12), .2);
    if (song.bpm > 100 && i % 2 === 1) for (let k = 0; k < 500 && t + k < total; k++) L[t + k] += (Math.random() * 2 - 1) * .04 * (1 - k / 500);
  }
  const buf = new ArrayBuffer(44 + total * 2), dv = new DataView(buf);
  const w = (o: number, s: string) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); dv.setUint32(4, 36 + total * 2, true); w(8, 'WAVEfmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 1, true);
  dv.setUint32(24, SR, true); dv.setUint32(28, SR * 2, true); dv.setUint16(32, 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, total * 2, true);
  for (let i = 0; i < total; i++) dv.setInt16(44 + i * 2, Math.max(-1, Math.min(1, L[i] * .8)) * 0x7fff, true);
  const url = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  cache.set(song.id, url);
  return url;
}
