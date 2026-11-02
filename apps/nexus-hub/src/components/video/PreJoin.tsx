import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { Alert, AlertDescription } from '@project/components/ui/alert';
import VideoTile from './VideoTile';
import MediaControls from './MediaControls';
import { getMedia, stopStream } from '../../lib/media';

type Props = { code: string; name: string; onJoin: (s: MediaStream, mic: boolean, cam: boolean) => void; onBack: () => void; joining: boolean };

export default function PreJoin({ code, name, onJoin, onBack, joining }: Props) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioId, setAudioId] = useState<string>();
  const [videoId, setVideoId] = useState<string>();
  const [mic, setMic] = useState(true);
  const [cam, setCam] = useState(true);

  async function start(a?: string, v?: string) {
    setLoading(true);
    const r = await getMedia(a, v);
    setStream(prev => { stopStream(prev); return r.stream; });
    setError(r.error);
    setLoading(false);
    navigator.mediaDevices?.enumerateDevices().then(d => setDevices(d.filter(x => x.deviceId))).catch(() => {});
  }
  useEffect(() => { start(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { stream?.getAudioTracks().forEach(t => (t.enabled = mic)); }, [stream, mic]);
  useEffect(() => { stream?.getVideoTracks().forEach(t => (t.enabled = cam)); }, [stream, cam]);

  const hasAudio = !!stream?.getAudioTracks().length, hasVideo = !!stream?.getVideoTracks().length;
  const mics = devices.filter(d => d.kind === 'audioinput'), cams = devices.filter(d => d.kind === 'videoinput');

  return (
    <div className="max-w-4xl mx-auto w-full p-4 sm:p-6 grid gap-6 md:grid-cols-[1.4fr_1fr] items-start">
      <div className="space-y-4">
        <div className="aspect-video">
          {loading ? <div className="w-full h-full rounded-2xl bg-secondary flex flex-col items-center justify-center gap-2 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /><p className="text-sm">Asking for camera & microphone…</p></div>
            : <VideoTile stream={stream} name={`${name} (you)`} muted mirrored camOff={!cam || !hasVideo} micOff={!mic || !hasAudio} />}
        </div>
        <MediaControls micOn={mic && hasAudio} camOn={cam && hasVideo} onMic={() => setMic(m => !m)} onCam={() => setCam(c => !c)} disabledMic={!hasAudio} disabledCam={!hasVideo} />
      </div>
      <div className="space-y-4">
        <div><p className="text-sm text-muted-foreground">Ready to join</p><h2 className="text-2xl font-bold font-mono tracking-widest">{code}</h2></div>
        {error && <Alert variant="destructive"><AlertTriangle className="w-4 h-4" /><AlertDescription className="space-y-2"><p>{error}</p>
          <Button size="sm" variant="outline" onClick={() => start(audioId, videoId)}><RefreshCw className="w-3.5 h-3.5 mr-1.5" />Try again</Button></AlertDescription></Alert>}
        {mics.length > 0 && <DevicePick label="Microphone" items={mics} value={audioId ?? stream?.getAudioTracks()[0]?.getSettings().deviceId} onChange={id => { setAudioId(id); start(id, videoId); }} />}
        {cams.length > 0 && <DevicePick label="Camera" items={cams} value={videoId ?? stream?.getVideoTracks()[0]?.getSettings().deviceId} onChange={id => { setVideoId(id); start(audioId, id); }} />}
        <Button size="lg" className="w-full h-14 text-base" disabled={loading || joining || !stream} onClick={() => stream && onJoin(stream, mic, cam)}>
          {joining ? <Loader2 className="w-5 h-5 animate-spin" /> : (hasAudio || hasVideo) ? 'Join room' : 'Join without camera or mic'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => { stopStream(stream); onBack(); }}>Back</Button>
      </div>
    </div>
  );
}

function DevicePick({ label, items, value, onChange }: { label: string; items: MediaDeviceInfo[]; value?: string; onChange: (id: string) => void }) {
  return (
    <div className="space-y-1.5"><p className="text-sm font-medium">{label}</p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11"><SelectValue placeholder={`Choose ${label.toLowerCase()}`} /></SelectTrigger>
        <SelectContent>{items.map((d, i) => <SelectItem key={d.deviceId} value={d.deviceId}>{d.label || `${label} ${i + 1}`}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}
