import { useEffect, useRef, useState } from 'react';
import { Play, Square, Trash2, Save, Shuffle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Slider } from '@project/components/ui/slider';
import { Input } from '@project/components/ui/input';
import { cn } from '@project/components/lib/utils';

const STEPS = 16;
const NOTES = [
  { n: 'C5', f: 523.25 }, { n: 'A4', f: 440 }, { n: 'G4', f: 392 }, { n: 'E4', f: 329.63 },
  { n: 'D4', f: 293.66 }, { n: 'C4', f: 261.63 },
];
const DRUMS = ['Hi-hat', 'Snare', 'Kick'];
const ROWS = NOTES.length + DRUMS.length;
const WAVES: OscillatorType[] = ['sine', 'square', 'triangle', 'sawtooth'];
type Song = { name: string; grid: boolean[][]; bpm: number; wave: OscillatorType };
const KEY = 'nexus_songs';
const empty = () => Array.from({ length: ROWS }, () => Array(STEPS).fill(false));
const loadSongs = (): Song[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

function playRow(ctx: AudioContext, row: number, wave: OscillatorType) {
  const t = ctx.currentTime;
  const g = ctx.createGain(); g.connect(ctx.destination);
  if (row < NOTES.length) {
    const o = ctx.createOscillator(); o.type = wave; o.frequency.value = NOTES[row].f; o.connect(g);
    g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); o.start(t); o.stop(t + 0.3);
    return;
  }
  const d = DRUMS[row - NOTES.length];
  if (d === 'Kick') {
    const o = ctx.createOscillator(); o.connect(g); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    g.gain.setValueAtTime(0.8, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25); o.start(t); o.stop(t + 0.25);
  } else {
    const len = d === 'Snare' ? 0.15 : 0.05;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate); const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = d === 'Snare' ? 1000 : 6000;
    s.connect(f); f.connect(g); g.gain.setValueAtTime(d === 'Snare' ? 0.4 : 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + len); s.start(t);
  }
}

export default function MusicMaker() {
  const [grid, setGrid] = useState<boolean[][]>(empty);
  const [bpm, setBpm] = useState(110);
  const [wave, setWave] = useState<OscillatorType>('triangle');
  const [step, setStep] = useState(-1);
  const [name, setName] = useState('');
  const [songs, setSongs] = useState<Song[]>(loadSongs);
  const ctxRef = useRef<AudioContext | null>(null);
  const live = useRef({ grid, wave }); live.current = { grid, wave };
  const playing = step >= 0;

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setStep(s => {
        const n = (s + 1) % STEPS;
        live.current.grid.forEach((r, i) => r[n] && playRow(ctxRef.current!, i, live.current.wave));
        return n;
      });
    }, 60000 / bpm / 4);
    return () => clearInterval(id);
  }, [playing, bpm]);

  const toggle = (r: number, c: number) => {
    setGrid(g => g.map((row, i) => i === r ? row.map((v, j) => j === c ? !v : v) : row));
    if (!grid[r][c]) { ctxRef.current ??= new AudioContext(); playRow(ctxRef.current, r, wave); }
  };
  const play = () => { ctxRef.current ??= new AudioContext(); ctxRef.current.resume(); setStep(playing ? -1 : STEPS - 1); };
  const random = () => setGrid(empty().map((r, i) => r.map(() => Math.random() < (i < NOTES.length ? 0.12 : 0.25))));
  const save = () => {
    if (!name.trim()) return toast.error('Give your song a name');
    const next = [{ name: name.trim(), grid, bpm, wave }, ...songs.filter(s => s.name !== name.trim())].slice(0, 30);
    localStorage.setItem(KEY, JSON.stringify(next)); setSongs(next); toast.success('Song saved');
  };
  const del = (n: string) => { const next = songs.filter(s => s.name !== n); localStorage.setItem(KEY, JSON.stringify(next)); setSongs(next); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={play}>{playing ? <><Square className="w-4 h-4 mr-1" />Stop</> : <><Play className="w-4 h-4 mr-1" />Play</>}</Button>
        <Button variant="outline" onClick={random}><Shuffle className="w-4 h-4 mr-1" />Random</Button>
        <Button variant="outline" onClick={() => setGrid(empty())}><Trash2 className="w-4 h-4 mr-1" />Clear</Button>
        <div className="flex items-center gap-2 w-48"><span className="text-xs text-muted-foreground w-16">{bpm} BPM</span><Slider value={[bpm]} min={60} max={200} step={1} onValueChange={v => setBpm(v[0])} /></div>
        <div className="flex gap-1">{WAVES.map(w => <Button key={w} size="sm" variant={wave === w ? 'default' : 'outline'} onClick={() => setWave(w)} className="capitalize">{w}</Button>)}</div>
      </div>
      <div className="bg-card border border-border rounded-xl p-3 overflow-x-auto">
        {grid.map((row, r) => (
          <div key={r} className={cn('flex items-center gap-1 mb-1', r === NOTES.length && 'mt-3')}>
            <span className="w-14 text-[11px] text-muted-foreground shrink-0">{r < NOTES.length ? NOTES[r].n : DRUMS[r - NOTES.length]}</span>
            {row.map((on, c) => (
              <button key={c} onClick={() => toggle(r, c)} className={cn('w-8 h-8 shrink-0 rounded-md border transition-all', c % 4 === 0 ? 'border-border' : 'border-border/50',
                on ? (r < NOTES.length ? 'bg-primary' : 'bg-accent') : 'bg-secondary/40 hover:bg-secondary', step === c && 'ring-2 ring-foreground/60 scale-105')} />
            ))}
          </div>
        ))}
      </div>
      <div className="flex gap-2 max-w-sm"><Input placeholder="Song name" value={name} onChange={e => setName(e.target.value)} /><Button onClick={save}><Save className="w-4 h-4 mr-1" />Save</Button></div>
      {songs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {songs.map(s => (
            <div key={s.name} className="flex items-center gap-1 bg-secondary rounded-full pl-3 pr-1 py-1 text-xs">
              <button onClick={() => { setGrid(s.grid); setBpm(s.bpm); setWave(s.wave); setName(s.name); }} className="font-semibold hover:underline">🎵 {s.name}</button>
              <button onClick={() => del(s.name)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
