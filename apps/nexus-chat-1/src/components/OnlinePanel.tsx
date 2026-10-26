import { useState, useEffect } from 'react';
import { Circle } from 'lucide-react';
import * as DB from '../lib/storage';
import TitleBadge from './TitleBadge';
import UserProfileModal from './UserProfileModal';
import { cn } from '@project/components/lib/utils';
import { usePresence } from '../hooks/useOnlineUsers';

const ROLE_COLOR: Record<string, string> = {
  owner: 'text-yellow-400',
  'co-owner': 'text-orange-400',
  admin: 'text-red-400',
  'senior-mod': 'text-purple-400',
  mod: 'text-blue-400',
  helper: 'text-green-400',
  vip: 'text-pink-400',
  user: 'text-muted-foreground',
};

const STAFF = ['owner', 'co-owner', 'admin', 'senior-mod', 'mod', 'helper'];

type Props = { roomId: string; currentUserEmail?: string };

export default function OnlinePanel({ roomId, currentUserEmail }: Props) {
  const { online: onlineUsers, everyone } = usePresence();
  const [typing, setTyping] = useState<DB.TypingUser[]>([]);
  const [viewEmail, setViewEmail] = useState<string | null>(null);
  const onlineSet = new Set(onlineUsers.map(u => u.email));
  const merged = [...onlineUsers, ...everyone.filter(u => !onlineSet.has(u.email))]
    .sort((a, b) => Number(onlineSet.has(b.email)) - Number(onlineSet.has(a.email)) || a.name.localeCompare(b.name));
  const groups = [
    { label: 'Staff', users: merged.filter(u => STAFF.includes(u.role)) },
    { label: 'Users', users: merged.filter(u => !STAFF.includes(u.role)) },
  ].filter(g => g.users.length > 0);

  useEffect(() => {
    const update = () => setTyping(DB.getTyping(roomId).filter(t => t.email !== currentUserEmail));
    update();
    const t = setInterval(update, 2000);
    return () => clearInterval(t);
  }, [roomId, currentUserEmail]);

  return (
    <div className="w-44 flex-shrink-0 bg-card/40 border-l border-border flex flex-col overflow-y-auto">
      {/* Online header */}
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Circle className="w-2.5 h-2.5 fill-green-400 text-green-400" />
          <span className="text-[11px] font-bold uppercase tracking-widest text-green-400">Online</span>
          <span className="ml-auto text-[11px] text-muted-foreground font-semibold">{onlineUsers.length}</span>
        </div>
        <p className="text-[9px] text-muted-foreground/60 mt-1 leading-tight">Online first, then offline members</p>
      </div>

      {/* Typing indicator */}
      {typing.length > 0 && (
        <div className="px-3 py-2 border-b border-border bg-primary/5">
          <p className="text-[10px] text-primary font-semibold mb-1">✍️ Typing…</p>
          {typing.map(t => (
            <div key={t.email} className="flex items-center gap-1.5 py-0.5">
              <span className="text-[10px] text-foreground/80 truncate">{t.name}</span>
              <span className="flex gap-0.5 ml-auto">
                {[0,1,2].map(i => (
                  <span key={i} className="w-1 h-1 rounded-full bg-primary animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* User list */}
      <div className="flex-1 p-2 space-y-0.5">
        {groups.map(g => (
          <div key={g.label} className="mb-2">
            <p className="px-2 pt-1 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{g.label} — {g.users.length}</p>
        {g.users.map(u => { const online = onlineSet.has(u.email); return (
          <button key={u.email} onClick={() => setViewEmail(u.email)} className={cn('w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-secondary/60 transition-colors', u.email === currentUserEmail && 'bg-primary/10', !online && 'opacity-50')}>
            <div className="relative flex-shrink-0">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {u.profilePic
                  ? <img src={u.profilePic} alt="" className="w-full h-full object-cover" />
                  : <span className="text-[10px] font-bold text-primary">{u.name[0]?.toUpperCase()}</span>}
              </div>
              <Circle className={cn('w-2 h-2 absolute -bottom-0.5 -right-0.5', online ? 'fill-green-400 text-green-400' : 'fill-muted-foreground text-muted-foreground')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate leading-tight" style={{ color: u.nameColor || undefined }}>
                {u.name}{u.email === currentUserEmail && <span className="text-muted-foreground font-normal"> (you)</span>}
              </p>
              {u.activeTitle ? (
                <TitleBadge title={u.activeTitle} effect={u.activeTitleEffect} color={u.activeTitleColor} />
              ) : (
                <span className={cn('text-[9px] font-bold', ROLE_COLOR[u.role] || 'text-muted-foreground')}>
                  {u.role === 'co-owner' ? 'Co-Owner' : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                </span>
              )}
            </div>
          </button>
        ); })}
          </div>
        ))}
      </div>
      <UserProfileModal email={viewEmail} onClose={() => setViewEmail(null)} />
    </div>
  );
}
