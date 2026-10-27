import { BAD_WORDS } from './gameData';
import { bans as bansApi } from 'zitejs/api';
import { isOwnerEmail, ownerLabel } from './gameData';

export type UserProfile = {
  email: string;
  name: string;
  profilePic: string;
  nameColor: string;
  nameColor2: string;
  bio: string;
  gems: number;
  activeTitle: string;
  activeTitleEffect: string;
  activeTitleColor: string;
  role: 'owner' | 'co-owner' | 'admin' | 'senior-mod' | 'mod' | 'helper' | 'guardian' | 'vip' | 'user';
  customRole?: string;
  customRoleColor?: string;
  customRoleColor2?: string;
  tag?: string;
  badges: string[];
  messageCount: number;
  gambleCount: number;
  gambleWins: number;
  gambleLoseStreak: number;
  reactionCount: number;
  dmCount: number;
  groupCount: number;
  bugCount: number;
  suggestionCount: number;
  voiceJoined: boolean;
  proxyUsed: boolean;
  lastSeen: number;
  streak: number;
  lastStreakDate: string;
  lastMessageTime: number;
  language: string;
  verified: boolean;
};

/** Format streak as days / months / years */
export function formatStreak(days: number): string {
  if (days >= 365) {
    const years = Math.floor(days / 365);
    const remaining = days % 365;
    const months = Math.floor(remaining / 30);
    return months > 0 ? `${years}y ${months}m` : `${years}y`;
  }
  if (days >= 30) {
    const months = Math.floor(days / 30);
    const remaining = days % 30;
    return remaining > 0 ? `${months}m ${remaining}d` : `${months}m`;
  }
  return `${days}d`;
}

export type Message = {
  id: string;
  chatRoomId: string;
  senderEmail: string;
  senderName: string;
  content: string;
  reactions: Record<string, string[]>;
  deleted: boolean;
  senderTitle: string;
  senderTitleEffect: string;
  senderTitleColor: string;
  senderNameColor: string;
  replyTo?: { id: string; senderName: string; content: string };
  timestamp: number;
  edited?: boolean;
  uncensored?: boolean;
};

export type ChatRoom = {
  id: string;
  name: string;
  type: 'global' | 'group' | 'dm';
  members: string[];
  createdBy: string;
};

export type CustomRole = {
  id: string;
  name: string;
  color: string;
  color2?: string;
  icon: string;
  canDelete: boolean;
  permissions?: RolePerm[];
  createdBy: string;
};

export type CustomTitle = {
  id: string;
  name: string;
  effect: string;
  cost: number;
  color: string;
  createdBy: string;
  availableInShop: boolean;
  font?: string;
};

export type TitleRequest = {
  id: string;
  email: string;
  userName: string;
  idea: string;
  name: string;
  effect: string;
  color: string;
  font: string;
  cost: number;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
};
export function getTitleRequests(): TitleRequest[] { return g<TitleRequest[]>('titleRequests') || []; }
export function addTitleRequest(r: TitleRequest) { const l = getTitleRequests(); l.unshift(r); s('titleRequests', l.slice(0, 200)); }
export function resolveTitleRequest(id: string, approve: boolean) {
  const l = getTitleRequests(); const r = l.find(x => x.id === id);
  if (!r || r.status !== 'pending') return;
  r.status = approve ? 'approved' : 'rejected';
  s('titleRequests', l);
  if (approve) {
    if (!getCustomTitles().some(c => c.name === r.name)) {
      addCustomTitle({ id: crypto.randomUUID(), name: r.name, effect: r.effect, color: r.color, font: r.font, cost: r.cost, createdBy: r.email, availableInShop: false });
    }
    addUserTitle(r.email, r.name);
  } else {
    const u = getUser(r.email);
    if (u) saveUser({ ...u, gems: u.gems + r.cost });
  }
}


export type Bug = {
  id: string;
  title: string;
  description: string;
  reporterEmail: string;
  reporterName: string;
  status: 'open' | 'in-progress' | 'resolved';
  timestamp: number;
};

export type Suggestion = {
  id: string;
  title: string;
  description: string;
  submitterEmail: string;
  upvotes: number;
  upvoters: string[];
  timestamp: number;
};

export type TypingUser = { email: string; name: string; lastActive: number; style?: string };

export type Notification = {
  id: string;
  recipientEmail: string;
  senderName: string;
  messagePreview: string;
  chatRoomId: string;
  roomName: string;
  read: boolean;
  timestamp: number;
};

// ── Core helpers ──────────────────────────────────────────────
function g<T>(key: string): T | null {
  try { const v = localStorage.getItem(`hub:${key}`); return v ? JSON.parse(v) : null; } catch { return null; }
}
function s<T>(key: string, value: T) {
  localStorage.setItem(`hub:${key}`, JSON.stringify(value));
  broadcast('storage', { key });
}

// ── Users ─────────────────────────────────────────────────────
export function getAllUsers(): UserProfile[] { return Object.values(g<Record<string,UserProfile>>('users') || {}); }
export function getUser(email: string): UserProfile | null {
  const u = (g<Record<string,UserProfile>>('users') || {})[email];
  if (!u) return null;
  // Backfill new fields for existing users
  if (u.bio === undefined) u.bio = '';
  if (u.nameColor2 === undefined) u.nameColor2 = '';
  if (!u.badges) u.badges = [];
  return u;
}
export function saveUser(p: UserProfile) {
  const users = g<Record<string,UserProfile>>('users') || {};
  users[p.email] = p; s('users', users);
}

export function deleteUser(email: string) {
  const users = g<Record<string,UserProfile>>('users') || {};
  delete users[email]; s('users', users);
}
export function getOrCreateUser(email: string): UserProfile {
  const existing = getUser(email);
  if (existing) {
    if (isOwnerEmail(email) && existing.role !== 'owner') { existing.role = 'owner'; saveUser(existing); }
    if (isOwnerEmail(email) && existing.activeTitle === 'Owner' && ownerLabel(email) !== 'Owner') { existing.activeTitle = ownerLabel(email); saveUser(existing); }
    return existing;
  }
  const p: UserProfile = {
    email, name: email === 'jaydenaltfirst@gmail.com' ? 'Jayden Rogres' : email.split('@')[0], profilePic: '', nameColor: '#e0e0ff', nameColor2: '', bio: '',
    gems: 0, activeTitle: isOwnerEmail(email) ? ownerLabel(email) : '',
    activeTitleEffect: '', activeTitleColor: isOwnerEmail(email) ? '#ffd700' : '',
    role: isOwnerEmail(email) ? 'owner' : 'user', badges: [],
    messageCount: 0, gambleCount: 0, gambleWins: 0, gambleLoseStreak: 0,
    reactionCount: 0, dmCount: 0, groupCount: 0, bugCount: 0, suggestionCount: 0,
    voiceJoined: false, proxyUsed: false, lastSeen: Date.now(),
    streak: 0, lastStreakDate: '', lastMessageTime: 0, language: 'en',
    verified: isOwnerEmail(email),
  };
  saveUser(p); return p;
}

// ── JaydenChatBot ─────────────────────────────────────────────
export const BOT_EMAIL = 'jaydenchatbot@nexus.bot';
export const BOT_NAME = 'Jayden';
export function ensureBotUser(): UserProfile {
  const existing = getUser(BOT_EMAIL);
  if (existing) return existing;
  const p = getOrCreateUser(BOT_EMAIL);
  const bot: UserProfile = { ...p, name: BOT_NAME, nameColor: '#38bdf8', bio: '🤖 Your AI assistant & friend. Mention @jayden for jokes, answers & more!', activeTitle: '🤖 Bot', activeTitleColor: '#38bdf8', verified: true };
  saveUser(bot); return bot;
}

// ── Role permissions ──────────────────────────────────────────
export type RolePerm = 'mute' | 'ban' | 'clearchat' | 'giverole' | 'delete' | 'editusers';
export const ROLE_PERMS: { id: RolePerm; label: string }[] = [
  { id: 'mute', label: 'Mute / unmute users' },
  { id: 'ban', label: 'Ban / unban users' },
  { id: 'clearchat', label: 'Clear chat' },
  { id: 'giverole', label: 'Give custom roles' },
  { id: 'delete', label: 'Delete messages' },
  { id: 'editusers', label: 'Edit user accounts' },
];
export function hasPerm(p: UserProfile | null | undefined, perm: RolePerm): boolean {
  if (!p || !p.customRole) return false;
  const r = getCustomRoles().find(r => r.name === p.customRole);
  if (!r) return false;
  if (perm === 'delete' && r.canDelete) return true;
  return (r.permissions || []).includes(perm);
}

// ── Messages ──────────────────────────────────────────────────
export function getMessages(roomId: string): Message[] { return g<Message[]>(`messages:${roomId}`) || []; }
export function addMessage(msg: Message) {
  const msgs = getMessages(msg.chatRoomId);
  msgs.push(msg); s(`messages:${msg.chatRoomId}`, msgs.slice(-500));
  broadcast('new_message', { roomId: msg.chatRoomId });
}
export function updateMessage(roomId: string, msgId: string, update: Partial<Message>) {
  const msgs = getMessages(roomId);
  const i = msgs.findIndex(m => m.id === msgId);
  if (i !== -1) { msgs[i] = { ...msgs[i], ...update }; s(`messages:${roomId}`, msgs); }
}

// ── Chat Rooms ────────────────────────────────────────────────
export function getChatRooms(): ChatRoom[] {
  let rooms = g<ChatRoom[]>('rooms') || [];
  if (!rooms.find(r => r.id === 'global')) {
    rooms = [{ id: 'global', name: '🌐 Global Chat', type: 'global', members: [], createdBy: 'system' }, ...rooms];
    s('rooms', rooms);
  }
  return rooms;
}
export function addChatRoom(room: ChatRoom) { const r = getChatRooms(); r.push(room); s('rooms', r); }
export function updateChatRoom(id: string, update: Partial<ChatRoom>) {
  const r = getChatRooms(); const i = r.findIndex(x => x.id === id);
  if (i !== -1) { r[i] = { ...r[i], ...update }; s('rooms', r); }
}

// ── User Titles ───────────────────────────────────────────────
export function getUserTitles(email: string): string[] { return g<string[]>(`userTitles:${email}`) || []; }
export function addUserTitle(email: string, title: string) {
  const t = getUserTitles(email); if (!t.includes(title)) { t.push(title); s(`userTitles:${email}`, t); }
}
export function removeUserTitle(email: string, title: string) {
  s(`userTitles:${email}`, getUserTitles(email).filter(x => x !== title));
  const u = getUser(email);
  if (u && u.activeTitle === title) saveUser({ ...u, activeTitle: '' });
}

// ── Custom Titles ─────────────────────────────────────────────
export function getCustomTitles(): CustomTitle[] { return g<CustomTitle[]>('customTitles') || []; }
export function addCustomTitle(t: CustomTitle) { const c = getCustomTitles(); c.push(t); s('customTitles', c); }

// ── Custom Roles ──────────────────────────────────────────────
export function getCustomRoles(): CustomRole[] { return g<CustomRole[]>('customRoles') || []; }
export function addCustomRole(r: CustomRole) { const c = getCustomRoles(); c.push(r); s('customRoles', c); }
export function deleteCustomRole(id: string) { s('customRoles', getCustomRoles().filter(r => r.id !== id)); }
export function applyCustomRoleLocally(email: string, cr: { name: string; color: string; color2: string } | null) {
  const users = g<Record<string,UserProfile>>('users') || {};
  if (!users[email]) return;
  if (!cr || !cr.name) { delete users[email].customRole; delete users[email].customRoleColor; delete users[email].customRoleColor2; }
  else { users[email].customRole = cr.name; users[email].customRoleColor = cr.color; users[email].customRoleColor2 = cr.color2; }
  s('users', users);
}

/** Gives (or removes) a custom role. Saved on the shared server so it sticks for everyone. */
export function assignCustomRole(email: string, roleId: string | null): Promise<void> {
  const r = roleId === null ? null : getCustomRoles().find(r => r.id === roleId);
  const cr = r ? { name: r.name, color: r.color, color2: r.color2 || '' } : null;
  applyCustomRoleLocally(email, cr);
  return import('zitejs/api').then(({ roles }) => roles({ action: 'setCustom', email, customRole: cr })).then(() => undefined);
}

// ── Bugs ──────────────────────────────────────────────────────
export function getBugs(): Bug[] { return g<Bug[]>('bugs') || []; }
export function addBug(bug: Bug) { const b = getBugs(); b.unshift(bug); s('bugs', b); }
export function updateBugStatus(id: string, status: Bug['status']) {
  const b = getBugs(); const i = b.findIndex(x => x.id === id); if (i !== -1) { b[i].status = status; s('bugs', b); }
}

// ── Suggestions ───────────────────────────────────────────────
export function getSuggestions(): Suggestion[] { return g<Suggestion[]>('suggestions') || []; }
export function addSuggestion(sug: Suggestion) { const s2 = getSuggestions(); s2.unshift(sug); s('suggestions', s2); }
export function upvoteSuggestion(id: string, email: string) {
  const s2 = getSuggestions(); const i = s2.findIndex(x => x.id === id);
  if (i !== -1 && !s2[i].upvoters.includes(email)) { s2[i].upvotes++; s2[i].upvoters.push(email); s('suggestions', s2); }
}

// ── Typing ────────────────────────────────────────────────────
export function setTyping(roomId: string, email: string, name: string) {
  const t = (g<TypingUser[]>(`typing:${roomId}`) || []).filter(x => x.email !== email);
  t.push({ email, name, lastActive: Date.now() }); s(`typing:${roomId}`, t);
}
export function clearTyping(roomId: string, email: string) {
  s(`typing:${roomId}`, (g<TypingUser[]>(`typing:${roomId}`) || []).filter(x => x.email !== email));
}
export function getTyping(roomId: string): TypingUser[] {
  const now = Date.now();
  return (g<TypingUser[]>(`typing:${roomId}`) || []).filter(t => now - t.lastActive < 4000);
}

// ── Notifications ─────────────────────────────────────────────
export function getNotifications(email: string): Notification[] { return g<Notification[]>(`notifs:${email}`) || []; }
export function addNotification(n: Notification) {
  const notifs = getNotifications(n.recipientEmail); notifs.unshift(n);
  s(`notifs:${n.recipientEmail}`, notifs.slice(0, 50));
  broadcast('notification', { email: n.recipientEmail });
}
export function markNotificationsRead(email: string) {
  const n = getNotifications(email); n.forEach(x => x.read = true); s(`notifs:${email}`, n);
}

// ── Gamble Rig ────────────────────────────────────────────────
export type GambleRig = 'normal' | 'jackpot' | 'win' | 'lose';
export function getGambleRig(): GambleRig { return (g<GambleRig>('gambleRig')) || 'normal'; }
export function setGambleRig(rig: GambleRig) { s('gambleRig', rig); }

// ── Online Presence ───────────────────────────────────────────
export function pingOnline(email: string) {
  const users = g<Record<string,UserProfile>>('users') || {};
  if (users[email]) { users[email].lastSeen = Date.now(); s('users', users); }
}
export function getOnlineCount(): number {
  const cutoff = Date.now() - 2 * 60 * 1000;
  return getAllUsers().filter(u => (u.lastSeen || 0) > cutoff).length;
}
export function getOnlineUsers(): UserProfile[] {
  const cutoff = Date.now() - 2 * 60 * 1000;
  return getAllUsers().filter(u => (u.lastSeen || 0) > cutoff);
}

// ── App Settings ──────────────────────────────────────────────
export type AppSettings = {
  appName: string;
  appTagline: string;
  welcomeMessage: string;
  customUrl: string;
  matrixColor: string;
  matrixSpeed: number;
};
const DEFAULT_SETTINGS: AppSettings = { appName: 'Nexus Hub', appTagline: 'Unblocked Hub', welcomeMessage: '', customUrl: '', matrixColor: '#00ff00', matrixSpeed: 1 };
export function getAppSettings(): AppSettings { return { ...DEFAULT_SETTINGS, ...(g<Partial<AppSettings>>('appSettings') || {}) }; }
export function saveAppSettings(settings: AppSettings) { s('appSettings', settings); }

// ── Achievements ──────────────────────────────────────────────
export function getUserAchievements(email: string): string[] { return g<string[]>(`achievements:${email}`) || []; }
export function addAchievement(email: string, id: string): boolean {
  const a = getUserAchievements(email); if (a.includes(id)) return false; a.push(id); s(`achievements:${email}`, a); return true;
}

// ── Bans ──────────────────────────────────────────────────────
export type BanRecord = { email: string; bannedBy: string; reason: string; timestamp: number };
export function getBans(): BanRecord[] { return g<BanRecord[]>('bans') || []; }
export function banUser(email: string, bannedBy: string, reason: string) {
  const bans = getBans();
  if (!bans.find(b => b.email === email)) { bans.push({ email, bannedBy, reason, timestamp: Date.now() }); s('bans', bans); }
  bansApi({ action: 'ban', email, reason }).catch(() => {});
}
export function unbanUser(email: string) {
  s('bans', getBans().filter(b => b.email !== email));
  bansApi({ action: 'unban', email }).catch(() => {});
}
export function isUserBanned(email: string): BanRecord | null { return getBans().find(b => b.email === email) || null; }

// ── Mutes ─────────────────────────────────────────────────────
export type MuteRecord = { email: string; until: number; reason: string };
export function getMutes(): MuteRecord[] { return g<MuteRecord[]>('mutes') || []; }
export function muteUser(email: string, durationMs: number, reason: string) {
  const mutes = getMutes().filter(m => m.email !== email);
  mutes.push({ email, until: Date.now() + durationMs, reason });
  s('mutes', mutes);
}
export function isUserMuted(email: string): MuteRecord | null {
  const m = getMutes().find(m => m.email === email);
  if (!m) return null;
  if (Date.now() > m.until) { s('mutes', getMutes().filter(x => x.email !== email)); return null; }
  return m;
}
export function unmuteUser(email: string) { s('mutes', getMutes().filter(m => m.email !== email)); }

// ── Cuss Reports ──────────────────────────────────────────────
export type CussReport = {
  id: string;
  email: string;
  name: string;
  originalMessage: string;
  censoredMessage: string;
  chatRoomId: string;
  timestamp: number;
  resolved: boolean;
};
export function getCussReports(): CussReport[] { return g<CussReport[]>('cussReports') || []; }
export function addCussReport(report: CussReport) {
  const reports = getCussReports();
  reports.unshift(report);
  s('cussReports', reports.slice(0, 100));
}
export function resolveCussReport(id: string) {
  const reports = getCussReports();
  const i = reports.findIndex(r => r.id === id);
  if (i !== -1) { reports[i].resolved = true; s('cussReports', reports); }
}

// ── Banned Names ──────────────────────────────────────────────
export function getBannedNames(): string[] { return g<string[]>('bannedNames') || []; }
export function addBannedName(name: string) {
  const list = getBannedNames();
  const lower = name.trim().toLowerCase();
  if (lower && !list.includes(lower)) { list.push(lower); s('bannedNames', list); }
}
export function removeBannedName(name: string) {
  s('bannedNames', getBannedNames().filter(n => n !== name.toLowerCase()));
}
export function isNameBanned(name: string): boolean {
  const banned = getBannedNames();
  const lower = name.trim().toLowerCase();
  return banned.some(b => lower.includes(b));
}

// ── User Tags ─────────────────────────────────────────────────
export type UserTag = {
  id: string;
  name: string;
  icon: string;
  color: string;
  createdBy: string;
};
export function getUserTags(): UserTag[] { return g<UserTag[]>('userTags') || []; }
export function addUserTag(t: UserTag) { const list = getUserTags(); list.push(t); s('userTags', list); }
export function deleteUserTag(id: string) {
  s('userTags', getUserTags().filter(t => t.id !== id));
  // Remove tag from all users who have it
  const users = g<Record<string,UserProfile>>('users') || {};
  for (const email in users) {
    if (users[email].tag === id) { delete users[email].tag; }
  }
  s('users', users);
}
export function assignUserTag(email: string, tagId: string | null) {
  const users = g<Record<string,UserProfile>>('users') || {};
  if (!users[email]) return;
  if (tagId === null) { delete users[email].tag; }
  else { users[email].tag = tagId; }
  s('users', users);
}
export function getUserTagForUser(email: string): UserTag | null {
  const u = getUser(email);
  if (!u?.tag) return null;
  return getUserTags().find(t => t.id === u.tag) || null;
}

// ── Announcements ─────────────────────────────────────────────
export type Announcement = {
  id: string;
  title: string;
  content: string;
  authorName: string;
  authorEmail: string;
  pinned: boolean;
  timestamp: number;
};
export function getAnnouncements(): Announcement[] { return g<Announcement[]>('announcements') || []; }
export function addAnnouncement(a: Announcement) { const list = getAnnouncements(); list.unshift(a); s('announcements', list.slice(0, 50)); }
export function deleteAnnouncement(id: string) { s('announcements', getAnnouncements().filter(a => a.id !== id)); }
export function togglePinAnnouncement(id: string) {
  const list = getAnnouncements(); const i = list.findIndex(a => a.id === id);
  if (i !== -1) { list[i].pinned = !list[i].pinned; s('announcements', list); }
}

// ── Clear Chat ────────────────────────────────────────────────
export function clearChat(roomId: string) { s(`messages:${roomId}`, []); }

// ── Streaks ───────────────────────────────────────────────────
function todayStr(): string { return new Date().toISOString().slice(0, 10); }
function yesterdayStr(): string { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10); }

export function checkAndUpdateStreak(email: string): { streak: number; isNewDay: boolean; gemsAwarded: number } {
  const u = getUser(email);
  if (!u) return { streak: 0, isNewDay: false, gemsAwarded: 0 };
  const today = todayStr();
  if (u.lastStreakDate === today) return { streak: u.streak, isNewDay: false, gemsAwarded: 0 };
  const yesterday = yesterdayStr();
  let newStreak: number;
  if (u.lastStreakDate === yesterday) { newStreak = (u.streak || 0) + 1; }
  else { newStreak = 1; }
  // Streak gems: 10 base + 5 per day (capped at 100)
  const gemsAwarded = Math.min(100, 10 + (newStreak - 1) * 5);
  saveUser({ ...u, streak: newStreak, lastStreakDate: today, gems: u.gems + gemsAwarded });
  return { streak: newStreak, isNewDay: true, gemsAwarded };
}

// ── Daily Quests ──────────────────────────────────────────────
export type DailyQuest = {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  reward: number;
};

export const DAILY_QUESTS: DailyQuest[] = [
  { id: 'send_5',     title: 'Chatterbox',      description: 'Send 5 messages',       icon: '💬', target: 5,  reward: 20 },
  { id: 'send_20',    title: 'Motor Mouth',      description: 'Send 20 messages',      icon: '🗣️', target: 20, reward: 50 },
  { id: 'react_3',    title: 'Emoji Fan',        description: 'React to 3 messages',   icon: '😄', target: 3,  reward: 15 },
  { id: 'gamble_3',   title: 'High Roller',      description: 'Gamble 3 times',        icon: '🎰', target: 3,  reward: 25 },
  { id: 'send_50',    title: 'Unstoppable',      description: 'Send 50 messages',      icon: '🔥', target: 50, reward: 100 },
];

export type DailyQuestProgress = {
  date: string;
  progress: Record<string, number>;
  claimed: string[];
};

export function getDailyQuestProgress(email: string): DailyQuestProgress {
  const key = `dailyQuests:${email}`;
  const existing = g<DailyQuestProgress>(key);
  const today = todayStr();
  if (existing && existing.date === today) return existing;
  // Reset for new day
  const fresh: DailyQuestProgress = { date: today, progress: {}, claimed: [] };
  s(key, fresh);
  return fresh;
}

export function incrementQuestProgress(email: string, questId: string, amount = 1) {
  const qp = getDailyQuestProgress(email);
  qp.progress[questId] = (qp.progress[questId] || 0) + amount;
  s(`dailyQuests:${email}`, qp);
}

export function saveDailyQuestProgress(email: string, qp: DailyQuestProgress) {
  s(`dailyQuests:${email}`, qp);
}

export function claimQuestReward(email: string, questId: string): number {
  const qp = getDailyQuestProgress(email);
  if (qp.claimed.includes(questId)) return 0;
  const quest = DAILY_QUESTS.find(q => q.id === questId);
  if (!quest) return 0;
  const current = qp.progress[questId] || 0;
  if (current < quest.target) return 0;
  qp.claimed.push(questId);
  s(`dailyQuests:${email}`, qp);
  const u = getUser(email);
  if (u) saveUser({ ...u, gems: u.gems + quest.reward });
  return quest.reward;
}

// ── BroadcastChannel ─────────────────────────────────────────
type Listener = (type: string, data: unknown) => void;
let _channel: BroadcastChannel | null = null;
const _listeners: Listener[] = [];
function broadcast(type: string, data: unknown) { _channel?.postMessage({ type, data }); }
export function initBroadcast(): () => void {
  _channel = new BroadcastChannel('hub_v1');
  _channel.onmessage = (e) => _listeners.forEach(l => l(e.data.type, e.data.data));
  return () => { _channel?.close(); _channel = null; };
}
export function onBroadcast(fn: Listener): () => void {
  _listeners.push(fn); return () => { const i = _listeners.indexOf(fn); if (i !== -1) _listeners.splice(i, 1); };
}

// ── Calendar Events ───────────────────────────────────────────
export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'holiday' | 'event' | 'birthday';
  emoji: string;
  color: string;
  roleName: string;
  targetEmail?: string;
  yearly: boolean;
  createdBy: string;
};
export function getEvents(): CalendarEvent[] { return g<CalendarEvent[]>('calendarEvents') || []; }
export function addEvent(e: CalendarEvent) { const l = getEvents(); l.push(e); s('calendarEvents', l); }
export function deleteEvent(id: string) { s('calendarEvents', getEvents().filter(e => e.id !== id)); }
export function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function eventsOn(dateKey: string): CalendarEvent[] {
  return getEvents().filter(e => e.date === dateKey || (e.yearly && e.date.slice(5) === dateKey.slice(5) && e.date <= dateKey));
}
export function getDailyRolesFor(email: string): CalendarEvent[] {
  return eventsOn(toDateKey(new Date())).filter(e => e.roleName && (!e.targetEmail || e.targetEmail === email));
}

// ── Auto-mute immunity ────────────────────────────────────────
export function getMuteImmune(): string[] { return g<string[]>('muteImmune') || []; }
export function isMuteImmune(email: string) { return getMuteImmune().includes(email); }
export function toggleMuteImmune(email: string): boolean {
  const l = getMuteImmune(); const on = !l.includes(email);
  s('muteImmune', on ? [...l, email] : l.filter(e => e !== email)); return on;
}

// ── Chat word filter (custom words, auto-saved) ───────────────
// The admin list is the ONLY source of blocked words. Starts with the default list; remove any you don't want.
export function getChatWords(): string[] { return g<string[]>('chatWords') ?? [...BAD_WORDS]; }
const escapeRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whole-word match only: "ass" blocks "ass" but not "class" or "pass". */
const wordRe = (w: string, flags: string) => new RegExp('(?<![\\p{L}\\p{N}])' + escapeRe(w) + '(?![\\p{L}\\p{N}])', flags + 'u');
export function setChatWords(words: string[]) { s('chatWords', [...new Set(words.map(w => w.trim().toLowerCase()).filter(Boolean))]); }
export function hasCustomBadWord(text: string): boolean {
  const t = text.toLowerCase();
  return getChatWords().some(w => wordRe(w, 'i').test(t));
}
export function censorCustom(text: string): string {
  let out = text;
  for (const w of getChatWords()) out = out.replace(wordRe(w, 'gi'), m => '#'.repeat(m.length));
  return out;
}

// ── Cosmetics (backgrounds + typing styles) ───────────────────
export function getUserItems(email: string): string[] { return (g<Record<string, string[]>>('userItems') || {})[email] || []; }
export function addUserItem(email: string, id: string) {
  const all = g<Record<string, string[]>>('userItems') || {};
  all[email] = [...new Set([...(all[email] || []), id])]; s('userItems', all);
}
export function removeUserItem(email: string, id: string) {
  const all = g<Record<string, string[]>>('userItems') || {};
  all[email] = (all[email] || []).filter(x => x !== id); s('userItems', all);
  const eq = getEquipped(email);
  if (eq.bg === id) setEquipped(email, { bg: '' });
  if (eq.typing === id) setEquipped(email, { typing: '' });
}
export function getEquipped(email: string): { bg: string; typing: string } {
  return (g<Record<string, { bg: string; typing: string }>>('equipped') || {})[email] || { bg: '', typing: '' };
}
export function setEquipped(email: string, patch: Partial<{ bg: string; typing: string }>) {
  const all = g<Record<string, { bg: string; typing: string }>>('equipped') || {};
  all[email] = { ...{ bg: '', typing: '' }, ...all[email], ...patch }; s('equipped', all);
}

// ── Personal matrix color (sign-in / loading screen) ──────────
export function getMyMatrixColor(): string { return localStorage.getItem('hub:myMatrixColor') || ''; }
export function setMyMatrixColor(c: string) { if (c) localStorage.setItem('hub:myMatrixColor', c); else localStorage.removeItem('hub:myMatrixColor'); }

// ── Custom badges (Badge Maker) ───────────────────────────────
export type CustomBadge = { id: string; name: string; description: string; icon: string; color: string; color2: string; createdBy: string };
export function getCustomBadges(): CustomBadge[] { return g<CustomBadge[]>('customBadges') || []; }
export function addCustomBadge(b: CustomBadge) { s('customBadges', [...getCustomBadges(), b]); }
export function deleteCustomBadge(id: string) { s('customBadges', getCustomBadges().filter(b => b.id !== id)); }
export function awardBadge(email: string, badgeId: string): boolean {
  const u = getUser(email); if (!u) return false;
  if (!u.badges.includes(badgeId)) saveUser({ ...u, badges: [...u.badges, badgeId] });
  return true;
}
