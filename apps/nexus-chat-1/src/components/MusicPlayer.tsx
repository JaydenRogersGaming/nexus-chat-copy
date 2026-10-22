import { useEffect, useRef, useState } from 'react';
import { Music, Play, Pause, Link2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@project/components/ui/popover';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Slider } from '@project/components/ui/slider';
import { toast } from 'sonner';
import { SONGS, getMusic, setMusic, type MusicPrefs } from '../lib/personalize';

export default function MusicPlayer() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [prefs, setPrefs] = useState<MusicPrefs>(() => ({ ...getMusic(), playing: false }));
  const [custom, setCustom] = useState('');

  useEffect(() => {
    if (!audio.current) { audio.current = new Audio(); audio.current.loop = true; }
    const a = audio.current;
    if (a.src !== prefs.url) a.src = prefs.url;
    a.volume = prefs.volume;
    if (prefs.playing) a.play().catch(() => { toast.error("Couldn't play that song"); setPrefs(p => ({ ...p, playing: false })); });
    else a.pause();
    setMusic(prefs);
  }, [prefs]);
  useEffect(() => () => audio.current?.pause(), []);

  const update = (patch: Partial<MusicPrefs>) => setPrefs(p => ({ ...p, ...patch }));
  function useCustom() {
    if (!/^https?:\/\/\S+$/.test(custom.trim())) { toast.error('Paste a direct audio link (https://…mp3)'); return; }
    update({ url: custom.trim(), playing: true });
    setCustom('');
  }
  const current = SONGS.find(s => s.url === prefs.url)?.name || 'Custom song';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button title="Background music" className={`h-8 w-8 flex items-center justify-center rounded-md hover:bg-secondary transition-colors ${prefs.playing ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
          <Music className={`w-4 h-4 ${prefs.playing ? 'animate-pulse' : ''}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <div className="flex items-center gap-2">
          <Button size="icon" className="h-9 w-9" onClick={() => update({ playing: !prefs.playing })}>
            {prefs.playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Now playing</p>
            <p className="text-sm font-semibold truncate">{current}</p>
          </div>
        </div>
        <Slider value={[prefs.volume * 100]} max={100} step={1} onValueChange={([v]) => update({ volume: v / 100 })} />
        <div className="space-y-1">
          {SONGS.map(s => (
            <button key={s.url} onClick={() => update({ url: s.url, playing: true })}
              className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs ${prefs.url === s.url ? 'bg-primary/15 font-semibold' : 'hover:bg-secondary text-muted-foreground'}`}>
              {s.name}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <Input value={custom} onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === 'Enter' && useCustom()} placeholder="Paste song URL (.mp3)" className="h-8 text-xs" />
          <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={useCustom}><Link2 className="w-3.5 h-3.5" /></Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
