import { useEffect, useRef } from 'react';
import { drawPart, type PartKind } from '../../lib/emojiParts';

/** Small preview tile for a shape or emoji part. */
export default function PartThumb({ kind, color, label, onClick }: { kind: PartKind; color: string; label: string; onClick: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, 64, 64); ctx.save(); ctx.translate(32, 32); ctx.scale(0.5, 0.5); drawPart(ctx, kind, color); ctx.restore();
  }, [kind, color]);
  return (
    <button onClick={onClick} title={label} className="group flex flex-col items-center gap-0.5 rounded-xl p-1.5 bg-secondary/40 hover:bg-primary/15 hover:-translate-y-0.5 transition-all">
      <canvas ref={ref} width={64} height={64} className="w-10 h-10" />
      <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-foreground">{label}</span>
    </button>
  );
}
