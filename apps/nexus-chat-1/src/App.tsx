import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from 'zitejs/auth';
import { Settings } from 'lucide-react';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import ChatPage from './pages/ChatPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import AchievementsPage from './pages/AchievementsPage';
import GamblePage from './pages/GamblePage';
import HpClickerPage from './pages/HpClickerPage';
import AiArtPage from './pages/AiArtPage';
import AiChatPage from './pages/AiChatPage';
import BrowserPage from './pages/BrowserPage';
import BanScreen from './components/BanScreen';
import MatrixRain from './components/MatrixRain';
import * as DB from './lib/storage';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [settings, setSettings] = useState(DB.getAppSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [localColor, setLocalColor] = useState(settings.matrixColor);
  const [localSpeed, setLocalSpeed] = useState(String(settings.matrixSpeed));

  if (isLoading || !user) return (
    <div className="relative h-screen overflow-hidden">
      <MatrixRain color={localColor} speed={parseFloat(localSpeed) || 1} />
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <h1 className="text-4xl font-black text-white mb-2" style={{ textShadow: `0 0 20px ${localColor}` }}>
          {settings.appName}
        </h1>
        <p className="text-sm mb-6" style={{ color: localColor }}>{settings.appTagline}</p>
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2.5 h-2.5 rounded-full animate-bounce"
              style={{ backgroundColor: localColor, animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
        <p className="text-xs mt-4" style={{ color: localColor + '88' }}>Signing in...</p>
      </div>
      <button onClick={() => setShowSettings(!showSettings)}
        className="absolute top-4 right-4 z-20 p-2 rounded-lg bg-black/40 border border-white/10 text-white/60 hover:text-white hover:bg-black/60 transition-colors">
        <Settings className="w-5 h-5" />
      </button>
      {showSettings && (
        <div className="absolute top-14 right-4 z-20 w-64 p-4 rounded-xl bg-black/80 border border-white/15 backdrop-blur-lg space-y-3">
          <h3 className="text-sm font-bold text-white">⚙️ Display Settings</h3>
          <div>
            <label className="text-xs text-white/60 block mb-1">Rain Color</label>
            <div className="flex gap-2">
              <input type="color" value={localColor} onChange={e => setLocalColor(e.target.value)} className="w-10 h-8 rounded cursor-pointer border-0" />
              <div className="flex gap-1 flex-wrap">
                {[
                  { c: '#00ff00', l: '🟢' }, { c: '#00aaff', l: '🔵' }, { c: '#aa44ff', l: '🟣' },
                  { c: '#ff3333', l: '🔴' }, { c: '#ffd700', l: '🟡' },
                ].map(p => (
                  <button key={p.c} onClick={() => setLocalColor(p.c)}
                    className={`text-sm w-7 h-7 rounded flex items-center justify-center transition-all ${localColor === p.c ? 'ring-2 ring-white/50 scale-110' : 'hover:scale-105'}`}>
                    {p.l}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/60 block mb-1">Speed ({localSpeed}x)</label>
            <input type="range" min="0.5" max="3" step="0.5" value={localSpeed} onChange={e => setLocalSpeed(e.target.value)}
              className="w-full accent-white" />
          </div>
          <button onClick={() => {
            const updated = { ...settings, matrixColor: localColor, matrixSpeed: parseFloat(localSpeed) || 1 };
            DB.saveAppSettings(updated); setSettings(updated);
          }}
            className="w-full text-xs py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors font-semibold">
            Save as Default
          </button>
        </div>
      )}
    </div>
  );

  const ban = DB.isUserBanned(user.email);
  if (ban) return <BanScreen ban={ban} />;

  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate>
        <AppProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/chat" replace />} />
              <Route path="chat"         element={<ChatPage />} />
              <Route path="leaderboard"  element={<LeaderboardPage />} />
              <Route path="achievements" element={<AchievementsPage />} />
              <Route path="gamble"       element={<GamblePage />} />
              <Route path="hpclicker"    element={<HpClickerPage />} />
              <Route path="aiart"         element={<AiArtPage />} />
              <Route path="aichat"        element={<AiChatPage />} />
              <Route path="browser"       element={<BrowserPage />} />
              <Route path="admin"        element={<AdminPage />} />
            </Route>
          </Routes>
        </AppProvider>
      </AuthGate>
    </BrowserRouter>
  );
}
