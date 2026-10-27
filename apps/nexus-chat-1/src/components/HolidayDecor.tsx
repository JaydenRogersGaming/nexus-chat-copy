import { useMemo } from 'react';
import type { ActiveEvent } from '../lib/holidays';

function Web({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
      {[0, 15, 30, 45, 60, 75, 90].map(a => { const r = (a * Math.PI) / 180; return <line key={a} x1="0" y1="0" x2={200 * Math.cos(r)} y2={200 * Math.sin(r)} />; })}
      {[40, 80, 120, 160].map(rad => (
        <path key={rad} d={[0, 15, 30, 45, 60, 75, 90].map((a, i) => { const r = (a * Math.PI) / 180; const k = rad * (i % 2 ? 0.92 : 1); return `${i ? 'L' : 'M'}${k * Math.cos(r)},${k * Math.sin(r)}`; }).join(' ')} />
      ))}
    </svg>
  );
}

/** Full-screen, click-through holiday decorations. */
export default function HolidayDecor({ event }: { event: ActiveEvent }) {
  const { variant, holiday } = event;
  const accent = variant.colors[2];
  const bits = useMemo(() => Array.from({ length: 18 }, (_, i) => ({
    e: variant.particles[i % variant.particles.length], left: (i * 53) % 100, delay: (i * 1.7) % 12, dur: 10 + ((i * 7) % 10), size: 14 + ((i * 5) % 14),
  })), [variant]);

  return (
    <div className="pointer-events-none fixed inset-0 z-[5] overflow-hidden" aria-hidden>
      {bits.map((b, i) => (
        <span key={i} className="holiday-fall absolute -top-10 opacity-70" style={{ left: `${b.left}%`, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, fontSize: b.size }}>{b.e}</span>
      ))}
      {holiday.decor === 'spooky' && (
        <>
          <div style={{ color: accent }} className="opacity-40"><Web className="absolute top-0 right-0 w-40 h-40 -scale-x-100" /><Web className="absolute bottom-0 left-56 w-32 h-32 -scale-y-100" /></div>
          <div className="absolute top-0 right-24 flex flex-col items-center holiday-dangle">
            <div className="w-px h-24" style={{ background: accent, opacity: 0.5 }} />
            <span className="text-2xl">🕷️</span>
          </div>
          <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 160px ${variant.colors[0]}` }} />
        </>
      )}
      {holiday.decor === 'hearts' && (
        <>
          <span className="absolute top-2 right-6 text-5xl holiday-beat">💘</span>
          <div className="absolute top-0 left-0 right-0 flex justify-around text-lg opacity-80">{Array.from({ length: 14 }).map((_, i) => <span key={i} className="holiday-dangle" style={{ animationDelay: `${i * 0.3}s` }}>{i % 2 ? '💗' : '🌹'}</span>)}</div>
          <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 140px ${accent}33` }} />
        </>
      )}
      {holiday.decor === 'fireworks' && Array.from({ length: 5 }).map((_, i) => (
        <span key={i} className="absolute holiday-burst rounded-full" style={{ left: `${15 + i * 18}%`, top: `${10 + (i % 3) * 12}%`, width: 120, height: 120, animationDelay: `${i * 0.9}s`, background: `radial-gradient(circle, ${i % 2 ? accent : variant.colors[1]} 0 3px, transparent 4px) 0 0 / 20px 20px` }} />
      ))}
      {holiday.decor === 'fireworks' && <div className="absolute top-0 left-0 right-0 h-2 flex">{['#ef4444', '#ffffff', '#3b82f6'].map((c, i) => <div key={i} className="flex-1 opacity-70" style={{ background: c }} />)}</div>}
      {holiday.decor === 'clover' && (
        <>
          <div className="absolute bottom-0 right-0 w-64 h-40 rounded-tl-full opacity-25" style={{ background: 'linear-gradient(90deg,#ef4444,#f97316,#facc15,#22c55e,#3b82f6,#8b5cf6)' }} />
          <span className="absolute bottom-3 right-6 text-4xl holiday-dangle">🪙</span>
          <span className="absolute top-3 left-60 text-3xl holiday-beat">🍀</span>
        </>
      )}
      {holiday.decor === 'eggs' && (
        <div className="absolute bottom-0 left-56 right-0 flex justify-around items-end text-3xl">
          {['🥚', '🌷', '🐰', '🥚', '🌼', '🐣', '🌷', '🥚'].map((e, i) => <span key={i} className="holiday-hop" style={{ animationDelay: `${i * 0.35}s` }}>{e}</span>)}
        </div>
      )}
      {holiday.decor === 'leaves' && (
        <>
          <div className="absolute top-0 right-0 text-4xl flex gap-1 -rotate-12 opacity-80">🍁🍂🍁</div>
          <span className="absolute bottom-3 right-6 text-5xl holiday-hop">🦃</span>
          <div className="absolute inset-0" style={{ boxShadow: `inset 0 0 150px ${variant.colors[1]}66` }} />
        </>
      )}
      {holiday.decor === 'snow' && (
        <>
          <div className="absolute bottom-0 left-0 right-0 h-6 opacity-80" style={{ background: 'radial-gradient(ellipse at 20% 100%, #fff 0 40%, transparent 41%), radial-gradient(ellipse at 60% 100%, #fff 0 45%, transparent 46%), radial-gradient(ellipse at 90% 100%, #fff 0 40%, transparent 41%)' }} />
          <span className="absolute bottom-3 right-8 text-5xl">⛄</span>
          <span className="absolute top-3 right-4 text-3xl holiday-dangle">🔔</span>
        </>
      )}
      {holiday.decor === 'snow' && (
        <div className="absolute top-0 left-0 right-0 flex justify-around">
          {Array.from({ length: 24 }).map((_, i) => <span key={i} className="holiday-twinkle w-2 h-3 rounded-full" style={{ background: ['#ef4444', '#22c55e', '#facc15', '#3b82f6'][i % 4], animationDelay: `${(i % 4) * 0.4}s` }} />)}
        </div>
      )}
    </div>
  );
}
