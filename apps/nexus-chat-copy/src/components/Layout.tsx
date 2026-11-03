import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Toaster } from '@project/components/ui/sonner';
import Sidebar from './Sidebar';
import GemDisplay from './GemDisplay';
import ProfileModal from './ProfileModal';
import ShopModal from './ShopModal';
import FeedbackModal from './FeedbackModal';
import DailyQuestsModal from './DailyQuestsModal';
import { Button } from '@project/components/ui/button';
import { Bug, EyeOff, Megaphone, X, Settings, Flame, ShoppingBag } from 'lucide-react';
import { toast } from 'sonner';
import * as DB from '../lib/storage';
import SettingsExtras, { COSMETICS_EVENT } from './SettingsExtras';
import { getAllBgThemes } from '../lib/cosmetics';
import TradesDialog from './TradesDialog';
import WarningNotice from './WarningNotice';
import PageTranslator from './PageTranslator';
import { ArrowLeftRight } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import MusicPlayer from './MusicPlayer';
import NotificationBell from './NotificationBell';
import { Link } from 'react-router-dom';
import { Store } from 'lucide-react';
import * as P from '../lib/personalize';
import { isOwnerEmail } from '../lib/gameData';
import HolidayDecor from './HolidayDecor';
import { HOLIDAYS, variantFor, windowFor } from '../lib/holidays';
import EventShop from './EventShop';
import HolidayShopHub from './shop/HolidayShopHub';
import FriendsWatching from './FriendsWatching';
import { useFriendOnlineAlerts } from '../hooks/useFriendOnlineAlerts';
import { useActiveEvent } from '../hooks/useActiveEvent';
import { useChatSettingsSync } from '../hooks/useChatSettingsSync';
import { useOwnerLimited } from '../hooks/useOwnerLimited';

const CLOAK_PRESETS = [
  { label: 'Google Docs', title: 'Untitled document - Google Docs', favicon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
  { label: 'Google Drive', title: 'My Drive - Google Drive', favicon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png' },
  { label: 'Google Classroom', title: 'Google Classroom', favicon: 'https://ssl.gstatic.com/classroom/favicon.png' },
  { label: 'Wikipedia', title: 'Wikipedia, the free encyclopedia', favicon: 'https://en.wikipedia.org/static/favicon/wikipedia.ico' },
  { label: 'Khan Academy', title: 'Khan Academy', favicon: 'https://cdn.kastatic.org/images/favicon.ico' },
  { label: 'Canvas LMS', title: 'Dashboard', favicon: 'https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico' },
];

function openCloakedTab() {
  const appUrl = window.location.href;
  const win = window.open('about:blank', '_blank');
  if (!win) {
    toast.error('Pop-ups are blocked! Allow pop-ups for this site first.');
    return false;
  }

  const saved = JSON.parse(localStorage.getItem('nexus_cloak') || '{}');
  const preset = CLOAK_PRESETS.find(p => p.label === saved.preset) || CLOAK_PRESETS[0];
  const title = saved.customTitle || preset.title;
  const favicon = saved.customFavicon || preset.favicon;

  win.document.open();
  win.document.write(`<!DOCTYPE html>
<html><head>
<title>${title}</title>
<link rel="icon" href="${favicon}">
<style>*{margin:0;padding:0;overflow:hidden}iframe{width:100vw;height:100vh;border:none;display:block}</style>
</head><body>
<iframe src="${appUrl}" allow="microphone;camera;clipboard-write"></iframe>
<script>window.addEventListener('beforeunload',function(e){e.preventDefault();});</script>
</body></html>`);
  win.document.close();

  toast.success(`🔒 Opened as "${title.slice(0, 30)}…"`);
  return true;
}

// Auto about:blank: on the first click, reopen the app inside a cloaked tab
// and send this tab somewhere harmless. Skipped when already inside the cloak.
function useAutoCloak() {
  useEffect(() => {
    if (window.self !== window.top) return;
    if (localStorage.getItem('nexus_autocloak') === 'off') return;
    const go = () => {
      if (openCloakedTab()) window.location.replace('https://classroom.google.com');
    };
    window.addEventListener('click', go, { once: true });
    return () => window.removeEventListener('click', go);
  }, []);
}

function AnnouncementPopup({ announcement, onDismiss }: { announcement: DB.Announcement; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onDismiss}>
      <div className="relative w-full max-w-md mx-4 animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="bg-card border-2 border-primary/30 rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-primary/10 px-5 py-4 flex items-center gap-3 border-b border-primary/20">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Megaphone className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">📢 Announcement</p>
              <p className="text-lg font-black text-foreground leading-tight mt-0.5">{announcement.title}</p>
            </div>
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
          {announcement.content && (
            <div className="px-5 py-4">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
            </div>
          )}
          <div className="px-5 py-3 bg-secondary/20 border-t border-border flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground">by {announcement.authorName} • {new Date(announcement.timestamp).toLocaleString()}</p>
            <Button size="sm" onClick={onDismiss} className="h-8 text-xs">Got it</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [saved, setSaved] = useState(() => JSON.parse(localStorage.getItem('nexus_cloak') || '{}'));
  const [selectedPreset, setSelectedPreset] = useState<string>(saved.preset || CLOAK_PRESETS[0].label);
  const [customTitle, setCustomTitle] = useState<string>(saved.customTitle || '');
  const [customFavicon, setCustomFavicon] = useState<string>(saved.customFavicon || '');
  const [autoCloak, setAutoCloak] = useState(localStorage.getItem('nexus_autocloak') !== 'off');

  if (!open) return null;

  function selectPreset(label: string) {
    setSelectedPreset(label);
    setCustomTitle('');
    setCustomFavicon('');
    const next = { preset: label, customTitle: '', customFavicon: '' };
    localStorage.setItem('nexus_cloak', JSON.stringify(next));
    setSaved(next);
    toast.success(`Cloak set to "${label}"`);
  }

  function saveCustom() {
    if (!customTitle.trim()) { toast.error('Enter a custom tab title'); return; }
    const next = { preset: selectedPreset, customTitle: customTitle.trim(), customFavicon: customFavicon.trim() };
    localStorage.setItem('nexus_cloak', JSON.stringify(next));
    setSaved(next);
    toast.success('Custom cloak saved!');
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-sm mx-4 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-border flex items-center gap-3">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">Settings</h2>
          <button onClick={onClose} className="ml-auto text-muted-foreground hover:text-foreground transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          <label className="flex items-center gap-2 p-3 rounded-xl border border-border bg-secondary/20 text-xs cursor-pointer">
            <input type="checkbox" checked={autoCloak} className="w-4 h-4 accent-primary" onChange={e => { setAutoCloak(e.target.checked); localStorage.setItem('nexus_autocloak', e.target.checked ? 'on' : 'off'); }} />
            <span><strong>Auto about:blank</strong> — open the app in a cloaked tab automatically</span>
          </label>
          <SettingsExtras />
          {/* Cloak Presets */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><EyeOff className="w-4 h-4" /> Tab Cloak</h3>
            <p className="text-[11px] text-muted-foreground mb-3">Choose what the cloaked tab looks like. The app loads inside about:blank.</p>
            <div className="space-y-1.5">
              {CLOAK_PRESETS.map(p => (
                <button key={p.label} onClick={() => selectPreset(p.label)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-colors flex items-center gap-2 ${selectedPreset === p.label && !saved.customTitle ? 'border-primary bg-primary/10 text-foreground font-semibold' : 'border-border hover:bg-secondary text-muted-foreground'}`}>
                  <img src={p.favicon} alt="" className="w-4 h-4 rounded" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <span>{p.label}</span>
                  <span className="ml-auto text-[9px] text-muted-foreground truncate max-w-32">{p.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom */}
          <div className="p-3 rounded-xl border border-border bg-secondary/20 space-y-2">
            <h4 className="text-xs font-semibold text-foreground">Custom Cloak</h4>
            <input value={customTitle} onChange={e => setCustomTitle(e.target.value)} placeholder="Custom tab title..." className="w-full text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
            <input value={customFavicon} onChange={e => setCustomFavicon(e.target.value)} placeholder="Favicon URL (optional)" className="w-full text-xs bg-background border border-border rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary" />
            <Button size="sm" variant="outline" className="w-full h-8 text-xs" onClick={saveCustom}>Save Custom Cloak</Button>
          </div>

          {/* Current cloak preview */}
          <div className="p-3 rounded-lg bg-secondary/30 border border-border space-y-1">
            <p className="text-[10px] text-muted-foreground font-semibold">Current cloak:</p>
            <p className="text-xs font-semibold text-foreground truncate">
              {saved.customTitle || CLOAK_PRESETS.find(p => p.label === selectedPreset)?.title || CLOAK_PRESETS[0].title}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  useAutoCloak();
  useFriendOnlineAlerts();
  const [profileOpen, setProfileOpen] = useState(false);
  const navigate = useNavigate();
  const [shopOpen,    setShopOpen]    = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [questsOpen, setQuestsOpen] = useState(false);
  const [announcement, setAnnouncement] = useState<DB.Announcement | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem('dismissed_anns') || '[]')); } catch { return new Set(); }
  });

  useEffect(() => {
    const check = () => {
      const anns = DB.getAnnouncements();
      const pinned = anns.find(a => a.pinned && !dismissedIds.has(a.id));
      const latest = anns.find(a => !dismissedIds.has(a.id));
      setAnnouncement(pinned || latest || null);
    };
    check();
    const t = setInterval(check, 5000);
    return () => clearInterval(t);
  }, [dismissedIds]);

  const { profile, impersonating, impersonate } = useApp();
  useOwnerLimited(); // loads owner-made limited items so equipped ones render
  useChatSettingsSync();
  const [bgId, setBgId] = useState('');
  useEffect(() => {
    if (!profile) return;
    const sync = () => setBgId(DB.getEquipped(profile.email).bg);
    sync();
    window.addEventListener(COSMETICS_EVENT, sync);
    return () => window.removeEventListener(COSMETICS_EVENT, sync);
  }, [profile?.email]); // eslint-disable-line react-hooks/exhaustive-deps
  const myTheme = getAllBgThemes().find(b => b.id === bgId);
  const [tradesOpen, setTradesOpen] = useState(false);
  const bgCss = myTheme?.css;
  const { active: holidayEvent } = useActiveEvent();
  const [eventShopOpen, setEventShopOpen] = useState(false);
  const [myCss, setMyCss] = useState('');
  const [myBg, setMyBg] = useState('');
  useEffect(() => {
    if (!profile) return;
    const sync = () => {
      setMyCss(P.hasCustomCss(profile.email) || isOwnerEmail(profile.email) ? P.getCustomCss(profile.email) : '');
      setMyBg(P.hasCustomBg(profile.email) || isOwnerEmail(profile.email) ? P.getCustomBg(profile.email) : '');
    };
    sync();
    window.addEventListener(P.PERSONALIZE_EVENT, sync);
    return () => window.removeEventListener(P.PERSONALIZE_EVENT, sync);
  }, [profile?.email]); // eslint-disable-line react-hooks/exhaustive-deps

  function dismissAnnouncement() {
    if (!announcement) return;
    const next = new Set(dismissedIds);
    next.add(announcement.id);
    setDismissedIds(next);
    sessionStorage.setItem('dismissed_anns', JSON.stringify([...next]));
    setAnnouncement(null);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={bgCss ? { background: bgCss } : myBg ? { background: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.45)), url(${myBg}) center / cover no-repeat fixed` } : undefined}>
      {(() => {
        const m = /^ev-([a-z0-9]+)-(\d{4})/.exec(bgId);
        const h = m && HOLIDAYS.find(x => x.key === m[1]);
        if (h) { const y = Number(m![2]); return <HolidayDecor event={{ holiday: h, year: y, variant: variantFor(h, y), ...windowFor(h, y) }} />; }
        return holidayEvent ? <HolidayDecor event={holidayEvent} /> : null;
      })()}
      <button onClick={() => setTradesOpen(true)} title="Trade items"
        className="fixed bottom-4 right-4 z-40 h-11 px-4 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center gap-2 text-sm font-semibold hover:brightness-110 transition">
        <ArrowLeftRight className="h-4 w-4" />Trade
      </button>
      <TradesDialog open={tradesOpen} onOpenChange={setTradesOpen} />
      <WarningNotice />
      <PageTranslator lang={profile?.language || 'en'} />
      {holidayEvent && <EventShop event={holidayEvent} open={eventShopOpen} onOpenChange={setEventShopOpen} />}
      <Sidebar onProfileClick={() => setProfileOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        {holidayEvent && (
          <button onClick={() => setEventShopOpen(true)} className="text-white text-xs font-semibold px-4 py-1.5 flex items-center gap-2 hover:brightness-110 transition" style={{ background: `linear-gradient(90deg, ${holidayEvent.variant.colors[1]}, ${holidayEvent.variant.colors[0]})` }}>
            <span className="text-base">{holidayEvent.holiday.emoji}</span>
            {holidayEvent.holiday.name} {holidayEvent.year}: {holidayEvent.variant.tagline}
            <span className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: holidayEvent.variant.colors[2], color: holidayEvent.variant.colors[0] }}>🛍️ Limited shop</span>
          </button>
        )}
        {impersonating && (
          <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[9999] pointer-events-auto bg-amber-500 text-black text-xs font-semibold pl-4 pr-1.5 py-1.5 rounded-full shadow-lg flex items-center gap-2">
            👀 Signed in as {profile?.name} ({impersonating})
            <button type="button" onClick={() => impersonate('')} className="rounded-full bg-black text-amber-400 px-3 py-1 hover:bg-black/80">Back to my account</button>
          </div>
        )}
        {/* Top Bar */}
        <header className="h-12 border-b border-border bg-card/50 flex items-center px-4 gap-2 flex-shrink-0">
          <GemDisplay />
          <div className="flex items-center gap-1.5 ml-2">
            <HolidayShopHub />
            <button
              onClick={() => setShopOpen(true)}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors flex items-center gap-1"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-pink-400" /> Shop
            </button>
            <button
              onClick={() => setQuestsOpen(true)}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors flex items-center gap-1"
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" /> Quests
            </button>
            <button
              onClick={() => setFeedbackOpen(true)}
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors flex items-center gap-1"
            >
              <Bug className="w-3.5 h-3.5" /> Feedback
            </button>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <MusicPlayer />
            <NotificationBell />
            <Link
              to="/market"
              title="Marketplace"
              className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors flex items-center gap-1"
            >
              <Store className="w-3.5 h-3.5 text-emerald-400" /> Marketplace
            </Link>
            <button
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              className="h-8 w-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={openCloakedTab}
              title="Open in cloaked about:blank tab"
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary rounded-md transition-colors flex items-center gap-1.5"
            >
              <EyeOff className="w-3.5 h-3.5" /> Cloak
            </button>
          </div>
        </header>
        <FriendsWatching />
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Announcement Popup */}
      {announcement && <AnnouncementPopup announcement={announcement} onDismiss={dismissAnnouncement} />}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} onOpenShop={() => { setProfileOpen(false); navigate('/achievements'); }} />
      <ShopModal    open={shopOpen}    onClose={() => setShopOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <DailyQuestsModal open={questsOpen} onClose={() => setQuestsOpen(false)} />
      {myCss && <style>{myCss}</style>}
      <Toaster position="top-right" richColors />
    </div>
  );
}
