import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from '@project/components/ui/sonner';
import Sidebar from './Sidebar';
import GemDisplay from './GemDisplay';
import ProfileModal from './ProfileModal';
import ShopModal from './ShopModal';
import FeedbackModal from './FeedbackModal';
import DailyQuestsModal from './DailyQuestsModal';
import { Button } from '@project/components/ui/button';
import { Bug, EyeOff, Megaphone, X, Settings, Flame } from 'lucide-react';
import { toast } from 'sonner';
import * as DB from '../lib/storage';
import SettingsExtras, { COSMETICS_EVENT } from './SettingsExtras';
import { BG_THEMES } from '../lib/cosmetics';
import { useApp } from '../contexts/AppContext';

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
    return;
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
  const [profileOpen, setProfileOpen] = useState(false);
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

  const { profile } = useApp();
  const [bgId, setBgId] = useState('');
  useEffect(() => {
    if (!profile) return;
    const sync = () => setBgId(DB.getEquipped(profile.email).bg);
    sync();
    window.addEventListener(COSMETICS_EVENT, sync);
    return () => window.removeEventListener(COSMETICS_EVENT, sync);
  }, [profile?.email]); // eslint-disable-line react-hooks/exhaustive-deps
  const bgCss = BG_THEMES.find(b => b.id === bgId)?.css;

  function dismissAnnouncement() {
    if (!announcement) return;
    const next = new Set(dismissedIds);
    next.add(announcement.id);
    setDismissedIds(next);
    sessionStorage.setItem('dismissed_anns', JSON.stringify([...next]));
    setAnnouncement(null);
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background" style={bgCss ? { background: bgCss } : undefined}>
      <Sidebar onProfileClick={() => setProfileOpen(true)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-12 border-b border-border bg-card/50 flex items-center px-4 gap-2 flex-shrink-0">
          <GemDisplay />
          <div className="flex items-center gap-1.5 ml-2">
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
        <main className="flex-1 overflow-hidden">
          <Outlet />
        </main>
      </div>

      {/* Announcement Popup */}
      {announcement && <AnnouncementPopup announcement={announcement} onDismiss={dismissAnnouncement} />}

      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ProfileModal open={profileOpen} onClose={() => setProfileOpen(false)} onOpenShop={() => { setProfileOpen(false); setShopOpen(true); }} />
      <ShopModal    open={shopOpen}    onClose={() => setShopOpen(false)} />
      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />
      <DailyQuestsModal open={questsOpen} onClose={() => setQuestsOpen(false)} />
      <Toaster position="top-right" richColors />
    </div>
  );
}
