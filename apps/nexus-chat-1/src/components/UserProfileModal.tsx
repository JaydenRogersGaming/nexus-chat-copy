import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Crown, ShieldCheck, Shield, Star, MessageSquare, Gem, Trophy, Dices, MessageCircle } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import TitleBadge from './TitleBadge';
import RoleChip from './RoleChip';
import ProBadge, { badgeLook } from './ProBadge';
import * as DB from '../lib/storage';
import { cn } from '@project/components/lib/utils';
import { useEffect, useState } from 'react';
import { roles as rolesApi } from 'zitejs/api';

type Props = { email: string | null; onClose: () => void; onStartDM?: (email: string) => void };

function getRoleBadge(role: string) {
  switch (role) {
    case 'owner':    return { label: 'Owner',    color: '#ffd700', icon: <Crown className="w-3 h-3" /> };
    case 'co-owner': return { label: 'Co-Owner', color: '#ff9900', icon: <Star className="w-3 h-3" /> };
    case 'admin':    return { label: 'Admin',    color: '#ff4444', icon: <ShieldCheck className="w-3 h-3" /> };
    case 'senior-mod': return { label: 'Senior Mod', color: '#a855f7', icon: <Shield className="w-3 h-3" /> };
    case 'mod':      return { label: 'Mod',      color: '#44aaff', icon: <Shield className="w-3 h-3" /> };
    case 'helper':   return { label: 'Helper',   color: '#22c55e', icon: <Shield className="w-3 h-3" /> };
    case 'vip':      return { label: 'VIP',      color: '#ec4899', icon: <Star className="w-3 h-3" /> };
    default:         return null;
  }
}

export default function UserProfileModal({ email, onClose, onStartDM }: Props) {
  const local = email ? DB.getUser(email) : null;
  const [remote, setRemote] = useState<DB.UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setRemote(null);
    if (!email) return;
    setLoading(true);
    rolesApi({ action: 'profile', email }).then(r => {
      const p = r.profile;
      if (!p) return;
      const base = DB.getUser(email);
      setRemote({
        ...(base || { bio: '', nameColor2: '', gems: 0, badges: [], messageCount: 0, gambleWins: 0 } as unknown as DB.UserProfile),
        email: p.email, name: p.name, profilePic: p.profilePic || base?.profilePic || '', nameColor: p.nameColor || base?.nameColor || '#e0e0ff',
        activeTitle: p.activeTitle, activeTitleColor: p.activeTitleColor, activeTitleEffect: p.activeTitleEffect,
        role: p.role as DB.UserProfile['role'], lastSeen: Math.max(p.lastSeen, base?.lastSeen || 0),
      });
    }).catch(() => {}).finally(() => setLoading(false));
  }, [email]);
  const user = remote || local;
  if (!email) return null;
  if (!user) return (
    <Dialog open onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader><DialogTitle>User Profile</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground text-center py-6">{loading ? 'Loading profile…' : "This person hasn't set up a profile yet."}</p>
      </DialogContent>
    </Dialog>
  );

  const roleBadge = getRoleBadge(user.role);
  const achievements = DB.getUserAchievements(user.email);
  const userBadges = user.badges || [];
  const isOnline = (Date.now() - (user.lastSeen || 0)) < 2 * 60 * 1000;

  return (
    <Dialog open={!!email} onOpenChange={v => !v && onClose()}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader><DialogTitle>User Profile</DialogTitle></DialogHeader>
        <div className="space-y-4">
          {/* Avatar + Name */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden border-2 border-border">
                {user.profilePic
                  ? <img src={user.profilePic} alt="" className="w-full h-full object-cover" />
                  : <span className="text-2xl font-bold text-primary">{user.name[0]?.toUpperCase()}</span>}
              </div>
              <div className={cn('absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-card', isOnline ? 'bg-green-500' : 'bg-muted-foreground/40')} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-lg truncate" style={
                user.nameColor2
                  ? { backgroundImage: `linear-gradient(90deg, ${user.nameColor}, ${user.nameColor2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
                  : { color: user.nameColor }
              }>{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {roleBadge && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded border"
                    style={{ color: roleBadge.color, borderColor: roleBadge.color + '55', backgroundColor: roleBadge.color + '18' }}>
                    {roleBadge.icon}{roleBadge.label}
                  </span>
                )}
                {user.customRole && (
                  <RoleChip name={user.customRole} color={user.customRoleColor} color2={user.customRoleColor2 || undefined} className="text-[10px]" />
                )}
                {(() => { const tag = DB.getUserTagForUser(user.email); return tag ? (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color: tag.color, backgroundColor: tag.color + '18', border: `1px solid ${tag.color}55` }}>
                    {tag.icon} {tag.name}
                  </span>
                ) : null; })()}
              </div>
            </div>
          </div>

          {/* Active Title */}
          {user.activeTitle && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">Title:</span>
              <TitleBadge title={user.activeTitle} effect={user.activeTitleEffect} color={user.activeTitleColor} />
            </div>
          )}

          {/* Bio */}
          <div className="bg-secondary/30 rounded-xl p-3">
            <p className="text-[10px] text-muted-foreground font-semibold mb-1">BIO</p>
            <p className="text-sm">{user.bio || 'No bio set'}</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { icon: <MessageSquare className="w-3.5 h-3.5" />, val: user.messageCount, label: 'Messages' },
              { icon: <Gem className="w-3.5 h-3.5" />, val: user.gems >= 999999999 ? '∞' : user.gems, label: 'Gems' },
              { icon: <Trophy className="w-3.5 h-3.5" />, val: achievements.length, label: 'Achievements' },
              { icon: <Dices className="w-3.5 h-3.5" />, val: user.gambleWins, label: 'Gamble Wins' },
            ].map((s, i) => (
              <div key={i} className="bg-secondary/20 rounded-lg p-2 text-center">
                <div className="flex justify-center mb-0.5 text-muted-foreground">{s.icon}</div>
                <p className="text-sm font-black">{(s.val ?? 0).toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Badges */}
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold mb-2">BADGES ({userBadges.length})</p>
            {userBadges.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No badges earned yet</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {userBadges.map(bId => {
                  const badge = badgeLook(bId);
                  if (!badge) return null;
                  return (
                    <span key={bId} className="inline-flex items-center gap-1.5 text-[10px] font-bold pl-1 pr-2 py-1 rounded-lg border border-border bg-secondary/30" title={badge.description}>
                      <ProBadge icon={badge.icon} color={badge.color} color2={badge.color2} size={22} />{badge.name}
                    </span>
                  );
                })}
              </div>
            )}
          </div>

          {/* Message button */}
          {onStartDM && (
            <Button className="w-full gap-2" onClick={() => { onStartDM(user.email); onClose(); }}>
              <MessageCircle className="w-4 h-4" /> Send Message
            </Button>
          )}

          {/* Member since */}
          <p className="text-[10px] text-muted-foreground text-center">
            {isOnline ? '🟢 Online now' : `Last seen ${new Date(user.lastSeen).toLocaleString()}`}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
