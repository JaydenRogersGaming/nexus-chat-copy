import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Video, Plus, LogIn, Loader2, Copy, AlertTriangle } from 'lucide-react';
import { videoRooms, VideoRoomsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Alert, AlertDescription } from '@project/components/ui/alert';
import { useApp } from '../contexts/AppContext';
import PreJoin from '../components/video/PreJoin';
import InRoom, { copyInvite } from '../components/video/InRoom';

type Stage = 'home' | 'prejoin' | 'room';
type Ice = VideoRoomsOutputType['iceServers'];
const errMsg = (e: unknown) => (e as { userFacingMessage?: string })?.userFacingMessage || (e as Error)?.message || 'Something went wrong. Please try again.';
const NAME_KEY = 'nexus.video.name';

export default function VideoRoomsPage() {
  const { code: linkCode } = useParams();
  const navigate = useNavigate();
  const { profile } = useApp();
  const [name, setName] = useState(() => localStorage.getItem(NAME_KEY) || '');
  const [codeInput, setCodeInput] = useState(linkCode?.toUpperCase() || '');
  const [stage, setStage] = useState<Stage>('home');
  const [code, setCode] = useState('');
  const [ice, setIce] = useState<Ice>([]);
  const [busy, setBusy] = useState<'create' | 'join' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState(false);
  const [media, setMedia] = useState<{ stream: MediaStream; mic: boolean; cam: boolean } | null>(null);

  useEffect(() => { if (!name && profile?.name) setName(profile.name); }, [profile?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  const cleanName = name.trim().slice(0, 40);

  async function go(kind: 'create' | 'join') {
    if (!cleanName) { setError('Please enter your display name first.'); return; }
    const c = codeInput.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (kind === 'join' && !c) { setError('Enter the room code you were given.'); return; }
    setBusy(kind); setError(null);
    try {
      const r = await videoRooms(kind === 'create' ? { action: 'create', displayName: cleanName } : { action: 'check', code: c });
      localStorage.setItem(NAME_KEY, cleanName);
      setCode(r.code); setIce(r.iceServers); setJustCreated(kind === 'create'); setStage('prejoin');
      navigate(`/video/${r.code}`, { replace: true });
    } catch (e) { setError(errMsg(e)); }
    finally { setBusy(null); }
  }

  function leave(reason?: string) {
    setMedia(null); setStage('home'); setCode(''); setCodeInput('');
    navigate('/video', { replace: true });
    if (reason) setError(reason);
  }

  if (stage === 'room' && media) {
    return <InRoom code={code} name={cleanName} stream={media.stream} initialMic={media.mic} initialCam={media.cam} iceServers={ice} onLeave={leave} />;
  }

  if (stage === 'prejoin') {
    return (
      <div className="h-full overflow-y-auto">
        {justCreated && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4">
            <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[12rem]"><p className="text-sm text-muted-foreground">Your room code</p><p className="text-3xl font-mono font-black tracking-[0.3em]">{code}</p></div>
              <Button size="lg" onClick={() => copyInvite(code)}><Copy className="w-4 h-4 mr-2" />Copy invite link</Button>
            </div>
          </div>
        )}
        <PreJoin code={code} name={cleanName} joining={false} onBack={() => leave()}
          onJoin={(stream, mic, cam) => { setMedia({ stream, mic, cam }); setStage('room'); }} />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/15 flex items-center justify-center"><Video className="w-8 h-8 text-primary" /></div>
          <h1 className="text-3xl font-bold">Video Rooms</h1>
          <p className="text-muted-foreground">Start a call or join one with a code.</p>
        </div>
        {error && <Alert variant="destructive"><AlertTriangle className="w-4 h-4" /><AlertDescription>{error}</AlertDescription></Alert>}
        <div className="space-y-2">
          <Label htmlFor="vname" className="text-base">Display name</Label>
          <Input id="vname" className="h-12 text-base" value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="How others will see you" />
        </div>
        <Button size="lg" className="w-full h-14 text-base" disabled={!!busy} onClick={() => go('create')}>
          {busy === 'create' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Plus className="w-5 h-5 mr-2" />Create room</>}
        </Button>
        <div className="flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-border" />or join<div className="h-px flex-1 bg-border" /></div>
        <div className="flex gap-2">
          <Input className="h-14 text-lg font-mono tracking-widest uppercase" value={codeInput} maxLength={8} aria-label="Room code"
            onChange={e => setCodeInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && go('join')} placeholder="ROOM CODE" />
          <Button size="lg" variant="secondary" className="h-14 px-5" disabled={!!busy} onClick={() => go('join')}>
            {busy === 'join' ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogIn className="w-5 h-5 mr-2" />Join</>}
          </Button>
        </div>
        <p className="text-xs text-center text-muted-foreground">Rooms expire after 24 hours. We’ll ask for camera & mic access right before you join.</p>
      </div>
    </div>
  );
}
