import { useEffect, useRef } from 'react';

export type PlayState = { playing: boolean; positionSeconds: number; syncedAtMs: number };
export const targetTime = (s: PlayState) => s.playing ? s.positionSeconds + (Date.now() - s.syncedAtMs) / 1000 : s.positionSeconds;

const ytId = (url: string) => /(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/.exec(url)?.[1] || null;
const isFile = (url: string) => /\.(mp4|webm|ogg|m3u8)(\?|$)/i.test(url);

/** Plays the party's video and keeps it in sync with the host's play/pause/seek state. */
export default function PartyPlayer({ url, state, isHost, nonce = 0 }: { url: string; state: PlayState; isHost: boolean; nonce?: number }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const yt = ytId(url);
  const key = `${state.playing}-${state.positionSeconds}-${state.syncedAtMs}-${nonce}`;

  useEffect(() => {
    const t = targetTime(state);
    if (yt && frame.current) {
      const send = (func: string, args: unknown[] = []) => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
      send('seekTo', [t, true]);
      send(state.playing ? 'playVideo' : 'pauseVideo');
    }
    const v = video.current;
    if (v) {
      if (Math.abs(v.currentTime - t) > 1.5) v.currentTime = t;
      if (state.playing) v.play().catch(() => {}); else v.pause();
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // Video files: gently correct drift every few seconds
  useEffect(() => {
    if (!isFile(url)) return;
    const i = setInterval(() => { const v = video.current; if (v && state.playing && Math.abs(v.currentTime - targetTime(state)) > 2.5) v.currentTime = targetTime(state); }, 4000);
    return () => clearInterval(i);
  }, [url, key]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
      {yt ? (
        <iframe ref={frame} title="Watch party" className="h-full w-full" allow="autoplay; encrypted-media; fullscreen"
          src={`https://www.youtube.com/embed/${yt}?enablejsapi=1&controls=${isHost ? 1 : 0}&rel=0&playsinline=1&origin=${encodeURIComponent(window.location.origin)}`}
          onLoad={() => setTimeout(() => { frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'seekTo', args: [targetTime(state), true] }), '*'); if (state.playing) frame.current?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func: 'playVideo', args: [] }), '*'); }, 800)} />
      ) : isFile(url) ? (
        <video ref={video} src={url} className="h-full w-full" playsInline controls={false} />
      ) : (
        <iframe title="Watch party stream" src={url} className="h-full w-full" allow="autoplay; fullscreen" />
      )}
      {!isHost && <div className="absolute inset-0" aria-hidden />}
    </div>
  );
}
