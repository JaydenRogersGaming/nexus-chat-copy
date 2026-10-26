export type StrokeLayer = { id: string; type: 'stroke'; points: [number, number][]; color: string; size: number; erase: boolean };
export type StickerLayer = { id: string; type: 'sticker'; kind: PartKind; x: number; y: number; scale: number; rot: number; color: string };
export type Layer = StrokeLayer | StickerLayer;

export type PartKind =
  | 'circle' | 'square' | 'triangle' | 'star' | 'heart'
  | 'eyes-dot' | 'eyes-happy' | 'eyes-heart' | 'eyes-wink' | 'eyes-big'
  | 'mouth-smile' | 'mouth-frown' | 'mouth-open' | 'mouth-tongue' | 'mouth-flat'
  | 'blush' | 'tear' | 'sunglasses' | 'eyebrows-angry' | 'sparkle';

export const CANVAS = 512;
const INK = '#664500'; // the warm brown used for features on real emoji faces

function shade(hex: string, amt: number) {
  const m = hex.replace('#', '').match(/^([0-9a-f]{6})$/i); if (!m) return hex;
  const n = parseInt(m[1], 16);
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt))));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

/** Glossy radial fill like Apple / Google emoji: bright top-left, deeper rim. */
function glossy(ctx: CanvasRenderingContext2D, color: string, r = 50) {
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, shade(color, 0.45)); g.addColorStop(0.55, color); g.addColorStop(1, shade(color, -0.22));
  ctx.fillStyle = g; ctx.fill();
}

export const SHAPES: { kind: PartKind; label: string; color: string }[] = [
  { kind: 'circle', label: 'Circle', color: '#ffd23f' },
  { kind: 'square', label: 'Square', color: '#4fc3f7' },
  { kind: 'triangle', label: 'Triangle', color: '#7ed957' },
  { kind: 'star', label: 'Star', color: '#ffb100' },
  { kind: 'heart', label: 'Heart', color: '#ff4f8b' },
];

export const PARTS: { group: string; items: { kind: PartKind; label: string; color: string }[] }[] = [
  { group: 'Eyes', items: [
    { kind: 'eyes-dot', label: 'Dots', color: INK }, { kind: 'eyes-big', label: 'Big', color: INK },
    { kind: 'eyes-happy', label: 'Happy', color: INK }, { kind: 'eyes-wink', label: 'Wink', color: INK },
    { kind: 'eyes-heart', label: 'Hearts', color: '#ff3b6b' },
  ] },
  { group: 'Mouths', items: [
    { kind: 'mouth-smile', label: 'Smile', color: INK }, { kind: 'mouth-frown', label: 'Frown', color: INK },
    { kind: 'mouth-open', label: 'Open', color: INK }, { kind: 'mouth-tongue', label: 'Tongue', color: INK },
    { kind: 'mouth-flat', label: 'Flat', color: INK },
  ] },
  { group: 'Extras', items: [
    { kind: 'blush', label: 'Blush', color: '#ff7aa8' }, { kind: 'tear', label: 'Tear', color: '#4fb3ff' },
    { kind: 'sunglasses', label: 'Shades', color: '#1d1b26' }, { kind: 'eyebrows-angry', label: 'Brows', color: INK },
    { kind: 'sparkle', label: 'Sparkle', color: '#ffd23f' },
  ] },
];

const uid = () => Math.random().toString(36).slice(2, 10);
export const sticker = (kind: PartKind, color: string, x = CANVAS / 2, y = CANVAS / 2, scale = 1.2): StickerLayer =>
  ({ id: uid(), type: 'sticker', kind, x, y, scale, rot: 0, color });
export const newId = uid;

const C = CANVAS / 2;
export const TEMPLATES: { name: string; emoji: string; build: () => Layer[] }[] = [
  { name: 'Blank', emoji: '⬜', build: () => [] },
  { name: 'Smiley', emoji: '😊', build: () => [sticker('circle', '#ffcc33', C, C, 4.2), sticker('eyes-dot', INK, C, C - 50, 1.6), sticker('mouth-smile', INK, C, C + 60, 1.6), sticker('blush', '#ff7aa8', C, C + 20, 2.2)] },
  { name: 'Cool', emoji: '😎', build: () => [sticker('circle', '#ffcc33', C, C, 4.2), sticker('sunglasses', '#1d1b26', C, C - 45, 2.2), sticker('mouth-smile', INK, C, C + 70, 1.4)] },
  { name: 'In love', emoji: '😍', build: () => [sticker('circle', '#ffcc33', C, C, 4.2), sticker('eyes-heart', '#ff3b6b', C, C - 45, 1.8), sticker('mouth-open', INK, C, C + 70, 1.3)] },
  { name: 'Sad', emoji: '😢', build: () => [sticker('circle', '#8fd3ff', C, C, 4.2), sticker('eyes-big', INK, C, C - 45, 1.6), sticker('tear', '#2f8fff', C + 60, C + 10, 0.9), sticker('mouth-frown', INK, C, C + 75, 1.5)] },
  { name: 'Angry', emoji: '😠', build: () => [sticker('circle', '#ff6b4a', C, C, 4.2), sticker('eyebrows-angry', INK, C, C - 75, 1.6), sticker('eyes-dot', INK, C, C - 35, 1.5), sticker('mouth-flat', INK, C, C + 70, 1.5)] },
];

function heartPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.6, cy - s * 0.1, cx - s * 0.7, cy - s * 1.3, cx, cy - s * 0.45);
  ctx.bezierCurveTo(cx + s * 0.7, cy - s * 1.3, cx + s * 1.6, cy - s * 0.1, cx, cy + s * 0.9);
  ctx.closePath();
}

function starPath(ctx: CanvasRenderingContext2D, r: number, inner: number, points = 5) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 ? inner : r, a = (Math.PI / points) * i - Math.PI / 2;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
}

/** Draws a part centred at 0,0 inside roughly a 100×100 box. */
export function drawPart(ctx: CanvasRenderingContext2D, kind: PartKind, color: string) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.fillStyle = color; ctx.strokeStyle = color;
  const outline = () => { glossy(ctx, color); ctx.lineWidth = 1.5; ctx.strokeStyle = shade(color, -0.35); ctx.stroke(); };
  switch (kind) {
    case 'circle': ctx.beginPath(); ctx.arc(0, 0, 50, 0, Math.PI * 2); outline(); break;
    case 'square': ctx.beginPath(); ctx.roundRect(-46, -46, 92, 92, 16); outline(); break;
    case 'triangle': ctx.beginPath(); ctx.moveTo(0, -48); ctx.lineTo(50, 42); ctx.lineTo(-50, 42); ctx.closePath(); outline(); break;
    case 'star': starPath(ctx, 52, 22); outline(); break;
    case 'heart': heartPath(ctx, 0, 0, 40); outline(); break;
    case 'eyes-dot': [-22, 22].forEach(x => { ctx.beginPath(); ctx.ellipse(x, 0, 7, 12, 0, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill(); ctx.beginPath(); ctx.ellipse(x - 2, -5, 2, 3, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fill(); }); break;
    case 'eyes-big': [-26, 26].forEach(x => {
      ctx.beginPath(); ctx.ellipse(x, 0, 18, 22, 0, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.stroke();
      ctx.beginPath(); ctx.arc(x + 3, 4, 9, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
      ctx.beginPath(); ctx.arc(x + 6, 0, 3, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    }); break;
    case 'eyes-happy': ctx.lineWidth = 7; [-24, 24].forEach(x => { ctx.beginPath(); ctx.arc(x, 8, 13, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }); break;
    case 'eyes-wink':
      ctx.beginPath(); ctx.ellipse(-24, 0, 8, 12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(36, 0); ctx.stroke(); break;
    case 'eyes-heart': [-26, 26].forEach(x => { ctx.save(); ctx.translate(x, 2); heartPath(ctx, 0, 0, 15); glossy(ctx, color, 18); ctx.restore(); }); break;
    case 'mouth-smile': ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, -20, 34, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke(); break;
    case 'mouth-frown': ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 30, 30, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); break;
    case 'mouth-flat': ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-26, 0); ctx.lineTo(26, 0); ctx.stroke(); break;
    case 'mouth-open':
      ctx.beginPath(); ctx.moveTo(-30, -8); ctx.quadraticCurveTo(0, -2, 30, -8); ctx.quadraticCurveTo(28, 26, 0, 26); ctx.quadraticCurveTo(-28, 26, -30, -8); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-26, -6); ctx.quadraticCurveTo(0, 0, 26, -6); ctx.lineTo(24, 2); ctx.quadraticCurveTo(0, 6, -24, 2); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 9, 13, 7, 0, 0, Math.PI * 2); ctx.fillStyle = '#ff6f91'; ctx.fill(); break;
    case 'mouth-tongue':
      ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, -20, 34, Math.PI * 0.2, Math.PI * 0.8); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(8, 18, 11, 14, 0, 0, Math.PI); ctx.fillStyle = '#ff6f91'; ctx.fill(); break;
    case 'blush': ctx.globalAlpha *= 0.55; [-34, 34].forEach(x => { ctx.beginPath(); ctx.ellipse(x, 0, 14, 8, 0, 0, Math.PI * 2); ctx.fill(); }); break;
    case 'tear':
      { const g = ctx.createLinearGradient(0, -24, 0, 20); g.addColorStop(0, shade(color, 0.4)); g.addColorStop(1, color); ctx.fillStyle = g; }
      ctx.beginPath(); ctx.moveTo(0, -24); ctx.bezierCurveTo(16, -2, 16, 20, 0, 20); ctx.bezierCurveTo(-16, 20, -16, -2, 0, -24); ctx.fill();
      ctx.beginPath(); ctx.arc(-4, 8, 3, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill(); break;
    case 'sunglasses':
      ctx.beginPath(); ctx.roundRect(-46, -12, 38, 26, 9); ctx.roundRect(8, -12, 38, 26, 9); ctx.fill();
      ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(10, -5); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.roundRect(-40, -8, 10, 6, 3); ctx.roundRect(14, -8, 10, 6, 3); ctx.fill(); break;
    case 'eyebrows-angry': ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(-40, -8); ctx.lineTo(-12, 6); ctx.moveTo(40, -8); ctx.lineTo(12, 6); ctx.stroke(); break;
    case 'sparkle': starPath(ctx, 30, 7, 4); ctx.fill(); break;
  }
}

export function renderLayers(ctx: CanvasRenderingContext2D, layers: Layer[], selectedId?: string | null) {
  ctx.clearRect(0, 0, CANVAS, CANVAS);
  for (const l of layers) {
    ctx.save();
    if (l.type === 'stroke') {
      ctx.globalCompositeOperation = l.erase ? 'destination-out' : 'source-over';
      ctx.strokeStyle = l.color; ctx.fillStyle = l.color; ctx.lineWidth = l.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (l.points.length === 1) { ctx.beginPath(); ctx.arc(l.points[0][0], l.points[0][1], l.size / 2, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.beginPath(); l.points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); }
    } else {
      ctx.translate(l.x, l.y); ctx.rotate(l.rot); ctx.scale(l.scale, l.scale);
      drawPart(ctx, l.kind, l.color);
      if (l.id === selectedId) {
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        ctx.setLineDash([8 / l.scale, 6 / l.scale]); ctx.lineWidth = 3 / l.scale; ctx.strokeStyle = '#ff4fa3';
        ctx.strokeRect(-56, -56, 112, 112);
      }
    }
    ctx.restore();
  }
}

export function hitTest(layers: Layer[], x: number, y: number): StickerLayer | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (l.type !== 'sticker') continue;
    const dx = x - l.x, dy = y - l.y;
    const lx = (dx * Math.cos(-l.rot) - dy * Math.sin(-l.rot)) / l.scale;
    const ly = (dx * Math.sin(-l.rot) + dy * Math.cos(-l.rot)) / l.scale;
    if (Math.abs(lx) <= 56 && Math.abs(ly) <= 56) return l;
  }
  return null;
}

// ── Personal emoji collection (shown in the chat emoji picker) ──
export type MyEmoji = { id: string; url: string; createdAt: number };
const KEY = 'nexus_my_emojis';
export const MY_EMOJIS_EVENT = 'nexus-my-emojis';
export function getMyEmojis(): MyEmoji[] { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } }
export function addMyEmoji(url: string) {
  localStorage.setItem(KEY, JSON.stringify([{ id: uid(), url, createdAt: Date.now() }, ...getMyEmojis()].slice(0, 100)));
  window.dispatchEvent(new Event(MY_EMOJIS_EVENT));
}
export function removeMyEmoji(id: string) {
  localStorage.setItem(KEY, JSON.stringify(getMyEmojis().filter(e => e.id !== id)));
  window.dispatchEvent(new Event(MY_EMOJIS_EVENT));
}
