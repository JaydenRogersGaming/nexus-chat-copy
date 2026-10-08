import { useState, useEffect } from 'react';
import { Trophy, Gem } from 'lucide-react';
import TitleBadge from '../components/TitleBadge';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { OWNER_EMAIL } from '../lib/gameData';
import { cn } from '@project/components/lib/utils';

export default function LeaderboardPage() {
  const { profile } = useApp();
  const [users, setUsers] = useState<DB.UserProfile[]>([]);

  useEffect(() => {
    const load = () => {
      const all = DB.getAllUsers().sort((a, b) => b.gems - a.gems);
      // Owner always on top
      const ownerIdx = all.findIndex(u => u.email === OWNER_EMAIL || u.role === 'owner');
      if (ownerIdx > 0) {
        const [owner] = all.splice(ownerIdx, 1);
        all.unshift(owner);
      }
      setUsers(all);
    };
    load(); const t = setInterval(load, 5000); return () => clearInterval(t);
  }, []);

  const medals = ['🥇', '🥈', '🥉'];

  function getRoleLabel(u: DB.UserProfile) {
    if (u.role === 'co-owner') return 'Co-Owner';
    if (u.role === 'admin') return 'Admin';
    if (u.role === 'mod') return 'Mod';
    return null;
  }

  function isOwner(u: DB.UserProfile) {
    return u.email === OWNER_EMAIL || u.role === 'owner';
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 h-full overflow-y-auto">
      <div className="text-center mb-6">
        <Trophy className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
        <h1 className="text-2xl font-black">Gem Leaderboard</h1>
        <p className="text-muted-foreground text-sm">Compete to be the richest!</p>
      </div>

      {/* Top 3 Podium */}
      {users.length >= 3 && (
        <div className="flex items-end justify-center gap-4 mb-6">
          {[users[1], users[0], users[2]].map((u, i) => {
            const rank = i === 0 ? 2 : i === 1 ? 1 : 3;
            const heights = ['h-24', 'h-32', 'h-20'];
            return (
              <div key={u.email} className={cn('flex flex-col items-center gap-2', i === 1 && 'scale-110')}>
                <div className="text-2xl">{medals[rank-1]}</div>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-primary/40">
                  {u.profilePic ? <img src={u.profilePic} alt="" className="w-full h-full object-cover" /> : <span className="font-bold text-primary text-sm">{u.name[0]?.toUpperCase()}</span>}
                </div>
                <p className="text-xs font-semibold text-center max-w-16 truncate" style={{ color: u.nameColor }}>{u.name}</p>
                {isOwner(u) && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">👑 Owner</span>}
                <div className={cn('w-16 rounded-t-lg flex flex-col items-center justify-end pb-2', heights[i])} style={{ background: ['#c0c0c020','#ffd70020','#cd7f3220'][i], border: `1px solid ${['#c0c0c040','#ffd70040','#cd7f3240'][i]}` }}>
                  <span className="text-xs font-bold flex items-center gap-0.5"><Gem className="w-3 h-3 text-purple-400" />{u.gems >= 999999999 ? '∞' : u.gems >= 1000 ? `${(u.gems/1000).toFixed(1)}k` : u.gems}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full List (skip top 3 if podium shown) */}
      <div className="space-y-2">
        {users.map((u, i) => {
          if (users.length >= 3 && i < 3) return null;
          const isMe = u.email === profile?.email;
          const roleLabel = getRoleLabel(u);
          return (
            <div key={u.email} className={cn('flex items-center gap-3 p-3 rounded-xl border transition-colors', isMe ? 'border-primary/50 bg-primary/10' : 'border-border bg-card/50 hover:bg-secondary/30')}>
              <span className="text-sm font-bold w-8 text-center text-muted-foreground">{i < 3 ? medals[i] : `#${i+1}`}</span>
              <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
                {u.profilePic ? <img src={u.profilePic} alt="" className="w-full h-full object-cover" /> : <span className="font-semibold text-primary text-sm">{u.name[0]?.toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm font-semibold truncate" style={{ color: u.nameColor }}>{u.name}</span>
                  {isOwner(u) && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">👑 Owner</span>}
                  {!isOwner(u) && roleLabel && <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', roleLabel === 'Co-Owner' ? 'bg-orange-500/20 text-orange-400' : roleLabel === 'Admin' ? 'bg-red-500/20 text-red-400' : 'bg-blue-500/20 text-blue-400')}>{roleLabel}</span>}
                  {u.activeTitle && <TitleBadge title={u.activeTitle} effect={u.activeTitleEffect} color={u.activeTitleColor} />}
                </div>
                <p className="text-[10px] text-muted-foreground">{u.messageCount} messages</p>
              </div>
              <div className="flex items-center gap-1 font-bold text-sm text-purple-300 flex-shrink-0">
                <Gem className="w-4 h-4 text-purple-400" />{(u.gems ?? 0) >= 999999999 ? '∞' : (u.gems ?? 0).toLocaleString()}
              </div>
              {isMe && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary flex-shrink-0">YOU</span>}
            </div>
          );
        })}
        {users.length === 0 && <p className="text-center text-muted-foreground py-8">No users yet. Be the first!</p>}
      </div>
    </div>
  );
}
