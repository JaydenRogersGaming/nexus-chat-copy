export type MediaResult = { stream: MediaStream; error: string | null };

function explain(e: unknown): string {
  const name = (e as DOMException)?.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera and microphone access was blocked. Click the camera icon in your browser’s address bar, allow access, then try again.';
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'No camera or microphone was found. Plug one in, or join without it.';
  if (name === 'NotReadableError' || name === 'AbortError') return 'Your camera or microphone is being used by another app. Close it and try again.';
  return 'We couldn’t start your camera or microphone.';
}

/** Asks for camera + mic, falling back to whichever one is available. */
export async function getMedia(audioId?: string, videoId?: string): Promise<MediaResult> {
  if (!navigator.mediaDevices?.getUserMedia) return { stream: new MediaStream(), error: 'This browser doesn’t support video calls. Try Chrome, Safari, Edge or Firefox over HTTPS.' };
  const audio: MediaTrackConstraints | boolean = audioId ? { deviceId: { exact: audioId }, echoCancellation: true, noiseSuppression: true } : { echoCancellation: true, noiseSuppression: true };
  const video: MediaTrackConstraints | boolean = videoId ? { deviceId: { exact: videoId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } };
  try {
    return { stream: await navigator.mediaDevices.getUserMedia({ audio, video }), error: null };
  } catch (e) {
    if ((e as DOMException).name === 'NotAllowedError') return { stream: new MediaStream(), error: explain(e) };
    for (const c of [{ audio }, { video }]) {
      try { return { stream: await navigator.mediaDevices.getUserMedia(c), error: `${'audio' in c ? 'No camera available' : 'No microphone available'} — joining with ${'audio' in c ? 'audio' : 'video'} only.` }; }
      catch { /* try next */ }
    }
    return { stream: new MediaStream(), error: explain(e) };
  }
}

export const stopStream = (s: MediaStream | null) => s?.getTracks().forEach(t => t.stop());
