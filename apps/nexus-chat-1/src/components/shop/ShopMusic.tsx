import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { Slider } from '@project/components/ui/slider';
import { resolveSongUrl } from '../../lib/holidaySongs';

const KEY = 'nexus_shop_audio';
type Prefs = { volume: number; muted: boolean };
const read = (): Prefs => { try { return { volume: 0.4, muted: false, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { volume: 0.4, muted: false }; } };
const write = (p: Prefs) => { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage blocked */ } };

/** Seasonal background track for the shop. Never autoplays — starts only when the user presses play. */
export default function ShopMusic({ songUrl, title, open }: { songUrl: string; title: string; open: boolean }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(read);

  // New theme → new track; stop the old one
  useEffect(() => {
    let src = '';
    try { src = resolveSongUrl(songUrl); setFailed(false); } catch { setFailed(true); }
    const a = src ? new Audio(src) : null;
    if (a) { a.loop = true; a.onerror = () => { setFailed(true); setPlaying(false); }; }
    audio.current = a;
    setPlaying(false);
    return () => { a?.pause(); };
  }, [songUrl]);

  useEffect(() => { if (!open) { audio.current?.pause(); setPlaying(false); } }, [open]);
  useEffect(() => { const a = audio.current; if (a) { a.volume = prefs.volume; a.muted = prefs.muted; } write(prefs); }, [prefs, songUrl]);

  const toggle = () => {
    const a = audio.current; if (!a) return;
    if (playing) { a.pause(); setPlaying(false); return; }
    a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); // browser may still block — stay paused
  };

  if (failed) return <p className="text-[11px] text-white/70">🎵 Music unavailable for this theme</p>;
  return (
    <div className="flex items-center gap-2 rounded-full bg-black/40 backdrop-blur px-2 py-1 border border-white/15">
      <button onClick={toggle} aria-label={playing ? 'Pause music' : 'Play music'} className="w-7 h-7 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
        {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
      </button>
      <span className="text-[11px] text-white/85 max-w-[9rem] truncate hidden sm:block" title={title}>{title}</span>
      <button onClick={() => setPrefs(p => ({ ...p, muted: !p.muted }))} aria-label={prefs.muted ? 'Unmute' : 'Mute'} className="text-white/85 hover:text-white">
        {prefs.muted || prefs.volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      </button>
      <Slider aria-label="Volume" className="w-20" value={[prefs.muted ? 0 : prefs.volume]} min={0} max={1} step={0.05}
        onValueChange={v => setPrefs({ volume: v[0], muted: v[0] === 0 })} />
    </div>
  );
}
