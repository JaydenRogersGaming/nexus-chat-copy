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
      {holiday.decor === 'snow' && (
        <div className="absolute top-0 left-0 right-0 flex justify-around">
          {Array.from({ length: 24 }).map((_, i) => <span key={i} className="holiday-twinkle w-2 h-3 rounded-full" style={{ background: ['#ef4444', '#22c55e', '#facc15', '#3b82f6'][i % 4], animationDelay: `${(i % 4) * 0.4}s` }} />)}
        </div>
      )}
    </div>
  );
}
