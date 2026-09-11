import { useEffect, useRef } from 'react';

type Props = {
  color?: string;
  speed?: number;
};

export default function MatrixRain({ color = '#00ff00', speed = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let w = 0, h = 0;
    let columns = 0;
    const drops: number[] = [];
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const fontSize = 14;

    function resize() {
      const parent = canvas!.parentElement;
      w = canvas!.width = parent?.clientWidth || window.innerWidth;
      h = canvas!.height = parent?.clientHeight || window.innerHeight;
      columns = Math.floor(w / fontSize);
      while (drops.length < columns) drops.push(Math.random() * -100);
      drops.length = columns;
    }

    resize();
    window.addEventListener('resize', resize);

    let last = 0;
    const interval = 50 / speed; // ms per frame, faster = lower

    function draw(ts: number) {
      if (ts - last < interval) {
        animId = requestAnimationFrame(draw);
        return;
      }
      last = ts;

      ctx!.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx!.fillRect(0, 0, w, h);
      ctx!.fillStyle = color;
      ctx!.font = `${fontSize}px monospace`;

      for (let i = 0; i < columns; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        const y = drops[i] * fontSize;
        // Head char brighter
        ctx!.fillStyle = color;
        ctx!.globalAlpha = 1;
        ctx!.fillText(char, i * fontSize, y);

        // Trail with lower opacity
        ctx!.globalAlpha = 0.4;
        const prevChar = chars[Math.floor(Math.random() * chars.length)];
        ctx!.fillText(prevChar, i * fontSize, y - fontSize);
        ctx!.globalAlpha = 1;

        if (y > h && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i] += 1;
      }

      animId = requestAnimationFrame(draw);
    }

    animId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [color, speed]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-0 w-full h-full"
      style={{ background: '#000' }}
    />
  );
}
