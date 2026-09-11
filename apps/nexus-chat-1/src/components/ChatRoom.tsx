import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import MessageBubble from './MessageBubble';
import UserProfileModal from './UserProfileModal';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { OWNER_EMAIL, censorMessage } from '../lib/gameData';
import { checkBadges } from '../lib/badges';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';
import { messages as messagesApi } from 'zitejs/api';

type Props = { room: DB.ChatRoom; onStartDM?: (email: string) => void };

export default function ChatRoom({ room, onStartDM }: Props) {
  const { profile, addGems, checkAchievements, updateProfile } = useApp();
  const [messages, setMessages] = useState<DB.Message[]>([]);
  const [input, setInput] = useState('');
  const [typing, setTypingList] = useState<DB.TypingUser[]>([]);
  const [suggestions, setSuggestions] = useState<DB.UserProfile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [replyingTo, setReplyingTo] = useState<DB.Message | null>(null);
  const [viewProfileEmail, setViewProfileEmail] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const [muteInfo, setMuteInfo] = useState<DB.MuteRecord | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const isOwner = profile?.email === OWNER_EMAIL || profile?.role === 'owner';
  const isStaff = profile && ['owner', 'co-owner', 'admin', 'mod'].includes(profile.role);

  useEffect(() => {
    if (!profile) return;
    const check = () => setMuteInfo(DB.isUserMuted(profile.email));
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [profile?.email]);

  const load = useCallback(async () => {
    if (room.type === 'global') {
      // Load from database for global chat (cross-user)
      try {
        const res = await messagesApi({ action: 'getMessages', roomId: room.id, limit: 200 });
        if (res.messages) {
          const filtered = (res.messages as DB.Message[]).filter(m => !m.deleted || (profile?.role && ['owner','admin','mod'].includes(profile.role)));
          setMessages(filtered);
        }
      } catch { /* fallback to local */ 
        setMessages(DB.getMessages(room.id).filter(m => !m.deleted || (profile?.role && ['owner','admin','mod'].includes(profile.role))));
      }
    } else {
      setMessages(DB.getMessages(room.id).filter(m => !m.deleted || (profile?.role && ['owner','admin','mod'].includes(profile.role))));
    }
    setTypingList(DB.getTyping(room.id).filter(t => t.email !== profile?.email));
  }, [room.id, room.type, profile?.email, profile?.role]);

  useEffect(() => { load(); const t = setInterval(load, 2000); return () => clearInterval(t); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const stopTyping = useDebouncedCallback(() => {
    if (profile) { DB.clearTyping(room.id, profile.email); isTypingRef.current = false; }
  }, 3000);

  function handleInputChange(val: string) {
    setInput(val);
    if (!profile) return;
    if (!isTypingRef.current) { DB.setTyping(room.id, profile.email, profile.name); isTypingRef.current = true; }
    else DB.setTyping(room.id, profile.email, profile.name);
    stopTyping();

    // Command suggestions
    if (val.startsWith('/ban ') && isStaff) {
      const query = val.slice(5).toLowerCase().trim();
      const users = DB.getAllUsers().filter(u => u.email !== profile.email && u.email !== OWNER_EMAIL && (!query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)));
      setSuggestions(users.slice(0, 5)); setShowSuggestions(true);
    } else if (val.startsWith('/unban ') && isStaff) {
      const query = val.slice(7).toLowerCase().trim();
      const users = DB.getBans().filter(b => !query || b.email.toLowerCase().includes(query)).map(b => DB.getUser(b.email)).filter(Boolean) as DB.UserProfile[];
      setSuggestions(users.slice(0, 5)); setShowSuggestions(true);
    } else if ((val.startsWith('/mute ') || val.startsWith('/unmute ') || val.startsWith('/give ') || val.startsWith('/infgems ') || val.startsWith('/setstreak ') || val.startsWith('/setquest ')) && isStaff) {
      const parts = val.split(' ');
      const query = (parts[1] || '').toLowerCase();
      const users = DB.getAllUsers().filter(u => !query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
      setSuggestions(users.slice(0, 5)); setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }

  function selectSuggestion(user: DB.UserProfile) {
    const cmd = input.split(' ')[0];
    setInput(`${cmd} ${user.email}`);
    setShowSuggestions(false);
  }

  function handleCommand(text: string): boolean {
    if (!profile) return false;

    // Owner/staff commands
    if (text.startsWith('/ban ') && isStaff) {
      const target = text.slice(5).trim();
      if (!target) { toast.error('Usage: /ban email'); return true; }
      if (target === OWNER_EMAIL) { toast.error("Can't ban the owner!"); return true; }
      if (target === profile.email) { toast.error("Can't ban yourself!"); return true; }
      const targetUser = DB.getUser(target);
      if (!targetUser) { toast.error('User not found'); return true; }
      DB.banUser(target, profile.name, `Banned by ${profile.name}`);
      toast.success(`🔨 Banned ${targetUser.name}`);
      const sysMsg: DB.Message = { id: crypto.randomUUID(), chatRoomId: room.id, senderEmail: 'system', senderName: '⚠️ System', content: `${targetUser.name} has been banned by ${profile.name}.`, reactions: {}, deleted: false, senderTitle: '', senderTitleEffect: '', senderTitleColor: '', senderNameColor: '#ff4444', timestamp: Date.now() };
      DB.addMessage(sysMsg); load(); return true;
    }

    if (text.startsWith('/unban ') && isStaff) {
      const target = text.slice(7).trim();
      if (!target) { toast.error('Usage: /unban email'); return true; }
      DB.unbanUser(target); toast.success(`Unbanned ${target}`); return true;
    }

    if (text.startsWith('/mute ') && isStaff) {
      const parts = text.slice(6).trim().split(' ');
      const target = parts[0];
      const mins = parseInt(parts[1]) || 10;
      if (!target) { toast.error('Usage: /mute email [minutes]'); return true; }
      DB.muteUser(target, mins * 60 * 1000, `Muted by ${profile.name}`);
      toast.success(`🔇 Muted ${target} for ${mins} min`); return true;
    }

    if (text.startsWith('/unmute ') && isStaff) {
      const target = text.slice(8).trim();
      if (!target) { toast.error('Usage: /unmute email'); return true; }
      DB.unmuteUser(target); toast.success(`🔊 Unmuted ${target}`); return true;
    }

    // Self unmute (owner only)
    if (text === '/unmute' && isOwner) {
      DB.unmuteUser(profile.email); setMuteInfo(null);
      toast.success('🔊 You unmuted yourself'); return true;
    }

    if (text === '/clearchat' && isStaff) {
      if (profile.role !== 'owner' && profile.role !== 'co-owner') { toast.error('Only owner/co-owner can clear chat'); return true; }
      DB.clearChat(room.id); load(); toast.success('Chat cleared!'); return true;
    }

    if (text.startsWith('/give ') && isOwner) {
      const parts = text.slice(6).trim().split(' ');
      const target = parts[0];
      const amount = parseInt(parts[1]) || 100;
      if (!target) { toast.error('Usage: /give email amount'); return true; }
      const targetUser = DB.getUser(target);
      if (!targetUser) { toast.error('User not found'); return true; }
      DB.saveUser({ ...targetUser, gems: targetUser.gems + amount });
      toast.success(`💎 Gave ${amount} gems to ${targetUser.name}`); return true;
    }

    if (text.startsWith('/infgems') && isOwner) {
      const parts = text.trim().split(' ');
      const target = parts[1]?.trim() || profile.email;
      const targetUser = DB.getUser(target);
      if (!targetUser) { toast.error('User not found'); return true; }
      DB.saveUser({ ...targetUser, gems: 999999999 });
      toast.success(`♾️ Gave infinite gems to ${targetUser.name}`); return true;
    }

    if (text.startsWith('/setrole ') && isOwner) {
      const parts = text.slice(9).trim().split(' ');
      const target = parts[0];
      const role = parts[1] as DB.UserProfile['role'];
      if (!target || !role) { toast.error('Usage: /setrole email role'); return true; }
      const targetUser = DB.getUser(target);
      if (!targetUser) { toast.error('User not found'); return true; }
      DB.saveUser({ ...targetUser, role }); toast.success(`Set ${targetUser.name} as ${role}`); return true;
    }

    if (text === '/online') {
      const online = DB.getOnlineUsers();
      toast.info(`🟢 ${online.length} online: ${online.map(u => u.name).join(', ')}`); return true;
    }

    // /setstreak email amount
    if (text.startsWith('/setstreak ') && isOwner) {
      const parts = text.slice(11).trim().split(' ');
      const target = parts[0];
      const amount = parseInt(parts[1]);
      if (!target || isNaN(amount)) { toast.error('Usage: /setstreak email amount'); return true; }
      const targetUser = DB.getUser(target);
      if (!targetUser) { toast.error('User not found'); return true; }
      DB.saveUser({ ...targetUser, streak: Math.max(0, amount), lastStreakDate: new Date().toISOString().slice(0, 10) });
      toast.success(`🔥 Set ${targetUser.name}'s streak to ${amount}`); return true;
    }

    // /setquest email questId amount
    if (text.startsWith('/setquest ') && isOwner) {
      const parts = text.slice(10).trim().split(' ');
      const target = parts[0];
      const questId = parts[1];
      const amount = parseInt(parts[2]);
      if (!target || !questId || isNaN(amount)) { toast.error('Usage: /setquest email questId amount'); return true; }
      const targetUser = DB.getUser(target);
      if (!targetUser) { toast.error('User not found'); return true; }
      const validQuests = DB.DAILY_QUESTS.map(q => q.id);
      if (!validQuests.includes(questId)) { toast.error(`Invalid quest. Valid: ${validQuests.join(', ')}`); return true; }
      const qp = DB.getDailyQuestProgress(target);
      qp.progress[questId] = Math.max(0, amount);
      DB.saveDailyQuestProgress(target, qp);
      toast.success(`📋 Set ${targetUser.name}'s ${questId} progress to ${amount}`); return true;
    }

    return false;
  }

  async function send() {
    if (!input.trim() || !profile) return;

    // Cooldown check (3 seconds between messages, owner bypasses)
    if (!isOwner && cooldown > 0) {
      toast.error(`⏳ Wait ${cooldown}s before sending again`);
      return;
    }

    // Check mute (owner can bypass)
    if (!isOwner) {
      const muteCheck = DB.isUserMuted(profile.email);
      if (muteCheck) {
        const remaining = Math.ceil((muteCheck.until - Date.now()) / 60000);
        toast.error(`🔇 Muted for ${remaining} more min (${muteCheck.reason})`);
        return;
      }
    }

    const text = input.trim();

    if (text.startsWith('/') && handleCommand(text)) { setInput(''); return; }

    const { censored, hadProfanity } = censorMessage(text);

    if (hadProfanity && !isOwner) {
      DB.muteUser(profile.email, 10 * 60 * 1000, 'Profanity');
      DB.addCussReport({ id: crypto.randomUUID(), email: profile.email, name: profile.name, originalMessage: text, censoredMessage: censored, chatRoomId: room.id, timestamp: Date.now(), resolved: false });
      toast.error('🔇 Profanity detected. Muted for 10 minutes.');
    }

    const msg: DB.Message = {
      id: crypto.randomUUID(), chatRoomId: room.id,
      senderEmail: profile.email, senderName: profile.name,
      content: censored, reactions: {}, deleted: false,
      senderTitle: profile.activeTitle, senderTitleEffect: profile.activeTitleEffect,
      senderTitleColor: profile.activeTitleColor, senderNameColor: profile.nameColor,
      replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content.slice(0, 80) } : undefined,
      timestamp: Date.now(),
    };
    DB.addMessage(msg);

    // Also save to database for global chat (cross-user)
    if (room.type === 'global') {
      messagesApi({
        action: 'send', roomId: room.id, content: censored,
        senderName: profile.name, senderTitle: profile.activeTitle,
        senderTitleColor: profile.activeTitleColor, senderTitleEffect: profile.activeTitleEffect,
        senderNameColor: profile.nameColor,
        replyTo: replyingTo ? { id: replyingTo.id, senderName: replyingTo.senderName, content: replyingTo.content.slice(0, 80) } : undefined,
      }).catch(() => {});
    }
    DB.clearTyping(room.id, profile.email);
    const newCount = profile.messageCount + 1;
    DB.saveUser({ ...profile, messageCount: newCount });
    addGems(5);
    updateProfile({ messageCount: newCount });

    if (room.type === 'dm') {
      const other = room.members.find(m => m !== profile.email);
      if (other) {
        DB.addNotification({ id: crypto.randomUUID(), recipientEmail: other, senderName: profile.name, messagePreview: text.slice(0, 60), chatRoomId: room.id, roomName: room.name, read: false, timestamp: Date.now() });
        const otherProfile = DB.getUser(other);
        if (otherProfile) DB.saveUser({ ...otherProfile, dmCount: otherProfile.dmCount + 1 });
      }
      DB.saveUser({ ...profile, dmCount: profile.dmCount + 1, messageCount: newCount });
    }

    setInput('');
    setReplyingTo(null);
    setShowSuggestions(false);

    // Start 3s cooldown
    if (!isOwner) {
      setCooldown(3);
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
      cooldownTimer.current = setInterval(() => {
        setCooldown(prev => { if (prev <= 1) { clearInterval(cooldownTimer.current!); cooldownTimer.current = null; return 0; } return prev - 1; });
      }, 1000);
    }

    // Track daily quest progress
    DB.incrementQuestProgress(profile.email, 'send_5');
    DB.incrementQuestProgress(profile.email, 'send_20');
    DB.incrementQuestProgress(profile.email, 'send_50');

    setTimeout(() => { checkAchievements(); checkBadges(profile.email); load(); }, 100);
  }

  const ALL_COMMANDS: { cmd: string; desc: string; level: 'all' | 'staff' | 'owner' }[] = [
    { cmd: '/ban', desc: 'Ban a user', level: 'staff' },
    { cmd: '/unban', desc: 'Unban a user', level: 'staff' },
    { cmd: '/mute', desc: 'Mute user [email] [mins]', level: 'staff' },
    { cmd: '/unmute', desc: 'Unmute a user (or self)', level: 'staff' },
    { cmd: '/clearchat', desc: 'Clear chat (owner/co-owner)', level: 'staff' },
    { cmd: '/give', desc: 'Give gems [email] [amount]', level: 'owner' },
    { cmd: '/infgems', desc: 'Give ∞ gems [email]', level: 'owner' },
    { cmd: '/setrole', desc: 'Set role [email] [role]', level: 'owner' },
    { cmd: '/setstreak', desc: 'Set streak [email] [amount]', level: 'owner' },
    { cmd: '/setquest', desc: 'Set quest progress [email] [questId] [amount]', level: 'owner' },
    { cmd: '/online', desc: 'Show online users', level: 'all' },
  ];

  const visibleCommands = ALL_COMMANDS.filter(c => {
    if (c.level === 'owner') return isOwner;
    if (c.level === 'staff') return isStaff;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-card/50">
        <div>
          <h2 className="font-bold text-sm">{room.name}</h2>
          <p className="text-[10px] text-muted-foreground">{room.type === 'global' ? 'Everyone is here' : room.type === 'dm' ? 'Direct Message' : 'Group Chat'}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3.5 h-3.5" />{room.type === 'global' ? DB.getAllUsers().length : room.members.length}</div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.length === 0 && <p className="text-center text-muted-foreground text-sm mt-8">No messages yet. Say something! 👋</p>}
        {messages.map(m => (
          <MessageBubble
            key={m.id}
            msg={m}
            onDeleted={load}
            onReactionUpdate={load}
            onReply={(msg) => setReplyingTo(msg)}
            onViewProfile={(email) => setViewProfileEmail(email)}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      {typing.length > 0 && (
        <div className="px-4 py-1.5 flex items-center gap-2">
          <span className="flex gap-0.5">
            {[0,1,2].map(i => (
              <span key={i} className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
          <span className="text-xs text-muted-foreground italic">
            <span className="text-foreground/70 font-medium">{typing.map(t => t.name).join(', ')}</span>
            {' '}{typing.length === 1 ? 'is' : 'are'} typing…
          </span>
        </div>
      )}
      {muteInfo && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/30 flex items-center gap-2">
          <span className="text-sm">🔇</span>
          <span className="text-xs text-destructive font-semibold">
            Muted for {Math.max(1, Math.ceil((muteInfo.until - Date.now()) / 60000))} min — {muteInfo.reason}
          </span>
          {isOwner && <button onClick={() => { DB.unmuteUser(profile!.email); setMuteInfo(null); toast.success('Unmuted!'); }} className="text-[10px] text-primary font-bold ml-auto hover:underline">Unmute self</button>}
        </div>
      )}

      {/* Reply bar */}
      {replyingTo && (
        <div className="px-4 py-2 bg-secondary/30 border-t border-border flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-primary font-semibold">Replying to {replyingTo.senderName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{replyingTo.content}</p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 rounded hover:bg-secondary"><X className="w-3.5 h-3.5 text-muted-foreground" /></button>
        </div>
      )}

      <div className="relative px-4 py-3 border-t border-border">
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold border-b border-border bg-secondary/30">Select user</div>
            {suggestions.map(u => (
              <button key={u.email} onClick={() => selectSuggestion(u)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary/50 transition-colors text-left">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs overflow-hidden">
                  {u.profilePic ? <img src={u.profilePic} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-primary">{(u.name[0] || '?').toUpperCase()}</span>}
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: u.nameColor }}>{u.name}</p>
                  <p className="text-[10px] text-muted-foreground">{u.email}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {input === '/' && (
          <div className="absolute bottom-full left-4 right-4 mb-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold border-b border-border bg-secondary/30">Available Commands</div>
            {visibleCommands.map(c => (
              <button key={c.cmd} onClick={() => setInput(c.cmd + ' ')}
                className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 transition-colors text-left">
                <span className="text-xs font-mono font-bold text-primary">{c.cmd}</span>
                <span className="text-xs text-muted-foreground">{c.desc}</span>
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input value={input} onChange={e => handleInputChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={replyingTo ? `Reply to ${replyingTo.senderName}…` : `Message ${room.name}…`} className="flex-1 bg-secondary border-border" />
          <Button onClick={send} size="icon" disabled={!input.trim() || (!isOwner && cooldown > 0)}>
            {cooldown > 0 && !isOwner ? <span className="text-xs font-bold">{cooldown}</span> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal email={viewProfileEmail} onClose={() => setViewProfileEmail(null)} onStartDM={onStartDM} />
    </div>
  );
}
