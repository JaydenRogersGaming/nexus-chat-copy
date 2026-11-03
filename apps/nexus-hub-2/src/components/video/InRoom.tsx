import { useEffect, useState } from 'react';
import { Copy, Users, Wifi, WifiOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@project/components/ui/button';
import { cn } from '@project/components/lib/utils';
import VideoTile from './VideoTile';
import MediaControls from './MediaControls';
import { useVideoRoom } from '../../hooks/useVideoRoom';
import { stopStream } from '../../lib/media';

type Ice = { urls: string | string[]; username?: string; credential?: string };
type Props = { code: string; name: string; stream: MediaStream; initialMic: boolean; initialCam: boolean; iceServers: Ice[]; onLeave: (reason?: string) => void };

export const inviteLink = (code: string) => `${window.location.origin}/video/${code}`;
export async function copyInvite(code: string) {
  try { await navigator.clipboard.writeText(inviteLink(code)); toast.success('Invite link copied'); }
  catch { toast.error('Could not copy — share the code instead: ' + code); }
}

export default function InRoom({ code, name, stream, initialMic, initialCam, iceServers, onLeave }: Props) {
  const [mic, setMic] = useState(initialMic);
  const [cam, setCam] = useState(initialCam);
  const { remotes, status } = useVideoRoom(code, name, stream, iceServers, reason => { stopStream(stream); onLeave(reason); });

  useEffect(() => { stream.getAudioTracks().forEach(t => (t.enabled = mic)); }, [stream, mic]);
  useEffect(() => { stream.getVideoTracks().forEach(t => (t.enabled = cam)); }, [stream, cam]);
  useEffect(() => () => stopStream(stream), [stream]);

  const hasAudio = stream.getAudioTracks().length > 0, hasVideo = stream.getVideoTracks().length > 0;
  const total = remotes.length + 1;
  const cols = total === 1 ? 'grid-cols-1' : total === 2 ? 'grid-cols-1 sm:grid-cols-2' : total <= 4 ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-3';

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-5 py-3 border-b border-border">
        <span className="font-mono font-bold tracking-widest text-lg">{code}</span>
        <Button size="sm" variant="outline" onClick={() => copyInvite(code)}><Copy className="w-4 h-4 mr-1.5" />Copy invite link</Button>
        <span className="flex items-center gap-1 text-sm text-muted-foreground"><Users className="w-4 h-4" />{total}</span>
        <StatusPill status={status} />
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        <div className={cn('grid gap-3 sm:gap-4 h-full auto-rows-fr', cols)}>
          <VideoTile stream={stream} name={`${name} (you)`} muted mirrored camOff={!cam || !hasVideo} micOff={!mic || !hasAudio} />
          {remotes.map(r => <VideoTile key={r.peerId} stream={r.stream} name={r.name} status={r.state === 'failed' ? 'Connection failed — retrying…' : 'Connecting…'} />)}
        </div>
        {remotes.length === 0 && status !== 'connecting' && (
          <div className="text-center mt-4 text-muted-foreground">
            <p className="font-medium text-foreground">You’re the only one here</p>
            <p className="text-sm">Share the code <span className="font-mono font-bold">{code}</span> or the invite link to bring people in.</p>
          </div>
        )}
      </div>
      <div className="py-4 border-t border-border bg-card/60">
        <MediaControls micOn={mic && hasAudio} camOn={cam && hasVideo} disabledMic={!hasAudio} disabledCam={!hasVideo}
          onMic={() => setMic(m => !m)} onCam={() => setCam(c => !c)} onLeave={() => { stopStream(stream); onLeave(); }} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, React.ReactNode, string]> = {
    connecting: ['Connecting…', <Loader2 key="i" className="w-3.5 h-3.5 animate-spin" />, 'bg-secondary text-muted-foreground'],
    connected: ['Connected', <Wifi key="i" className="w-3.5 h-3.5" />, 'bg-emerald-500/15 text-emerald-400'],
    reconnecting: ['Reconnecting…', <WifiOff key="i" className="w-3.5 h-3.5" />, 'bg-amber-500/15 text-amber-400'],
    ended: ['Room ended', <WifiOff key="i" className="w-3.5 h-3.5" />, 'bg-destructive/15 text-destructive'],
  };
  const [label, icon, cls] = map[status] ?? map.connecting;
  return <span role="status" className={cn('ml-auto flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full', cls)}>{icon}{label}</span>;
}
