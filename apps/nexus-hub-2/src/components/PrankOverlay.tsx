import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { pranks as pranksApi } from 'zitejs/api';
import { useApp } from '../contexts/AppContext';
import { findPrank, prankOptOut, type Prank } from '../lib/pranks';
import { isVip } from '../lib/vip';

type Active = { prank: Prank; from: string };

const FX: Record<string, string> = {
  flip: 'transform: rotate(180deg);', spin: 'animation: prank-spin 2s linear infinite;',
  shake: 'animation: prank-shake .25s linear infinite;', blur: 'filter: blur(4px);',
  invert: 'filter: invert(1) hue-rotate(180deg);', tiny: 'transform: scale(.5);',
  color: 'animation: prank-hue 1s linear infinite;',
};
const KEYFRAMES = `@keyframes prank-spin{to{transform:rotate(360deg)}}
@keyframes prank-shake{0%,100%{transform:translate(0)}25%{transform:translate(-8px,4px)}75%{transform:translate(8px,-4px)}}
@keyframes prank-hue{to{filter:hue-rotate(360deg)}}
@keyframes prank-fall{from{transform:translateY(-10vh) rotate(0)}to{transform:translateY(110vh) rotate(360deg)}}`;

/** Checks for pranks sent to you and plays them (max 30s, always closable). */
export default function PrankOverlay() {
  const { profile } = useApp();
  const email = profile?.email || '';
  const [queue, setQueue] = useState<Active[]>([]);
  const cur = queue[0];
  const [progress, setProgress] = useState(0);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!email) return;
    const poll = () => pranksApi({ action: 'inbox' }).then(({ pranks }) => {
      if (isVip(email) && prankOptOut(email)) return; // VIP Prank Shield
      const next = pranks.map(p => ({ prank: findPrank(p.prankId)!, from: p.senderName })).filter(a => a.prank);
      if (next.length) setQueue(q => [...q, ...next]);
    }).catch(() => {});
    poll(); const t = setInterval(poll, 8000);
    return () => clearInterval(t);
  }, [email]);

  useEffect(() => {
    if (!styleRef.current) { styleRef.current = document.createElement('style'); document.head.appendChild(styleRef.current); }
    const el = styleRef.current;
    if (!cur) { el.textContent = KEYFRAMES; return; }
    const fx = FX[cur.prank.kind];
    el.textContent = KEYFRAMES + (fx ? `#root{${fx}transition:transform .4s,filter .4s;}` : '');
    setProgress(0);
    const secs = Math.min(cur.prank.seconds, 30);
    const tick = setInterval(() => setProgress(p => Math.min(100, p + 100 / (secs * 10))), 100);
    const end = setTimeout(() => setQueue(q => q.slice(1)), secs * 1000);
    return () => { clearInterval(tick); clearTimeout(end); };
  }, [cur]);

  if (!cur) return null;
  const { prank, from } = cur;
  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {prank.kind === 'rain' && Array.from({ length: 40 }).map((_, i) => (
        <span key={i} className="absolute text-4xl" style={{ left: `${(i * 37) % 100}%`, top: 0,
          animation: `prank-fall ${2 + (i % 5) * 0.6}s linear ${(i % 10) * 0.3}s infinite` }}>{prank.emoji}</span>
      ))}
      {(prank.kind === 'popup' || prank.kind === 'fakeBar') && (
        <div className="absolute inset-0 grid place-items-center bg-background/70 backdrop-blur-sm">
          <div className="max-w-md mx-4 rounded-2xl border border-border bg-card p-6 text-center shadow-2xl">
            <div className="text-6xl">{prank.emoji}</div>
            <p className="mt-3 text-lg font-bold">{prank.text}</p>
            {prank.kind === 'fakeBar' && <div className="mt-4 h-3 rounded-full bg-muted overflow-hidden"><div className="h-full bg-destructive" style={{ width: `${progress}%` }} /></div>}
          </div>
        </div>
      )}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 pointer-events-auto flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1.5 text-sm shadow-lg">
        {prank.emoji} <b>{from}</b> pranked you!
        <button onClick={() => setQueue(q => q.slice(1))} className="ml-1 rounded-full p-1 hover:bg-muted" aria-label="Close prank"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
