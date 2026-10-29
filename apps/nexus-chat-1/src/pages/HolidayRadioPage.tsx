import { useMemo, useRef, useState } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { allHolidaySongs, resolveSongUrl } from '../lib/holidaySongs';

export default function HolidayRadioPage() {
  const songs = useMemo(() => allHolidaySongs(), []);
  const audio = useRef<HTMLAudioElement>(null);
  const [idx, setIdx] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const song = idx === null ? null : songs[idx];

  function play(n: number) {
    const i = (n + songs.length) % songs.length;
    setIdx(i);
    const a = audio.current!;
    a.src = resolveSongUrl(songs[i].url);
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }
  function toggle() {
    const a = audio.current!;
    if (idx === null) return play(0);
    if (a.paused) a.play().then(() => setPlaying(true)); else { a.pause(); setPlaying(false); }
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-black flex items-center gap-2"><Music className="w-6 h-6 text-primary" /> Holiday Radio</h1>
        <p className="text-sm text-muted-foreground">Every song here is an original made by Nexus Hub, so it's 100% copyright-free.</p>
      </div>
      <div className="rounded-2xl border border-primary/40 bg-card p-5 space-y-3 sticky top-0 z-10">
        <p className="font-bold truncate">{song ? song.name : 'Press play to start the radio'}</p>
        {song && <p className="text-xs text-muted-foreground">{song.mood} · {song.instruments}</p>}
        <div className="flex items-center justify-center gap-3">
          <Button size="icon" variant="outline" onClick={() => play((idx ?? 0) - 1)}><SkipBack className="w-4 h-4" /></Button>
          <Button size="icon" className="h-12 w-12 rounded-full" onClick={toggle}>{playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}</Button>
          <Button size="icon" variant="outline" onClick={() => play((idx ?? -1) + 1)}><SkipForward className="w-4 h-4" /></Button>
        </div>
        <audio ref={audio} controls className="w-full" onEnded={() => play((idx ?? 0) + 1)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      </div>
      <ul className="space-y-1.5">
        {songs.map((s, i) => (
          <li key={s.id}>
            <button onClick={() => play(i)} className={`w-full text-left rounded-xl border px-3 py-2 text-sm transition-colors ${i === idx ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted'}`}>
              <span className="font-medium">{s.name}</span>
              <span className="block text-[11px] text-muted-foreground">{s.genre} · {s.mood}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
