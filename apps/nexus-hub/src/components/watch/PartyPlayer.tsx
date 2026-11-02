import { useEffect, useRef, useState } from 'react';
import { Maximize } from 'lucide-react';

export type PlayState = { playing: boolean; positionSeconds: number; syncedAtMs: number };
export const targetTime = (s: PlayState) => s.playing ? s.positionSeconds + (Date.now() - s.syncedAtMs) / 1000 : s.positionSeconds;

const ytId = (url: string) => /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(url)?.[1] || null;
const isFile = (url: string) => /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url);

/**
 * Live-stream style player: only the host controls play/pause/seek. Viewers always join at the
 * host's current position (never from the beginning) and are kept in sync automatically.
 */
export default function PartyPlayer({ url, state, isHost, nonce = 0 }: { url: string; state: PlayState; isHost: boolean; nonce?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const yt = ytId(url);
  const key = `${state.playing}-${state.positionSeconds}-${state.syncedAtMs}-${nonce}`;
  // Start position is baked into the embed URL once, so the video opens at the live point instead of 0:00.
  const [startAt] = useState(() => Math.floor(targetTime(state)));

  const ytSend = (func: string, args: unknown[] = []) =>
    frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');

  const syncNow = (force: boolean) => {
    const s = stateRef.current; const t = targetTime(s);
    if (yt) { ytSend('seekTo', [t, true]); ytSend(s.playing ? 'playVideo' : 'pauseVideo'); }
    const v = video.current;
    if (v && v.readyState >= 1) {
      if (force || Math.abs(v.currentTime - t) > 2) v.currentTime = t;
      if (s.playing) v.play().catch(() => {}); else v.pause();
    }
  };

  // Host changed play/pause/seek (or viewer pressed Sync) → follow it.
  useEffect(() => { syncNow(true); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Viewers: keep correcting drift so everyone stays on the same moment.
  useEffect(() => {
    if (isHost) return;
    const i = setInterval(() => { if (stateRef.current.playing) syncNow(false); }, 5000);
    return () => clearInterval(i);
  }, [isHost, url]); // eslint-disable-line react-hooks/exhaustive-deps

  const fullscreen = () => box.current?.requestFullscreen?.().catch(() => {});
  const canSync = !!yt || isFile(url);

  return (
    <div ref={box} className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
      {yt ? (
        <iframe ref={frame} title="Theater" className="h-full w-full" allow="autoplay; encrypted-media; fullscreen"
          src={`https://www.youtube.com/embed/${yt}?enablejsapi=1&autoplay=1&start=${startAt}&controls=${isHost ? 1 : 0}&disablekb=${isHost ? 0 : 1}&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`}
          onLoad={() => { setTimeout(() => syncNow(true), 1000); setTimeout(() => syncNow(true), 3000); }} />
      ) : isFile(url) ? (
        <video ref={video} src={url} className="h-full w-full" playsInline controls={false} preload="auto"
          onLoadedMetadata={() => syncNow(true)} />
      ) : (
        <iframe title="Theater stream" src={url} className="h-full w-full" allow="autoplay; fullscreen" />
      )}
      {/* Viewers can't click the player (so only the host can pause), but can still go fullscreen. */}
      {!isHost && canSync && <div className="absolute inset-0" aria-hidden />}
      {!isHost && (
        <button onClick={fullscreen} aria-label="Fullscreen"
          className="absolute bottom-2 right-2 z-10 rounded-md bg-background/70 p-1.5 text-foreground hover:bg-background">
          <Maximize className="h-4 w-4" />
        </button>
      )}
      {!isHost && <span className="absolute left-2 top-2 z-10 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground">● LIVE</span>}
    </div>
  );
}
