import { useEffect, useState } from 'react';

/** Live "2d 4h 13m 09s" countdown that ticks every second. */
export default function Countdown({ to, onDone }: { to: Date; onDone?: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = to.getTime() - now;
  useEffect(() => { if (ms <= 0) onDone?.(); }, [ms <= 0]); // eslint-disable-line react-hooks/exhaustive-deps
  if (ms <= 0) return <>now</>;
  const s = Math.floor(ms / 1000), d = Math.floor(s / 86400), h = Math.floor(s / 3600) % 24, m = Math.floor(s / 60) % 60, sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return <span className="tabular-nums">{d > 0 && `${d}d `}{p(h)}h {p(m)}m {p(sec)}s</span>;
}
