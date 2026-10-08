import { useState } from 'react';
import { Trash2, Smile, Crown, ShieldCheck, Shield, Star, Reply } from 'lucide-react';
import TitleBadge from './TitleBadge';
import { useApp } from '../contexts/AppContext';
import { EMOJI_LIST, OWNER_EMAIL } from '../lib/gameData';
import * as DB from '../lib/storage';
import { cn } from '@project/components/lib/utils';

type Props = {
  msg: DB.Message;
  onDeleted: () => void;
  onReactionUpdate: () => void;
  onReply?: (msg: DB.Message) => void;
  onViewProfile?: (email: string) => void;
};

type RoleInfo = { label: string; color: string; icon: React.ReactNode; rank: number };

function getRoleInfo(role: string): RoleInfo | null {
  switch (role) {
    case 'owner':     return { label: 'Owner',     color: '#ffd700', icon: <Crown className="w-2.5 h-2.5" />,       rank: 4 };
    case 'co-owner':  return { label: 'Co-Owner',  color: '#ff9900', icon: <Star className="w-2.5 h-2.5" />,        rank: 3 };
    case 'admin':     return { label: 'Admin',     color: '#ff4444', icon: <ShieldCheck className="w-2.5 h-2.5" />, rank: 2 };
    case 'mod':       return { label: 'Mod',       color: '#44aaff', icon: <Shield className="w-2.5 h-2.5" />,      rank: 1 };
    default:          return null;
  }
}

function getDeleteStyle(deleterRole: string): string {
  switch (deleterRole) {
    case 'owner':    return 'text-yellow-400 hover:bg-yellow-400/20';
    case 'co-owner': return 'text-orange-400 hover:bg-orange-400/20';
    case 'admin':    return 'text-destructive hover:bg-destructive/20';
    case 'mod':      return 'text-blue-400 hover:bg-blue-400/20';
    default:         return 'text-muted-foreground hover:bg-muted/30';
  }
}

function canDeleteMsg(deleter: DB.UserProfile, msgSenderEmail: string, msgSenderRole: string): boolean {
  const deleterRank = getRoleInfo(deleter.role)?.rank ?? 0;
  const senderRank  = getRoleInfo(msgSenderRole)?.rank ?? 0;
  if (deleter.email === msgSenderEmail) return true;
  if (deleterRank === 0) return false;
  if (deleterRank >= 3) return true;
  if (deleterRank === 2) return senderRank < 2;
  if (deleterRank === 1) return senderRank === 0;
  return false;
}

export default function MessageBubble({ msg, onDeleted, onReactionUpdate, onReply, onViewProfile }: Props) {
  const { profile } = useApp();
  const [showEmoji, setShowEmoji] = useState(false);
  const isOwn = profile?.email === msg.senderEmail;

  const senderUser = DB.getUser(msg.senderEmail);
  const senderRole = senderUser?.role ?? 'user';
  const senderRoleInfo = getRoleInfo(senderRole);
  const senderCustomRole = senderUser?.customRole;
  const senderCustomRoleColor = senderUser?.customRoleColor || '#aaaaaa';
  const displayTitle = senderUser?.activeTitle || msg.senderTitle;
  const displayTitleEffect = senderUser?.activeTitle ? senderUser.activeTitleEffect : msg.senderTitleEffect;
  const displayTitleColor = senderUser?.activeTitle ? senderUser.activeTitleColor : msg.senderTitleColor;

  const canDelete = profile ? canDeleteMsg(profile, msg.senderEmail, senderRole) : false;
  const deleteStyle = profile ? getDeleteStyle(profile.role) : '';

  if (msg.deleted) return null;

  function handleReact(emoji: string) {
    if (!profile) return;
    const reactions = { ...msg.reactions };
    if (!reactions[emoji]) reactions[emoji] = [];
    const idx = reactions[emoji].indexOf(profile.email);
    if (idx !== -1) reactions[emoji].splice(idx, 1);
    else reactions[emoji].push(profile.email);
    DB.updateMessage(msg.chatRoomId, msg.id, { reactions });
    onReactionUpdate();
    DB.saveUser({ ...profile, reactionCount: profile.reactionCount + 1 });
    setShowEmoji(false);
  }

  const reactionEntries = Object.entries(msg.reactions).filter(([, u]) => u.length > 0);

  return (
    <div className={cn('flex mb-3 group', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && (
        <button onClick={() => onViewProfile?.(msg.senderEmail)}
          className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm mr-2 flex-shrink-0 mt-1 overflow-hidden border border-border hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer">
          {senderUser?.profilePic
            ? <img src={senderUser.profilePic} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).src=''; (e.target as HTMLImageElement).replaceWith(Object.assign(document.createElement('span'), { className: 'text-xs font-bold text-primary', textContent: (msg.senderName[0] || '?').toUpperCase() })); }} />
            : <span className="text-xs font-bold text-primary">{(msg.senderName[0] || '?').toUpperCase()}</span>}
        </button>
      )}

      <div className={cn('max-w-[70%] flex flex-col gap-1', isOwn ? 'items-end' : 'items-start')}>
        {/* Sender header */}
        <div className={cn('flex items-center gap-1.5 flex-wrap px-1', isOwn ? 'flex-row-reverse' : 'flex-row')}>
          <button onClick={() => onViewProfile?.(msg.senderEmail)} className="text-xs font-semibold hover:underline cursor-pointer" style={
            senderUser?.nameColor2
              ? { backgroundImage: `linear-gradient(90deg, ${senderUser.nameColor}, ${senderUser.nameColor2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
              : { color: msg.senderNameColor || '#e0e0ff' }
          }>{msg.senderName}</button>
          {msg.senderEmail === OWNER_EMAIL && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ color: '#ffd700', backgroundColor: '#ffd70022', border: '1px solid #ffd70055' }}>
              <Crown className="w-2.5 h-2.5" />OWNER
            </span>
          )}
          {msg.senderEmail !== OWNER_EMAIL && senderCustomRole && (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded border"
              style={{ color: senderCustomRoleColor, borderColor: senderCustomRoleColor + '55', backgroundColor: senderCustomRoleColor + '18' }}>
              {senderCustomRole}
            </span>
          )}
          {(() => { const tag = DB.getUserTagForUser(msg.senderEmail); return tag ? (
            <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ color: tag.color, backgroundColor: tag.color + '18', border: `1px solid ${tag.color}55` }}>
              {tag.icon} {tag.name}
            </span>
          ) : null; })()}
          {msg.senderEmail !== OWNER_EMAIL && displayTitle && <TitleBadge title={displayTitle} effect={displayTitleEffect} color={displayTitleColor} />}
        </div>

        {/* Reply reference */}
        {msg.replyTo && (
          <div className={cn('text-[10px] px-2.5 py-1.5 rounded-lg border-l-2 max-w-full', isOwn ? 'bg-primary/10 border-primary/50' : 'bg-secondary/50 border-muted-foreground/30')}>
            <span className="font-semibold text-muted-foreground">{msg.replyTo.senderName}</span>
            <p className="text-muted-foreground truncate">{msg.replyTo.content}</p>
          </div>
        )}

        {/* Bubble */}
        <div className={cn('msg-bubble px-4 py-2.5 text-sm relative', isOwn ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-secondary text-foreground rounded-bl-sm')}>
          {msg.content}
          {/* Action buttons */}
          <div className="absolute -top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5 bg-card border border-border rounded-lg px-1 py-0.5 shadow-lg">
            <button onClick={() => onReply?.(msg)} className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Reply">
              <Reply className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowEmoji(v => !v)} className="p-0.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <Smile className="w-3.5 h-3.5" />
            </button>
            {canDelete && (
              <button
                onClick={() => { DB.updateMessage(msg.chatRoomId, msg.id, { deleted: true }); onDeleted(); }}
                className={cn('p-0.5 rounded transition-colors', deleteStyle)}
                title={isOwn ? 'Delete your message' : `Delete (${profile?.role})`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {showEmoji && (
            <div className="absolute top-8 right-0 z-50 bg-card border border-border rounded-xl p-2 flex flex-wrap gap-1 w-48 shadow-xl">
              {EMOJI_LIST.map(e => <button key={e} onClick={() => handleReact(e)} className="text-lg hover:scale-125 transition-transform">{e}</button>)}
            </div>
          )}
        </div>

        {/* Reactions */}
        {reactionEntries.length > 0 && (
          <div className="flex flex-wrap gap-1 px-1">
            {reactionEntries.map(([emoji, users]) => (
              <button key={emoji} onClick={() => handleReact(emoji)} className={cn('text-xs flex items-center gap-0.5 rounded-full px-2 py-0.5 border transition-colors', users.includes(profile?.email || '') ? 'bg-primary/30 border-primary/50' : 'bg-secondary border-border hover:bg-secondary/80')}>
                {emoji} <span className="text-muted-foreground">{users.length}</span>
              </button>
            ))}
          </div>
        )}
        <span className="text-[10px] text-muted-foreground px-1">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </div>
  );
}
