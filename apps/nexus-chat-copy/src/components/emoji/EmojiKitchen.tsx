import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shuffle, Plus, Download, BookOpen, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import { addMyEmoji } from '../../lib/emojiParts';

const EMOJIS = ['😀','😂','🥹','😍','😎','🤩','😭','😡','🥶','🤢','😱','🤔','😴','🥳','😇','🤠','👽','🤖','👻','💀','🎃','😺','🐶','🐸','🦄','🐵','🔥','⭐','❤️','🌈','⚡','🍕','🍩','🌮','🎂','👑','💯','💩','🌵','🌸','🍀','🍓','🐙','🐝','🌙','☀️','🍄','🧁'];
const KEY = 'nexus_kitchen_found';
const kitchenUrl = (a: string, b: string) => `https://emojik.vercel.app/s/${encodeURIComponent(a)}_${encodeURIComponent(b)}?size=256`;
const getFound = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

function Picker({ value, onPick, label }: { value: string; onPick: (e: string) => void; label: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-3">
      <p className="text-xs font-semibold text-muted-foreground mb-2">{label}</p>
      <div className="grid grid-cols-8 gap-1 max-h-56 overflow-y-auto">
        {EMOJIS.map(e => (
          <button key={e} onClick={() => onPick(e)} className={cn('text-2xl rounded-lg p-1 transition-transform hover:scale-125', value === e && 'bg-primary/20 ring-2 ring-primary')}>{e}</button>
        ))}
      </div>
    </div>
  );
}

/** Emoji Kitchen–style game: pick two emojis, get a real blended emoji, collect discoveries. */
export default function EmojiKitchen() {
  const [a, setA] = useState('😎');
  const [b, setB] = useState('👻');
  const [found, setFound] = useState<string[]>(getFound);
  const [failed, setFailed] = useState(false);
  const pair = [a, b].sort().join('_');
  const url = kitchenUrl(a, b);

  useEffect(() => setFailed(false), [url]);
  function onLoad() {
    if (found.includes(pair)) return;
    const next = [pair, ...found];
    setFound(next); localStorage.setItem(KEY, JSON.stringify(next));
    toast.success(`✨ New recipe discovered! ${a} + ${b}`);
  }
  const rand = () => EMOJIS[Math.floor(Math.random() * EMOJIS.length)];

  return (
    <div className="space-y-5">
      <div className="grid md:grid-cols-[1fr_auto_1fr] gap-4 items-start">
        <Picker value={a} onPick={setA} label="Ingredient 1" />
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-2 text-4xl"><span>{a}</span><span className="text-xl text-muted-foreground">+</span><span>{b}</span></div>
          <div className="w-48 h-48 rounded-3xl border border-border bg-secondary/40 flex items-center justify-center">
            <AnimatePresence mode="wait">
              {failed
                ? <motion.p key="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-muted-foreground text-center px-4">These two don't cook together — try another pair!</motion.p>
                : <motion.img key={url} src={url} alt={`${a}${b}`} onLoad={onLoad} onError={() => setFailed(true)} initial={{ scale: 0.3, rotate: -20, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="w-40 h-40" />}
            </AnimatePresence>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { setA(rand()); setB(rand()); }}><Shuffle className="w-4 h-4 mr-1" />Surprise me</Button>
            <Button variant="outline" size="icon" className="h-9 w-9" disabled={failed} asChild><a href={url} download="emoji-kitchen.png" target="_blank" rel="noreferrer"><Download className="w-4 h-4" /></a></Button>
            <Button size="sm" disabled={failed} onClick={() => { addMyEmoji(url); toast.success('Added to your emoji collection — use it in chat!'); }}><Plus className="w-4 h-4 mr-1" />Collect</Button>
          </div>
        </div>
        <Picker value={b} onPick={setB} label="Ingredient 2" />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-primary" />
          <p className="text-sm font-semibold">Recipe book</p>
          <span className="ml-auto text-xs text-muted-foreground flex items-center gap-1"><Sparkles className="w-3 h-3" />{found.length} discovered</span>
        </div>
        {found.length === 0 ? <p className="text-xs text-muted-foreground">Mix two emojis to discover your first recipe.</p> : (
          <div className="flex flex-wrap gap-2">
            {found.slice(0, 60).map(p => { const [x, y] = p.split('_'); return (
              <button key={p} title={`${x} + ${y}`} onClick={() => { setA(x); setB(y); }} className="w-14 h-14 rounded-xl bg-secondary p-1 hover:scale-110 transition-transform">
                <img src={kitchenUrl(x, y)} alt={p} className="w-full h-full" loading="lazy" />
              </button>
            ); })}
          </div>
        )}
      </div>
    </div>
  );
}
