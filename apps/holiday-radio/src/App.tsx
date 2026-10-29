import { useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2 } from 'lucide-react';
import { SONGS, songUrl } from './songs';

function Snow() {
  return <>{Array.from({ length: 24 }, (_, i) => (
    <span key={i} className="snowflake" style={{ left: `${(i * 37) % 100}%`, animationDuration: `${8 + (i % 7)}s`, animationDelay: `${-(i % 9)}s`, fontSize: `${10 + (i % 4) * 4}px` }}>❄</span>
  ))}</>;
}

export default function App() {
  const audio = useRef<HTMLAudioElement>(null);
  const [idx, setIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const song = idx === null ? null : SONGS[idx];

  function play(n: number) {
    const i = (n + SONGS.length) % SONGS.length;
    setIdx(i);
    const a = audio.current!;
    a.src = songUrl(SONGS[i]);
    a.play().catch(() => setPlaying(false));
  }
  function toggle() {
    const a = audio.current!;
    if (idx === null) return play(0);
    if (a.paused) a.play(); else a.pause();
  }

  return (
    <div className="min-h-screen bg-secondary text-secondary-foreground relative overflow-hidden">
      <Snow />
      <main className="relative max-w-2xl mx-auto px-4 py-10 md:py-16 space-y-8">
        <header className="text-center space-y-2">
          <p className="text-accent text-sm font-semibold tracking-widest uppercase">Free · Copyright-safe</p>
          <h1 className="font-serif text-5xl md:text-6xl font-extrabold">Holiday Radio</h1>
          <p className="opacity-80">Original festive music, made just for this station. Press play and enjoy.</p>
        </header>

        <section className="rounded-[var(--radius)] bg-card text-card-foreground p-6 shadow-2xl space-y-5">
          <div className="flex items-center gap-4">
            <div className={`w-20 h-20 shrink-0 rounded-2xl bg-primary text-4xl flex items-center justify-center ${playing ? 'animate-pulse' : ''}`}>{song?.emoji ?? '🎄'}</div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">{song ? 'Now playing' : 'Ready when you are'}</p>
              <p className="font-serif text-2xl font-bold truncate">{song?.title ?? 'Pick a song'}</p>
              {song && <p className="text-sm text-muted-foreground">{song.mood} · {song.bpm} BPM</p>}
            </div>
          </div>
          <div className="flex items-center justify-center gap-4">
            <button aria-label="Previous" onClick={() => play((idx ?? 0) - 1)} className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-muted"><SkipBack className="w-5 h-5" /></button>
            <button aria-label={playing ? 'Pause' : 'Play'} onClick={toggle} className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-105 transition-transform">{playing ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-1" />}</button>
            <button aria-label="Next" onClick={() => play((idx ?? -1) + 1)} className="w-11 h-11 rounded-full border border-border flex items-center justify-center hover:bg-muted"><SkipForward className="w-5 h-5" /></button>
          </div>
          <label className="flex items-center gap-3 text-muted-foreground">
            <Volume2 className="w-4 h-4" />
            <input type="range" min={0} max={1} step={0.05} value={volume} className="flex-1 accent-[hsl(var(--primary))]"
              onChange={e => { const v = Number(e.target.value); setVolume(v); if (audio.current) audio.current.volume = v; }} />
          </label>
          <audio ref={audio} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => play((idx ?? 0) + 1)} />
        </section>

        <section className="grid sm:grid-cols-2 gap-3">
          {SONGS.map((s, i) => (
            <button key={s.id} onClick={() => play(i)}
              className={`text-left rounded-2xl p-4 flex items-center gap-3 transition-colors ${i === idx ? 'bg-primary text-primary-foreground' : 'bg-card/10 hover:bg-card/20'}`}>
              <span className="text-2xl">{s.emoji}</span>
              <span className="min-w-0"><span className="block font-semibold truncate">{s.title}</span><span className="text-xs opacity-75">{s.mood}</span></span>
            </button>
          ))}
        </section>

        <footer className="text-center text-xs opacity-70">Every track is an original composition generated for Holiday Radio, so it's safe to play anywhere. © 2026 Nexus Hub</footer>
      </main>
    </div>
  );
}
