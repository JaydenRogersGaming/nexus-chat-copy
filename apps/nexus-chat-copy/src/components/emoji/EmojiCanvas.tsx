import { useEffect, useRef } from 'react';
import { CANVAS, renderLayers, hitTest, newId, type Layer, type StrokeLayer, type StickerLayer } from '../../lib/emojiParts';

export type Tool = 'pencil' | 'eraser' | 'move';

type Props = {
  layers: Layer[];
  tool: Tool; color: string; size: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  commit: (l: Layer[]) => void; preview: (l: Layer[]) => void; finish: (before: Layer[]) => void;
};

export default function EmojiCanvas({ layers, tool, color, size, selectedId, onSelect, commit, preview, finish }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef<StrokeLayer | null>(null);
  const drag = useRef<{ id: string; dx: number; dy: number; before: Layer[] } | null>(null);
  const layersRef = useRef(layers);
  layersRef.current = layers;

  const draw = () => {
    const ctx = ref.current?.getContext('2d');
    if (ctx) renderLayers(ctx, live.current ? [...layersRef.current, live.current] : layersRef.current, tool === 'move' ? selectedId : null);
  };
  useEffect(draw); // eslint-disable-line react-hooks/exhaustive-deps

  const pos = (e: React.PointerEvent): [number, number] => {
    const r = ref.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * CANVAS, ((e.clientY - r.top) / r.height) * CANVAS];
  };

  function down(e: React.PointerEvent) {
    ref.current!.setPointerCapture(e.pointerId);
    const [x, y] = pos(e);
    if (tool === 'move') {
      const hit = hitTest(layers, x, y);
      onSelect(hit?.id ?? null);
      if (hit) drag.current = { id: hit.id, dx: x - hit.x, dy: y - hit.y, before: layers };
      return;
    }
    live.current = { id: newId(), type: 'stroke', points: [[x, y]], color, size, erase: tool === 'eraser' };
    draw();
  }

  function move(e: React.PointerEvent) {
    const [x, y] = pos(e);
    if (live.current) { live.current.points.push([x, y]); draw(); return; }
    const d = drag.current;
    if (d) preview(layersRef.current.map(l => (l.id === d.id ? { ...(l as StickerLayer), x: x - d.dx, y: y - d.dy } : l)));
  }

  function up() {
    if (live.current) { const s = live.current; live.current = null; commit([...layersRef.current, s]); }
    if (drag.current) { finish(drag.current.before); drag.current = null; }
  }

  return (
    <canvas
      ref={ref} width={CANVAS} height={CANVAS}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
      className="emoji-checker w-full max-w-[min(100%,70vh)] aspect-square rounded-3xl border-4 border-primary/40 shadow-xl touch-none mx-auto block"
      style={{ cursor: tool === 'move' ? 'grab' : 'crosshair' }}
    />
  );
}
