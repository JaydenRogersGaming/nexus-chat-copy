import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth, loginWithRedirect } from 'zitejs/auth';
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
import CalendarPage from './pages/CalendarPage';
import MarketplacePage from './pages/MarketplacePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import BanScreen from './components/BanScreen';
import { useServerBan } from './hooks/useServerBan';
import MatrixRain from './components/MatrixRain';
import * as DB from './lib/storage';

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const settings = DB.getAppSettings();
  const mc = DB.getMyMatrixColor() || settings.matrixColor;

  const serverBan = useServerBan(!!user);
  useEffect(() => {
    if (!isLoading && !user) loginWithRedirect();
  }, [isLoading, user]);
  if (isLoading || !user) return (
    <div className="relative h-screen overflow-hidden">
      <MatrixRain color={mc} speed={settings.matrixSpeed} />
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <h1 className="text-4xl font-black text-white mb-2" style={{ textShadow: `0 0 20px ${mc}` }}>
          {settings.appName}
        </h1>
        {isLoading ? (
          <>
            <div className="flex gap-1 mt-4">
              {[0,1,2].map(i => (
                <div key={i} className="w-2.5 h-2.5 rounded-full animate-bounce"
                  style={{ backgroundColor: mc, animationDelay: `${i * 0.15}s` }} />
              ))}
            </div>
            <p className="text-xs mt-4" style={{ color: mc + '88' }}>Loading...</p>
          </>
        ) : null}
      </div>
    </div>
  );

  const ban = DB.isUserBanned(user.email);
  if (ban) return <BanScreen ban={ban} />;
  if (serverBan) return <BanScreen ban={{ email: user.email, bannedBy: serverBan.bannedBy, reason: serverBan.reason, timestamp: 0, banType: serverBan.banType }} />;

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
              <Route path="calendar"      element={<CalendarPage />} />
              <Route path="admin"        element={<AdminPage />} />
              <Route path="market"       element={<MarketplacePage />} />
              <Route path="dashboard"    element={<AdminDashboardPage />} />
            </Route>
          </Routes>
        </AppProvider>
      </AuthGate>
    </BrowserRouter>
  );
}
