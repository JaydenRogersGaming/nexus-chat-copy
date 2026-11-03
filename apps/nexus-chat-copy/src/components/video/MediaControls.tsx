import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { cn } from '@project/components/lib/utils';

type Props = { micOn: boolean; camOn: boolean; onMic: () => void; onCam: () => void; onLeave?: () => void; disabledMic?: boolean; disabledCam?: boolean };

function Ctl({ on, onClick, label, children, danger, disabled }: { on?: boolean; onClick: () => void; label: string; children: React.ReactNode; danger?: boolean; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label}
      className={cn('h-14 w-14 sm:h-16 sm:w-16 rounded-full flex items-center justify-center transition-all shadow-md disabled:opacity-40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring',
        danger ? 'bg-destructive text-destructive-foreground hover:brightness-110' : on ? 'bg-secondary text-foreground hover:bg-secondary/80' : 'bg-red-500/90 text-white hover:bg-red-500')}>
      {children}
    </button>
  );
}

export default function MediaControls({ micOn, camOn, onMic, onCam, onLeave, disabledMic, disabledCam }: Props) {
  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4">
      <Ctl on={micOn} onClick={onMic} disabled={disabledMic} label={micOn ? 'Mute microphone' : 'Unmute microphone'}>{micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}</Ctl>
      <Ctl on={camOn} onClick={onCam} disabled={disabledCam} label={camOn ? 'Turn camera off' : 'Turn camera on'}>{camOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}</Ctl>
      {onLeave && <Ctl danger onClick={onLeave} label="Leave room"><PhoneOff className="w-6 h-6" /></Ctl>}
    </div>
  );
}
