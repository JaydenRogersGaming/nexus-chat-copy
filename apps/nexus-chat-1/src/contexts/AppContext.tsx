import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { profileSync } from 'zitejs/api';
import { useAuth } from 'zitejs/auth';
import { ACHIEVEMENTS, isOwnerEmail } from '../lib/gameData';
import { checkBadges } from '../lib/badges';
import * as DB from '../lib/storage';
import { isInfiniteGems } from '../lib/formatGems';
import { vipBonus } from '../lib/vip';
import { toast } from 'sonner';
import { roles as rolesApi } from 'zitejs/api';

type AppContextType = {
  profile: DB.UserProfile | null;
  refreshProfile: () => void;
  updateProfile: (updates: Partial<DB.UserProfile>) => void;
  addGems: (amount: number) => void;
  checkAchievements: () => void;
  unreadCount: number;
  setUnreadCount: (n: number) => void;
  playNotifSound: () => void;
  activeRoomId: string;
  impersonating: string;
  isRealOwner: boolean;
  impersonate: (email: string) => void;
  setActiveRoomId: (id: string) => void;
};

// HMR-safe: reuse the same context reference across hot reloads so the
// provider and hook always share the exact same object.
const IMP_KEY = 'nexus_impersonate';
const CTX_KEY = '__hubx_app_ctx__';
declare global { interface Window { [key: string]: unknown } }
if (!window[CTX_KEY]) {
  window[CTX_KEY] = createContext<AppContextType | null>(null);
}
const Ctx = window[CTX_KEY] as React.Context<AppContextType | null>;

export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useApp outside provider');
  return c;
};

function playBeep() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(); osc.stop(ctx.currentTime + 0.35);
  } catch { /* silence */ }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [impersonating, setImpersonating] = useState<string>(() => localStorage.getItem(IMP_KEY) || '');
  const realEmail = user?.email || '';
  const email = isOwnerEmail(realEmail) && impersonating ? impersonating : realEmail;
  const impersonate = useCallback((target: string) => {
    if (target && !isOwnerEmail(realEmail.toLowerCase())) return; // owner only
    if (target) localStorage.setItem(IMP_KEY, target); else localStorage.removeItem(IMP_KEY);
    setImpersonating(target);
  }, [realEmail]);
  const [profile, setProfile] = useState<DB.UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeRoomId, setActiveRoomId] = useState('global');
  const prevNotifCount = useRef(0);

  const refreshProfile = useCallback(() => {
    if (!email) return;
    const p = DB.getOrCreateUser(email);
    DB.ensureBotUser();
    // Backfill new fields
    if (p.streak === undefined) { p.streak = 0; p.lastStreakDate = ''; p.lastMessageTime = 0; DB.saveUser(p); }
    if (!p.language) { p.language = 'en'; DB.saveUser(p); }
    if (p.verified === undefined) { p.verified = false; DB.saveUser(p); }
    // Apply language
    document.documentElement.lang = p.language;
    if (isOwnerEmail(email)) {
      let changed = false;
      if (p.role !== 'owner') { p.role = 'owner'; changed = true; }
      if (!p.name || p.name === email.split('@')[0]) { p.name = 'Jayden Rogres'; changed = true; }
      if (!p.activeTitle || p.activeTitle === '') { p.activeTitle = 'Owner'; p.activeTitleColor = '#ffd700'; p.activeTitleEffect = ''; changed = true; }
      if (!p.verified) { p.verified = true; changed = true; }
      if (changed) DB.saveUser(p);
    }
    setProfile({ ...p });
  }, [email]);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  // One shared profile per email: load the server copy on sign-in (any device),
  // then keep it updated so other devices never start a duplicate account.
  const synced = useRef(false);
  useEffect(() => {
    if (!email || email !== realEmail) return;
    synced.current = false;
    profileSync({ action: 'get' }).then(({ data }) => {
      if (data) { DB.saveUser({ ...DB.getOrCreateUser(email), ...JSON.parse(data), email }); refreshProfile(); }
      else { const local = DB.getUser(email); if (local) profileSync({ action: 'save', data: JSON.stringify(local) }).catch(() => {}); }
      synced.current = true;
    }).catch(() => { synced.current = true; });
  }, [email, realEmail]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!profile || !synced.current || profile.email !== realEmail) return;
    const t = setTimeout(() => { profileSync({ action: 'save', data: JSON.stringify(profile) }).catch(() => {}); }, 1500);
    return () => clearTimeout(t);
  }, [profile, realEmail]);

  // Check streak on login
  const streakChecked = useRef(false);
  useEffect(() => {
    if (!email || streakChecked.current) return;
    streakChecked.current = true;
    const result = DB.checkAndUpdateStreak(email);
    if (result.isNewDay) {
      if (result.streak > 1) {
        toast.success(`🔥 ${result.streak}-day streak! +${result.gemsAwarded} gems`, { duration: 5000 });
      } else {
        toast.success(`👋 Welcome back! +${result.gemsAwarded} gems`, { duration: 4000 });
      }
      refreshProfile();
    }
  }, [email, refreshProfile]);

  const updateProfile = useCallback((updates: Partial<DB.UserProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...(DB.getUser(prev.email) || prev), ...updates };
      DB.saveUser(updated);
      if (updates.language) document.documentElement.lang = updates.language;
      return updated;
    });
  }, []);

  const addGems = useCallback((rawAmount: number) => {
    setProfile(prev => {
      if (!prev) return prev;
      // VIPs earn +25% on rewards (spending is unaffected)
      const amount = rawAmount > 0 ? Math.round(rawAmount * vipBonus(prev.email)) : rawAmount;
      if (!Number.isFinite(amount)) return prev;
      const base = DB.getUser(prev.email) || prev;
      // Infinite gems stay infinite — spending or earning doesn't change them.
      if (isInfiniteGems(base.gems)) return base;
      // No cap — gems grow endlessly, but never become Infinity/NaN
      const cur = Number.isFinite(base.gems) ? base.gems : Number.MAX_SAFE_INTEGER;
      const sum = cur + amount;
      const next = Math.max(0, Math.floor(Number.isFinite(sum) ? Math.min(sum, Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER));
      const updated = { ...base, gems: next };
      DB.saveUser(updated);
      return updated;
    });
  }, []);

  const checkAchievements = useCallback(() => {
    if (!profile) return;
    const earned = DB.getUserAchievements(profile.email);
    const titles = DB.getUserTitles(profile.email);
    for (const a of ACHIEVEMENTS) {
      if (earned.includes(a.id)) continue;
      let unlock = false;
      const p = profile;
      if (a.id === 'first_message'    && p.messageCount >= 1)   unlock = true;
      if (a.id === 'chat_10'          && p.messageCount >= 10)  unlock = true;
      if (a.id === 'chat_100'         && p.messageCount >= 100) unlock = true;
      if (a.id === 'chat_500'         && p.messageCount >= 500) unlock = true;
      if (a.id === 'chat_1000'        && p.messageCount >= 1000) unlock = true;
      if (a.id === 'gems_100'         && p.gems >= 100)   unlock = true;
      if (a.id === 'gems_1000'        && p.gems >= 1000)  unlock = true;
      if (a.id === 'gems_10000'       && p.gems >= 10000) unlock = true;
      if (a.id === 'gems_100000'      && p.gems >= 100000) unlock = true;
      if (a.id === 'first_title'      && titles.length >= 1) unlock = true;
      if (a.id === 'titles_5'         && titles.length >= 5) unlock = true;
      if (a.id === 'gamble_win'       && p.gambleWins >= 1) unlock = true;
      if (a.id === 'gamble_10'        && p.gambleCount >= 10) unlock = true;
      if (a.id === 'gamble_lose_5'    && p.gambleLoseStreak >= 5) unlock = true;
      if (a.id === 'bug_report'       && p.bugCount >= 1) unlock = true;
      if (a.id === 'suggestion'       && p.suggestionCount >= 1) unlock = true;
      if (a.id === 'dm_first'         && p.dmCount >= 1) unlock = true;
      if (a.id === 'group_create'     && p.groupCount >= 1) unlock = true;
      if (a.id === 'voice_join'       && p.voiceJoined) unlock = true;
      if (a.id === 'proxy_use'        && p.proxyUsed) unlock = true;
      if (a.id === 'reactions_5'      && p.reactionCount >= 5) unlock = true;
      if (a.id === 'title_broke'      && titles.includes('Broke')) unlock = true;
      if (a.id === 'title_alpha'      && titles.includes('THE ALPHA')) unlock = true;
      if (a.id === 'title_scythe'     && titles.includes('Scythe')) unlock = true;
      if (a.id === 'night_owl') { const h = new Date().getHours(); if (h >= 0 && h < 4) unlock = true; }
      if (unlock) { DB.addAchievement(profile.email, a.id); if (a.gems > 0) addGems(a.gems); }
    }
    // Also check badges
    checkBadges(profile.email);
  }, [profile, addGems]);

  // Poll notifications
  useEffect(() => {
    if (!profile) return;
    const check = () => {
      const notifs = DB.getNotifications(profile.email);
      const unread = notifs.filter(n => !n.read && n.chatRoomId !== activeRoomId).length;
      if (unread > prevNotifCount.current) playBeep();
      prevNotifCount.current = unread;
      setUnreadCount(unread);
    };
    check();
    const t = setInterval(check, 3000);
    return () => clearInterval(t);
  }, [profile, activeRoomId]);

  // Ping online presence
  useEffect(() => {
    if (!profile?.email) return;
    DB.pingOnline(profile.email);
    const t = setInterval(() => { if (profile?.email) DB.pingOnline(profile.email); }, 30000);
    return () => clearInterval(t);
  }, [profile?.email]);

  // Sync my role from the shared server (roles set by staff on any device)
  useEffect(() => {
    if (!email) return;
    const sync = () => rolesApi({ action: 'list' }).then(({ myRole, users: rawUsers }) => {
      const users = rawUsers as Array<{ email: string; name: string; role: string; customRole: string; customRoleColor: string; customRoleColor2: string }>;
      // Keep every locally-known user's role in line with the shared server copy
      for (const su of users) {
        const lu = DB.getUser(su.email);
        if (lu && lu.role !== su.role && !isOwnerEmail(su.email)) DB.saveUser({ ...lu, role: su.role as DB.UserProfile['role'] });
        const lu2 = DB.getUser(su.email);
        if (lu2 && (lu2.customRole || '') !== su.customRole) {
          DB.applyCustomRoleLocally(su.email, su.customRole ? { name: su.customRole, color: su.customRoleColor, color2: su.customRoleColor2 } : null);
        }
      }
      const me = users.find(u => u.email.toLowerCase() === email.toLowerCase());
      if (me && email === realEmail) {
        setProfile(prev => prev && (prev.customRole || '') !== me.customRole
          ? { ...prev, customRole: me.customRole || undefined, customRoleColor: me.customRoleColor || undefined, customRoleColor2: me.customRoleColor2 || undefined }
          : prev);
      }
      const p = DB.getUser(email);
      if (p && p.role !== myRole && !isOwnerEmail(email) && email === realEmail) {
        DB.saveUser({ ...p, role: myRole as DB.UserProfile['role'] });
        setProfile(prev => prev ? { ...prev, role: myRole as DB.UserProfile['role'] } : prev);
      }
    }).catch(() => {});
    sync();
    const t = setInterval(sync, 10000);
    return () => clearInterval(t);
  }, [email]);

  // Init broadcast
  useEffect(() => DB.initBroadcast(), []);

  return (
    <Ctx.Provider value={{ profile, refreshProfile, updateProfile, addGems, checkAchievements, unreadCount, setUnreadCount, playNotifSound: playBeep, activeRoomId, setActiveRoomId, impersonating: isOwnerEmail(realEmail) ? impersonating : '', isRealOwner: isOwnerEmail(realEmail), impersonate }}>
      {children}
    </Ctx.Provider>
  );
}
