import { useEffect, useRef } from 'react';
import { MicOff, VideoOff } from 'lucide-react';
import { cn } from '@project/components/lib/utils';

type Props = { stream: MediaStream | null; name: string; muted?: boolean; mirrored?: boolean; camOff?: boolean; micOff?: boolean; status?: string };

export default function VideoTile({ stream, name, muted, mirrored, camOff, micOff, status }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => { if (ref.current && ref.current.srcObject !== stream) ref.current.srcObject = stream; }, [stream]);
  const showVideo = !!stream && !camOff;
  return (
    <div className="relative w-full h-full min-h-[160px] rounded-2xl overflow-hidden bg-secondary border border-border shadow-lg">
      <video ref={ref} autoPlay playsInline muted={muted} className={cn('w-full h-full object-cover', mirrored && '-scale-x-100', !showVideo && 'invisible')} />
      {!showVideo && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/20 flex items-center justify-center text-2xl sm:text-3xl font-bold text-primary">{name[0]?.toUpperCase() || '?'}</div>
          {camOff ? <VideoOff className="w-4 h-4 text-muted-foreground" /> : <p className="text-xs text-muted-foreground">{status || 'Connecting…'}</p>}
        </div>
      )}
      <div className="absolute left-2 bottom-2 flex items-center gap-1.5 bg-black/60 text-white text-xs sm:text-sm px-2.5 py-1 rounded-full backdrop-blur">
        {micOff && <MicOff className="w-3.5 h-3.5 text-red-400" aria-label="Muted" />}
        <span className="truncate max-w-[10rem]">{name}</span>
      </div>
    </div>
  );
}
