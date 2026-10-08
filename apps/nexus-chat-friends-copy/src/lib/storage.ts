import { OWNER_EMAIL } from './gameData';

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
  role: 'owner' | 'co-owner' | 'admin' | 'mod' | 'temp-mod' | 'member' | 'user';
  roleExpires?: number;
  customRole?: string;
  customRoleColor?: string;
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
};

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
  icon: string;
  canDelete: boolean;
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
};

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

export type TypingUser = { email: string; name: string; lastActive: number };

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
  if (u.role === 'temp-mod' && u.roleExpires && Date.now() > u.roleExpires) {
    u.role = 'member'; delete u.roleExpires; saveUser(u);
  }
  return u;
}
export function saveUser(p: UserProfile) {
  const users = g<Record<string,UserProfile>>('users') || {};
  users[p.email] = p; s('users', users);
}
export function getOrCreateUser(email: string): UserProfile {
  const existing = getUser(email);
  if (existing) {
    if (email === OWNER_EMAIL && existing.role !== 'owner') { existing.role = 'owner'; saveUser(existing); }
    return existing;
  }
  const p: UserProfile = {
    email, name: email.split('@')[0], profilePic: '', nameColor: '#e0e0ff', nameColor2: '', bio: '',
    gems: 0, activeTitle: email === OWNER_EMAIL ? 'Owner' : '',
    activeTitleEffect: '', activeTitleColor: email === OWNER_EMAIL ? '#ffd700' : '',
    role: email === OWNER_EMAIL ? 'owner' : 'member', badges: [],
    messageCount: 0, gambleCount: 0, gambleWins: 0, gambleLoseStreak: 0,
    reactionCount: 0, dmCount: 0, groupCount: 0, bugCount: 0, suggestionCount: 0,
    voiceJoined: false, proxyUsed: false, lastSeen: Date.now(),
  };
  saveUser(p); return p;
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

// ── Custom Titles ─────────────────────────────────────────────
export function getCustomTitles(): CustomTitle[] { return g<CustomTitle[]>('customTitles') || []; }
export function addCustomTitle(t: CustomTitle) { const c = getCustomTitles(); c.push(t); s('customTitles', c); }

// ── Custom Roles ──────────────────────────────────────────────
export function getCustomRoles(): CustomRole[] { return g<CustomRole[]>('customRoles') || []; }
export function addCustomRole(r: CustomRole) { const c = getCustomRoles(); c.push(r); s('customRoles', c); }
export function deleteCustomRole(id: string) { s('customRoles', getCustomRoles().filter(r => r.id !== id)); }
export function assignCustomRole(email: string, roleId: string | null) {
  const users = g<Record<string,UserProfile>>('users') || {};
  if (!users[email]) return;
  if (roleId === null) { delete users[email].customRole; delete users[email].customRoleColor; }
  else {
    const r = getCustomRoles().find(r => r.id === roleId);
    if (r) { users[email].customRole = r.name; users[email].customRoleColor = r.color; }
  }
  s('users', users);
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
}
export function unbanUser(email: string) { s('bans', getBans().filter(b => b.email !== email)); }
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

// ── Calendar Events & Daily Roles ─────────────────────────────
export type CalendarEvent = {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  type: 'holiday' | 'event' | 'birthday';
  emoji: string;
  color: string;
  roleName: string; // daily role shown on that day ('' = none)
  targetEmail?: string; // birthday person; otherwise role applies to everyone
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

// ── Clear Chat ────────────────────────────────────────────────
export function clearChat(roomId: string) { s(`messages:${roomId}`, []); }

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
