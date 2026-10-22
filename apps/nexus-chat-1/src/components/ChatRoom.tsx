import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Users, X } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import MessageBubble from './MessageBubble';
import EmojiGifPicker from './EmojiGifPicker';
import UserProfileModal from './UserProfileModal';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { OWNER_EMAIL, censorMessage } from '../lib/gameData';
import { checkBadges } from '../lib/badges';
import { TYPING_STYLES } from '../lib/cosmetics';
import { useDebouncedCallback } from 'use-debounce';
import { toast } from 'sonner';
import { messages as messagesApi, chatBot, typing as typingApi, roles as rolesApi, RolesOutputType } from 'zitejs/api';

const ROLE_OPTIONS = [
  { id: 'user', label: '👤 User', desc: 'Regular member' },
  { id: 'vip', label: '💖 VIP', desc: 'Special supporter badge' },
  { id: 'helper', label: '🟢 Helper', desc: 'Helps new people out' },
  { id: 'mod', label: '🔵 Mod', desc: 'Delete user messages, mute' },
  { id: 'senior-mod', label: '🟣 Senior Mod', desc: 'Lead moderator' },
  { id: 'admin', label: '🔴 Admin', desc: 'Titles, bugs, delete mod messages' },
  { id: 'co-owner', label: '🟠 Co-Owner', desc: 'Almost everything' },
  { id: 'owner', label: '🟡 Owner', desc: 'Full control' },
] as const;

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
  const isStaff = !!profile && (isOwner || ['owner', 'co-owner', 'admin', 'senior-mod', 'mod'].includes(profile.role));
  const canMute = isStaff || DB.hasPerm(profile, 'mute');
  const canBan = isOwner; // banning is owner-only
  const canClear = isOwner || profile?.role === 'co-owner' || DB.hasPerm(profile, 'clearchat');
  const canGiveRole = isOwner || profile?.role === 'co-owner' || DB.hasPerm(profile, 'giverole');
  const [signedUp, setSignedUp] = useState<RolesOutputType['users']>([]);
  const signedUpLoaded = useRef(false);
  const loadSignedUp = () => rolesApi({ action: 'list' }).then(r => setSignedUp(r.users)).catch(() => {});

  useEffect(() => {
    if (!profile) return;
    const check = () => setMuteInfo(DB.isUserMuted(profile.email));
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [profile?.email]);

  // Messages sent locally that the server hasn't returned yet — kept visible so they never flicker away
  const pendingRef = useRef<Map<string, DB.Message>>(new Map());
  const loadingRef = useRef(false);
  const sigRef = useRef('');
  const lastTypingPing = useRef(0);

  const load = useCallback(async () => {
    typingApi({ action: 'list', roomId: room.id }).then(({ typing: list }) => {
      const next = list.filter(t => t.email !== profile?.email).map(t => ({ ...t, lastActive: Date.now() }));
      setTypingList(prev => prev.length === next.length && prev.every((p, i) => p.email === next[i].email && p.style === next[i].style) ? prev : next);
    }).catch(() => {});
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      const { messages: remote } = await messagesApi({ action: 'getMessages', roomId: room.id, limit: 200 });
      const canSeeDeleted = profile?.role && ['owner','admin','mod'].includes(profile.role);
      const ids = new Set(remote.map(m => m.id));
      pendingRef.current.forEach((_, id) => { if (ids.has(id)) pendingRef.current.delete(id); });
      const merged = [...remote.filter(m => !m.deleted || canSeeDeleted), ...pendingRef.current.values()];
      const sig = merged.map(m => `${m.id}:${m.deleted ? 1 : 0}:${JSON.stringify(m.reactions)}`).join('|');
      if (sig !== sigRef.current) { sigRef.current = sig; setMessages(merged); }
    } catch { /* keep current messages on a failed poll */ }
    finally { loadingRef.current = false; }
  }, [room.id, profile?.email, profile?.role]);

  useEffect(() => { load(); const t = setInterval(load, 2000); return () => clearInterval(t); }, [load]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  const stopTyping = useDebouncedCallback(() => {
    if (profile) { DB.clearTyping(room.id, profile.email); isTypingRef.current = false; lastTypingPing.current = 0; typingApi({ action: 'stop', roomId: room.id, email: profile.email }).catch(() => {}); }
  }, 3000);

  function handleInputChange(val: string) {
    setInput(val);
    if (!profile) return;
    // Throttle typing pings so every keystroke doesn't hit storage
    const now = Date.now();
    if (!isTypingRef.current || now - lastTypingPing.current > 1500) {
      DB.setTyping(room.id, profile.email, profile.name);
      if (now - lastTypingPing.current > 2500) typingApi({ action: 'start', roomId: room.id, email: profile.email, name: profile.name, style: DB.getEquipped(profile.email).typing }).catch(() => {});
      isTypingRef.current = true; lastTypingPing.current = now;
    }
    stopTyping();

    // Command suggestions (only when it looks like a command)
    if (!val.startsWith('/')) { if (showSuggestions) setShowSuggestions(false); return; }
    if (val.startsWith('/setrole') && isOwner && !signedUpLoaded.current) { signedUpLoaded.current = true; loadSignedUp(); }
    if (val.startsWith('/ban ') && canBan) {
      const query = val.slice(5).toLowerCase().trim();
      const users = DB.getAllUsers().filter(u => u.email !== profile.email && u.email !== OWNER_EMAIL && (!query || u.name.toLowerCase().includes(query) || u.email.toLowerCase().includes(query)));
      setSuggestions(users.slice(0, 5)); setShowSuggestions(true);
    } else if (val.startsWith('/unban ') && canBan) {
      const query = val.slice(7).toLowerCase().trim();
      const users = DB.getBans().filter(b => !query || b.email.toLowerCase().includes(query)).map(b => DB.getUser(b.email)).filter(Boolean) as DB.UserProfile[];
      setSuggestions(users.slice(0, 5)); setShowSuggestions(true);
    } else if ((val.startsWith('/mute ') || val.startsWith('/unmute ') || val.startsWith('/give ') || val.startsWith('/infgems ') || val.startsWith('/setstreak ') || val.startsWith('/setquest ') || val.startsWith('/giverole ')) && (isStaff || canMute || canGiveRole)) {
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
    if (text.startsWith('/ban ') && canBan) {
      const target = text.slice(5).trim();
      if (!target) { toast.error('Usage: /ban email'); return true; }
      if (target === OWNER_EMAIL) { toast.error("Can't ban the owner!"); return true; }
      if (target === profile.email) { toast.error("Can't ban yourself!"); return true; }
      const targetUser = DB.getUser(target);
      if (!targetUser) { toast.error('User not found'); return true; }
      DB.banUser(target, profile.name, `Banned by ${profile.name}`);
      toast.success(`🔨 Banned ${targetUser.name}`);
      const sysMsg: DB.Message = { id: crypto.randomUUID(), chatRoomId: room.id, senderEmail: 'system', senderName: '⚠️ System', content: `${targetUser.name} has been banned by ${profile.name}.`, reactions: {}, deleted: false, senderTitle: '', senderTitleEffect: '', senderTitleColor: '', senderNameColor: '#ff4444', timestamp: Date.now() };
      messagesApi({ action: 'send', message: sysMsg }).then(load); return true;
    }

    if (text.startsWith('/unban ') && canBan) {
      const target = text.slice(7).trim();
      if (!target) { toast.error('Usage: /unban email'); return true; }
      DB.unbanUser(target); toast.success(`Unbanned ${target}`); return true;
    }

    if (text.startsWith('/mute ') && canMute) {
      const parts = text.slice(6).trim().split(' ');
      const target = parts[0];
      const mins = parseInt(parts[1]) || 10;
      if (!target) { toast.error('Usage: /mute email [minutes]'); return true; }
      DB.muteUser(target, mins * 60 * 1000, `Muted by ${profile.name}`);
      toast.success(`🔇 Muted ${target} for ${mins} min`); return true;
    }

    if (text.startsWith('/unmute ') && canMute) {
      const target = text.slice(8).trim();
      if (!target) { toast.error('Usage: /unmute email'); return true; }
      if (target === profile.email) { toast.error("You can't unmute yourself — ask another staff member"); return true; }
      DB.unmuteUser(target); toast.success(`🔊 Unmuted ${target}`); return true;
    }

    if (text.startsWith('/giverole ') && canGiveRole) {
      const [target, ...rest] = text.slice(10).trim().split(' ');
      const roleName = rest.join(' ').trim();
      if (!target || !roleName) { toast.error('Usage: /giverole email RoleName (or "none")'); return true; }
      if (!DB.getUser(target)) { toast.error('User not found'); return true; }
      if (roleName.toLowerCase() === 'none') { DB.assignCustomRole(target, null); toast.success('Custom role removed'); return true; }
      const r = DB.getCustomRoles().find(r => r.name.toLowerCase() === roleName.toLowerCase());
      if (!r) { toast.error(`No role named "${roleName}"`); return true; }
      DB.assignCustomRole(target, r.id); toast.success(`Gave ${r.icon} ${r.name} to ${target}`); return true;
    }

    if (text === '/clearchat') {
      if (!canClear) { toast.error("You don't have permission to clear chat"); return true; }
      setMessages([]);
      messagesApi({ action: 'clear', roomId: room.id })
        .then(() => { DB.clearChat(room.id); load(); toast.success('🧹 Chat cleared for everyone!'); })
        .catch(() => { toast.error("Couldn't clear chat"); load(); });
      return true;
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

    if (text.startsWith('/setrole') && isOwner) {
      const parts = text.slice(8).trim().split(/\s+/);
      const target = (parts[0] || '').toLowerCase();
      const role = parts[1] as DB.UserProfile['role'];
      if (!target || !role) { toast.error('Usage: /setrole email role'); return true; }
      if (!ROLE_OPTIONS.some(r => r.id === role)) { toast.error(`Unknown role "${role}". Use: ${ROLE_OPTIONS.map(r => r.id).join(', ')}`); return true; }
      rolesApi({ action: 'set', email: target, role }).then(r => {
        setSignedUp(r.users);
        const u = r.users.find(x => x.email.toLowerCase() === target);
        const local = DB.getUser(u?.email || target);
        if (local) DB.saveUser({ ...local, role });
        toast.success(`Set ${u?.name || target} as ${role}`);
      }).catch((e: { userFacingMessage?: string; message?: string }) => toast.error(e?.userFacingMessage || e?.message || 'Could not set role'));
      return true;
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

  async function send(override?: string) {
    const raw = override ?? input;
    if (!raw.trim() || !profile) return;
    const text = raw.trim();

    if (!override && text.startsWith('/') && handleCommand(text)) { setInput(''); return; }

    // Cooldown check (3 seconds between messages, owner bypasses)
    if (!isOwner && cooldown > 0) {
      toast.error(`⏳ Wait ${cooldown}s before sending again`);
      return;
    }

    // Check mute (applies to everyone, including owners)
    const muteCheck = DB.isUserMuted(profile.email);
    if (muteCheck) {
      const remaining = Math.ceil((muteCheck.until - Date.now()) / 60000);
      toast.error(`🔇 Muted for ${remaining} more min (${muteCheck.reason})`);
      return;
    }

    const isGif = text.startsWith('[gif]');
    const base = isGif ? { censored: text, hadProfanity: false } : censorMessage(text);
    const customHit = !isGif && DB.hasCustomBadWord(base.censored);
    const censored = customHit ? DB.censorCustom(base.censored) : base.censored;
    const hadProfanity = base.hadProfanity || customHit;
    const immune = DB.isMuteImmune(profile.email);

    if (hadProfanity && !isOwner && immune) {
      DB.addCussReport({ id: crypto.randomUUID(), email: profile.email, name: profile.name, originalMessage: text, censoredMessage: censored, chatRoomId: room.id, timestamp: Date.now(), resolved: false });
    }
    if (hadProfanity && !isOwner && !immune) {
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
    pendingRef.current.set(msg.id, msg);
    setMessages(prev => [...prev, msg]);
    messagesApi({ action: 'send', message: msg })
      .then(() => load())
      .catch(() => {
        pendingRef.current.delete(msg.id);
        setMessages(prev => prev.filter(m => m.id !== msg.id));
        toast.error("Message didn't send — try again");
      });
    DB.clearTyping(room.id, profile.email);
    stopTyping.cancel(); isTypingRef.current = false; lastTypingPing.current = 0;
    typingApi({ action: 'stop', roomId: room.id, email: profile.email }).catch(() => {});
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

    if (!override) setInput('');
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

    if (/@jaydenchatbot\b/i.test(text)) handleBot(text, censored);

    setTimeout(() => { checkAchievements(); checkBadges(profile.email); }, 100);
  }

  function postBot(content: string) {
    const bot = DB.ensureBotUser();
    const m: DB.Message = { id: crypto.randomUUID(), chatRoomId: room.id, senderEmail: bot.email, senderName: bot.name, content, reactions: {}, deleted: false, senderTitle: bot.activeTitle, senderTitleEffect: '', senderTitleColor: bot.activeTitleColor, senderNameColor: bot.nameColor, timestamp: Date.now() };
    return messagesApi({ action: 'send', message: m }).then(load);
  }

  async function handleBot(text: string, censored: string) {
    if (!profile) return;
    const roleMatch = text.match(/make\s+(?:a\s+)?custom\s+roles?\s*:\s*(.+)/i);
    if (roleMatch) {
      const name = roleMatch[1].trim().slice(0, 24);
      const fresh = DB.getUser(profile.email) ?? profile;
      if (!name) { postBot(`@${profile.name} give your role a name! e.g. @jaydenchatbot make custom roles: VIP`); return; }
      if (DB.getCustomRoles().some(r => r.name.toLowerCase() === name.toLowerCase())) { postBot(`@${profile.name} a role called "${name}" already exists 😅 pick another name.`); return; }
      if (fresh.gems < 250) { postBot(`@${profile.name} custom roles cost 💎 250 gems — you've only got ${fresh.gems}. Grind a bit more! 💪`); return; }
      const colors = ['#f472b6', '#38bdf8', '#a3e635', '#fbbf24', '#fb923c', '#2dd4bf'];
      const role: DB.CustomRole = { id: crypto.randomUUID(), name, color: colors[Math.floor(Math.random() * colors.length)], icon: '✨', canDelete: false, permissions: [], createdBy: profile.email };
      DB.addCustomRole(role);
      addGems(-250);
      DB.assignCustomRole(profile.email, role.id);
      updateProfile({ customRole: role.name, customRoleColor: role.color, customRoleColor2: role.color2 || '' });
      postBot(`🎉 Done! @${profile.name} now has the custom role ✨ ${name}. That'll be 💎 250 gems, pleasure doing business 😎`);
      return;
    }
    try {
      const history = messages.slice(-15).map(m => ({ name: m.senderName, content: m.content }));
      const { reply } = await chatBot({ userName: profile.name, prompt: censored.replace(/@jaydenchatbot/ig, '').trim() || 'hi', history });
      postBot(censorMessage(reply).censored);
    } catch { postBot("Beep boop… my brain lagged 🤖 try again in a sec!"); }
  }

  const ALL_COMMANDS: { cmd: string; desc: string; level: 'all' | 'staff' | 'owner' }[] = [
    { cmd: '/ban', desc: 'Ban a user', level: 'staff' },
    { cmd: '/unban', desc: 'Unban a user', level: 'staff' },
    { cmd: '/mute', desc: 'Mute user [email] [mins]', level: 'staff' },
    { cmd: '/unmute', desc: 'Unmute a user', level: 'staff' },
    { cmd: '/clearchat', desc: 'Clear chat', level: 'staff' },
    { cmd: '/giverole', desc: 'Give custom role [email] [RoleName]', level: 'staff' },
    { cmd: '/give', desc: 'Give gems [email] [amount]', level: 'owner' },
    { cmd: '/infgems', desc: 'Give ∞ gems [email]', level: 'owner' },
    { cmd: '/setrole', desc: 'Set role [email] [role]', level: 'owner' },
    { cmd: '/setstreak', desc: 'Set streak [email] [amount]', level: 'owner' },
    { cmd: '/setquest', desc: 'Set quest progress [email] [questId] [amount]', level: 'owner' },
    { cmd: '/online', desc: 'Show online users', level: 'all' },
  ];

  const visibleCommands = ALL_COMMANDS.filter(c => {
    if (c.level === 'owner') return isOwner;
    if (c.cmd === '/ban' || c.cmd === '/unban') return canBan;
    if (c.cmd === '/mute' || c.cmd === '/unmute') return canMute;
    if (c.cmd === '/clearchat') return canClear;
    if (c.cmd === '/giverole') return canGiveRole;
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
          <span className="text-xs text-muted-foreground italic flex flex-wrap gap-x-3">
            {typing.map(t => {
              const st = TYPING_STYLES.find(x => x.id === t.style);
              return st
                ? <span key={t.email} className={st.className} style={{ color: st.color }}><span className="font-semibold not-italic">{t.name}</span> {st.text}</span>
                : <span key={t.email}><span className="text-foreground/70 font-medium">{t.name}</span> is typing…</span>;
            })}
          </span>
        </div>
      )}
      {muteInfo && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/30 flex items-center gap-2">
          <span className="text-sm">🔇</span>
          <span className="text-xs text-destructive font-semibold">
            Muted for {Math.max(1, Math.ceil((muteInfo.until - Date.now()) / 60000))} min — {muteInfo.reason}
          </span>
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
        {isOwner && input.startsWith('/setrole ') && (() => {
          const parts = input.slice(9).split(' ');
          if (parts.length === 1) {
            const q = parts[0].toLowerCase();
            const list = signedUp.filter(u => !q || u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q)).slice(0, 8);
            return (
              <div className="absolute bottom-full left-4 right-4 mb-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50 max-h-72 overflow-y-auto">
                <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold border-b border-border bg-secondary/30">Pick who to give a role ({signedUp.length} signed up)</div>
                {list.length === 0 && <p className="px-3 py-3 text-xs text-muted-foreground">{signedUp.length ? 'No matches' : 'Loading users…'}</p>}
                {list.map(u => (
                  <button key={u.email} onClick={() => setInput(`/setrole ${u.email} `)} className="w-full flex items-center justify-between gap-2 px-3 py-2 hover:bg-secondary/50 text-left">
                    <div><p className="text-xs font-semibold">{u.name}</p><p className="text-[10px] text-muted-foreground">{u.email}</p></div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">{u.role}</span>
                  </button>
                ))}
              </div>
            );
          }
          const target = signedUp.find(u => u.email.toLowerCase() === parts[0].toLowerCase());
          const q = (parts[1] || '').toLowerCase();
          if (ROLE_OPTIONS.some(r => r.id === q)) return null;
          return (
            <div className="absolute bottom-full left-4 right-4 mb-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-50">
              <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold border-b border-border bg-secondary/30">
                Roles you can give {target ? `${target.name} (now: ${target.role})` : parts[0]}
              </div>
              {ROLE_OPTIONS.filter(r => r.id.startsWith(q)).map(r => (
                <button key={r.id} onClick={() => setInput(`/setrole ${parts[0]} ${r.id}`)} className="w-full flex items-center gap-3 px-3 py-2 hover:bg-secondary/50 text-left">
                  <span className="text-xs font-bold w-24">{r.label}</span>
                  <span className="text-xs text-muted-foreground">{r.desc}</span>
                  {target?.role === r.id && <span className="ml-auto text-[10px] text-primary">current</span>}
                </button>
              ))}
            </div>
          );
        })()}
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

        <div className="flex gap-2 items-center">
          <EmojiGifPicker onEmoji={e => setInput(prev => prev + e)} onGif={url => send(`[gif]${url}`)} />
          <Input value={input} onChange={e => handleInputChange(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={replyingTo ? `Reply to ${replyingTo.senderName}…` : `Message ${room.name}…`} className="flex-1 bg-secondary border-border" />
          <Button onClick={() => send()} size="icon" disabled={!input.trim() || (!isOwner && cooldown > 0)}>
            {cooldown > 0 && !isOwner ? <span className="text-xs font-bold">{cooldown}</span> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* User Profile Modal */}
      <UserProfileModal email={viewProfileEmail} onClose={() => setViewProfileEmail(null)} onStartDM={onStartDM} />
    </div>
  );
}
