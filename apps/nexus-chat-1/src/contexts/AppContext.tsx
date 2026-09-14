import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from 'zitejs/auth';
import { ACHIEVEMENTS, isOwnerEmail } from '../lib/gameData';
import { checkBadges } from '../lib/badges';
import * as DB from '../lib/storage';
import { toast } from 'sonner';

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
  setActiveRoomId: (id: string) => void;
};

// HMR-safe: reuse the same context reference across hot reloads so the
// provider and hook always share the exact same object.
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
  const [profile, setProfile] = useState<DB.UserProfile | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeRoomId, setActiveRoomId] = useState('global');
  const prevNotifCount = useRef(0);

  const refreshProfile = useCallback(() => {
    if (!user?.email) return;
    const p = DB.getOrCreateUser(user.email);
    // Backfill new fields
    if (p.streak === undefined) { p.streak = 0; p.lastStreakDate = ''; p.lastMessageTime = 0; DB.saveUser(p); }
    if (!p.language) { p.language = 'en'; DB.saveUser(p); }
    if (p.verified === undefined) { p.verified = false; DB.saveUser(p); }
    // Apply language
    document.documentElement.lang = p.language;
    if (isOwnerEmail(user.email)) {
      let changed = false;
      if (p.role !== 'owner') { p.role = 'owner'; changed = true; }
      if (p.name !== 'Jayden Rogres') { p.name = 'Jayden Rogres'; changed = true; }
      if (!p.activeTitle || p.activeTitle === '') { p.activeTitle = 'Owner'; p.activeTitleColor = '#ffd700'; p.activeTitleEffect = ''; changed = true; }
      if (!p.verified) { p.verified = true; changed = true; }
      if (changed) DB.saveUser(p);
    }
    setProfile({ ...p });
  }, [user?.email]);

  useEffect(() => { refreshProfile(); }, [refreshProfile]);

  // Check streak on login
  const streakChecked = useRef(false);
  useEffect(() => {
    if (!user?.email || streakChecked.current) return;
    streakChecked.current = true;
    const result = DB.checkAndUpdateStreak(user.email);
    if (result.isNewDay) {
      if (result.streak > 1) {
        toast.success(`🔥 ${result.streak}-day streak! +${result.gemsAwarded} gems`, { duration: 5000 });
      } else {
        toast.success(`👋 Welcome back! +${result.gemsAwarded} gems`, { duration: 4000 });
      }
      refreshProfile();
    }
  }, [user?.email, refreshProfile]);

  const updateProfile = useCallback((updates: Partial<DB.UserProfile>) => {
    setProfile(prev => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      DB.saveUser(updated);
      if (updates.language) document.documentElement.lang = updates.language;
      return updated;
    });
  }, []);

  const addGems = useCallback((amount: number) => {
    setProfile(prev => {
      if (!prev) return prev;
      // Infinite gems (999999999+) can never be reduced
      if (prev.gems >= 999999999 && amount < 0) return prev;
      const updated = { ...prev, gems: Math.max(0, prev.gems + amount) };
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

  // Init broadcast
  useEffect(() => DB.initBroadcast(), []);

  return (
    <Ctx.Provider value={{ profile, refreshProfile, updateProfile, addGems, checkAchievements, unreadCount, setUnreadCount, playNotifSound: playBeep, activeRoomId, setActiveRoomId }}>
      {children}
    </Ctx.Provider>
  );
}
