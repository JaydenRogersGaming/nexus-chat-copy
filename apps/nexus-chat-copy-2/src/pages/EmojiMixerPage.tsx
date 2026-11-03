import { useEffect, useRef, useState } from 'react';
import { Shuffle, Plus, Download, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { Slider } from '@project/components/ui/slider';
import { addMyEmoji, getMyEmojis, removeMyEmoji, MY_EMOJIS_EVENT, MyEmoji } from '../lib/emojiParts';
import { cn } from '@project/components/lib/utils';
import EmojiKitchen from '../components/emoji/EmojiKitchen';

const EMOJIS = ['😀','😂','🥹','😍','😎','🤩','😭','😡','🥶','🤢','😱','🤔','😴','🥳','😇','🤠','👽','🤖','👻','💀','🎃','😺','🐶','🐸','🦄','🐵','🔥','⭐','❤️','💎','🌈','⚡','🍕','🍩','🌮','🎉','👑','🕶️','🎩','🧢','💯','💩','🌵','🌸','🍀','🎮','💰','🍓'];

type Style = { id: string; label: string };
const STYLES: Style[] = [
  { id: 'wear', label: 'Wear it' },     // B worn on top of A (hats, glasses)
  { id: 'fuse', label: 'Fuse' },        // A tinted with B, B face peeks
  { id: 'hold', label: 'Holding' },     // B small in front corner
  { id: 'split', label: 'Half & half' },
];
const SIZE = 256;

function draw(c: HTMLCanvasElement, a: string, b: string, style: string, sB: number, yB: number) {
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const glyph = (e: string, x: number, y: number, s: number) => { ctx.font = `${s}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.fillText(e, x, y); };
  const off = yB * SIZE;
  if (style === 'split') {
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, SIZE / 2, SIZE); ctx.clip(); glyph(a, SIZE / 2, SIZE / 2 + 10, 210); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(SIZE / 2, 0, SIZE / 2, SIZE); ctx.clip(); glyph(b, SIZE / 2, SIZE / 2 + 10, 210); ctx.restore();
    return;
  }
  glyph(a, SIZE / 2, SIZE / 2 + 12, 200);
  if (style === 'fuse') {
    // tint the base with B's colors, then layer B semi-transparent
    const t = document.createElement('canvas'); t.width = t.height = SIZE;
    const tc = t.getContext('2d')!; tc.textAlign = 'center'; tc.textBaseline = 'middle';
    tc.font = `260px sans-serif`; tc.fillText(b, SIZE / 2, SIZE / 2 + 14);
    ctx.save(); ctx.globalCompositeOperation = 'source-atop'; ctx.globalAlpha = 0.45; ctx.filter = 'blur(6px)'; ctx.drawImage(t, 0, 0); ctx.restore();
    ctx.save(); ctx.globalAlpha = 0.9; glyph(b, SIZE / 2, SIZE / 2 + 12 + off, 110 * sB); ctx.restore();
  } else if (style === 'hold') {
    glyph(b, SIZE * 0.74, SIZE * 0.76 + off, 100 * sB);
  } else {
    glyph(b, SIZE / 2, SIZE * 0.22 + off, 130 * sB);
  }
}

function Grid({ value, onPick }: { value: string; onPick: (e: string) => void }) {
  return (
    <div className="grid grid-cols-8 gap-1 max-h-48 overflow-y-auto p-1">
      {EMOJIS.map(e => (
        <button key={e} onClick={() => onPick(e)} className={cn('text-2xl rounded-md p-1 transition-colors hover:bg-secondary', value === e && 'bg-primary/20 ring-2 ring-primary')}>{e}</button>
      ))}
    </div>
  );
}

export default function EmojiMixerPage() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [a, setA] = useState('😎');
  const [b, setB] = useState('👑');
  const [style, setStyle] = useState('wear');
  const [sB, setSB] = useState(1);
  const [yB, setYB] = useState(0);
  const [tab, setTab] = useState<'kitchen' | 'custom'>('kitchen');
  const [mine, setMine] = useState<MyEmoji[]>(getMyEmojis());

  useEffect(() => { if (ref.current) draw(ref.current, a, b, style, sB, yB); }, [a, b, style, sB, yB]);
  useEffect(() => { const s = () => setMine(getMyEmojis()); window.addEventListener(MY_EMOJIS_EVENT, s); return () => window.removeEventListener(MY_EMOJIS_EVENT, s); }, []);

  const shuffle = () => { setA(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]); setB(EMOJIS[Math.floor(Math.random() * EMOJIS.length)]); setStyle(STYLES[Math.floor(Math.random() * STYLES.length)].id); };
  const save = () => { addMyEmoji(ref.current!.toDataURL('image/png')); toast.success('Added to your emoji collection — find it in the chat emoji picker!'); };
  const download = () => { const l = document.createElement('a'); l.href = ref.current!.toDataURL('image/png'); l.download = 'emoji-mix.png'; l.click(); };

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">
        <div>
          <h1 className="text-2xl font-black">Emoji Kitchen</h1>
          <p className="text-sm text-muted-foreground">Cook two emojis into a brand-new one, discover recipes, and add them to your chat collection.</p>
          <div className="flex gap-1 mt-3">
            <Button size="sm" variant={tab === 'kitchen' ? 'default' : 'outline'} onClick={() => setTab('kitchen')}>🍳 Kitchen</Button>
            <Button size="sm" variant={tab === 'custom' ? 'default' : 'outline'} onClick={() => setTab('custom')}>🎨 Custom mix</Button>
          </div>
        </div>
        {tab === 'kitchen' && <EmojiKitchen />}
        <div className={cn('grid md:grid-cols-[1fr_auto_1fr] gap-4 items-start', tab !== 'custom' && 'hidden')}>
          <div className="bg-card border border-border rounded-xl p-3"><p className="text-xs font-semibold mb-2">Base emoji {a}</p><Grid value={a} onPick={setA} /></div>
          <div className="flex flex-col items-center gap-3">
            <canvas ref={ref} width={SIZE} height={SIZE} className="w-56 h-56 rounded-2xl border border-border" style={{ backgroundImage: 'repeating-conic-gradient(hsl(var(--muted)) 0 25%, transparent 0 50%)', backgroundSize: '20px 20px' }} />
            <div className="flex flex-wrap justify-center gap-1">
              {STYLES.map(s => <Button key={s.id} size="sm" variant={style === s.id ? 'default' : 'outline'} onClick={() => setStyle(s.id)}>{s.label}</Button>)}
            </div>
            {style !== 'split' && (
              <div className="w-56 space-y-3">
                <label className="text-xs text-muted-foreground">Size<Slider value={[sB]} min={0.4} max={1.8} step={0.05} onValueChange={v => setSB(v[0])} /></label>
                <label className="text-xs text-muted-foreground">Position<Slider value={[yB]} min={-0.3} max={0.5} step={0.01} onValueChange={v => setYB(v[0])} /></label>
              </div>
            )}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={shuffle}><Shuffle className="w-4 h-4 mr-1" />Random</Button>
              <Button variant="outline" size="sm" onClick={download}><Download className="w-4 h-4" /></Button>
              <Button size="sm" onClick={save}><Plus className="w-4 h-4 mr-1" />Add to collection</Button>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-3"><p className="text-xs font-semibold mb-2">Mix in {b}</p><Grid value={b} onPick={setB} /></div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm font-semibold mb-3">Your collection ({mine.length})</p>
          {mine.length === 0 ? <p className="text-xs text-muted-foreground">No emojis yet — make your first mix above.</p> : (
            <div className="flex flex-wrap gap-2">
              {mine.map(m => (
                <div key={m.id} className="relative group">
                  <img src={m.url} alt="emoji" className="w-14 h-14 rounded-lg bg-secondary p-1" />
                  <button onClick={() => removeMyEmoji(m.id)} className="absolute -top-1 -right-1 hidden group-hover:flex w-5 h-5 rounded-full bg-destructive text-destructive-foreground items-center justify-center"><Trash2 className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
