import { useEffect, useRef, useState } from 'react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';

/** Each game calls onFinish(score) — higher is always better. */
export function ReactionGame({ onFinish }: { onFinish: (s: number) => void }) {
  const [phase, setPhase] = useState<'idle' | 'wait' | 'go' | 'early'>('idle');
  const start = useRef(0);
  const timer = useRef<number>();
  useEffect(() => () => clearTimeout(timer.current), []);

  function click() {
    if (phase === 'idle' || phase === 'early') {
      setPhase('wait');
      timer.current = window.setTimeout(() => { start.current = performance.now(); setPhase('go'); }, 1200 + Math.random() * 2500);
    } else if (phase === 'wait') { clearTimeout(timer.current); setPhase('early'); }
    else { const ms = Math.round(performance.now() - start.current); setPhase('idle'); onFinish(Math.max(0, 1000 - ms)); }
  }
  const label = { idle: 'Click to start', wait: 'Wait for green…', go: 'CLICK!', early: 'Too early! Click to retry' }[phase];
  return (
    <button onClick={click} className={`w-full h-48 rounded-xl text-xl font-bold transition-colors ${phase === 'go' ? 'bg-primary text-primary-foreground' : phase === 'early' ? 'bg-destructive text-destructive-foreground' : 'bg-secondary text-foreground'}`}>
      {label}
      <p className="text-xs font-normal opacity-70 mt-1">Score = 1000 − your reaction time in ms</p>
    </button>
  );
}

export function ClickFrenzyGame({ onFinish }: { onFinish: (s: number) => void }) {
  const [clicks, setClicks] = useState(0);
  const [left, setLeft] = useState<number | null>(null);
  const count = useRef(0);
  useEffect(() => {
    if (left === null) return;
    if (left <= 0) { onFinish(count.current); setLeft(null); return; }
    const t = setTimeout(() => setLeft(l => (l ?? 0) - 1), 1000);
    return () => clearTimeout(t);
  }, [left, onFinish]);
  function click() {
    if (left === null) { count.current = 0; setClicks(0); setLeft(10); return; }
    count.current += 1; setClicks(count.current);
  }
  return (
    <button onClick={click} className="w-full h-48 rounded-xl bg-secondary active:scale-[0.98] transition-transform">
      <p className="text-4xl font-black">{clicks}</p>
      <p className="text-sm text-muted-foreground">{left === null ? 'Click to start — 10 seconds' : `${left}s left`}</p>
    </button>
  );
}

const SENTENCES = [
  'the quick brown fox jumps over the lazy dog',
  'nexus chat is the best place to hang out with friends',
  'practice makes perfect so keep on typing fast',
  'gems and trophies await the fastest typer in the room',
];

export function SpeedTypingGame({ onFinish }: { onFinish: (s: number) => void }) {
  const [target, setTarget] = useState('');
  const [text, setText] = useState('');
  const start = useRef(0);
  function begin() { setTarget(SENTENCES[Math.floor(Math.random() * SENTENCES.length)]); setText(''); start.current = 0; }
  function change(v: string) {
    if (!start.current) start.current = performance.now();
    setText(v);
    if (v === target) {
      const min = (performance.now() - start.current) / 60000;
      onFinish(Math.round(target.split(' ').length / Math.max(min, 0.001)));
      setTarget('');
    }
  }
  if (!target) return <Button className="w-full h-24 text-lg" onClick={begin}>Start typing test</Button>;
  return (
    <div className="space-y-3">
      <p className="p-3 rounded-lg bg-secondary font-mono text-sm">
        {target.split('').map((c, i) => (
          <span key={i} className={i < text.length ? (text[i] === c ? 'text-primary' : 'text-destructive underline') : 'text-muted-foreground'}>{c}</span>
        ))}
      </p>
      <Input autoFocus value={text} onChange={e => change(e.target.value)} onPaste={e => e.preventDefault()} placeholder="Type the sentence above…" />
      <p className="text-xs text-muted-foreground">Score = words per minute</p>
    </div>
  );
}
