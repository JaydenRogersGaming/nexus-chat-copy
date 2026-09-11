import { useState, useEffect } from 'react';
import { Circle } from 'lucide-react';
import TitleBadge from './TitleBadge';
import { cn } from '@project/components/lib/utils';
import { presence } from 'zitejs/api';

const ROLE_COLOR: Record<string, string> = {
  owner: 'text-yellow-400',
  'co-owner': 'text-orange-400',
  admin: 'text-red-400',
  mod: 'text-blue-400',
  user: 'text-muted-foreground',
};

type OnlineUser = {
  email: string;
  displayName: string;
  profilePic: string;
  nameColor: string;
  activeTitle: string;
  activeTitleColor: string;
  activeTitleEffect: string;
  role: string;
};

type Props = { currentUserEmail?: string };

export default function OnlinePanel({ currentUserEmail }: Props) {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);

  useEffect(() => {
    let mounted = true;
    const update = async () => {
      try {
        const res = await presence({ action: 'getOnline' });
        if (mounted && res.online) setOnlineUsers(res.online);
      } catch { /* ignore */ }
    };
    update();
    const t = setInterval(update, 5000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  return (
    <div className="w-44 flex-shrink-0 bg-card/40 border-l border-border flex flex-col overflow-y-auto">
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Circle className="w-2.5 h-2.5 fill-green-400 text-green-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-green-400">Online</span>
          <span className="ml-auto text-[11px] text-muted-foreground font-semibold">{onlineUsers.length}</span>
        </div>
      </div>

      <div className="flex-1 p-2 space-y-0.5">
        {onlineUsers.map(u => (
          <div key={u.email} className={cn('flex items-center gap-2 px-2 py-1.5 rounded-lg', u.email === currentUserEmail && 'bg-primary/10')}>
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {u.profilePic
                  ? <img src={u.profilePic} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[10px] font-bold text-primary">{u.displayName[0]?.toUpperCase()}</span>}
              </div>
              <Circle className="w-2 h-2 fill-green-400 text-green-400 absolute -bottom-0.5 -right-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: u.nameColor || undefined }}>
                {u.displayName}{u.email === currentUserEmail && <span className="text-muted-foreground font-normal"> (you)</span>}
              </p>
              {u.activeTitle ? (
                <TitleBadge title={u.activeTitle} effect={u.activeTitleEffect} color={u.activeTitleColor} />
              ) : (
                <span className={cn('text-[9px] font-bold', ROLE_COLOR[u.role] || 'text-muted-foreground')}>
                  {u.role === 'co-owner' ? 'Co-Owner' : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                </span>
              )}
            </div>
          </div>
        ))}
        {onlineUsers.length === 0 && (
          <p className="text-[10px] text-muted-foreground text-center py-4">No one online</p>
        )}
      </div>
    </div>
  );
}
