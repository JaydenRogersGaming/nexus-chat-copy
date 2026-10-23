import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { MessageSquare, Trophy, Star, Shield, ChevronRight, Dices, Circle, Heart, Wand2, Bot, Globe, CalendarDays, Flame, BadgeCheck, LogOut } from 'lucide-react';
import { logout } from 'zitejs/auth';
import { useApp } from '../contexts/AppContext';
import TitleBadge from './TitleBadge';
import { useOnlineUsers } from '../hooks/useOnlineUsers';
import * as DB from '../lib/storage';
import { formatStreak } from '../lib/storage';
import { cn } from '@project/components/lib/utils';
import type { AppSettings } from '../lib/storage';

type Props = { onProfileClick: () => void };

const NAV = [
  { to: '/chat',         icon: MessageSquare, label: 'Chat' },
  { to: '/gamble',       icon: Dices,         label: 'Casino' },
  { to: '/leaderboard',  icon: Trophy,        label: 'Leaderboard' },
  { to: '/hpclicker',    icon: Heart,         label: 'HP Clicker' },
  { to: '/aiart',         icon: Wand2,         label: 'AI Art' },
  { to: '/aichat',        icon: Bot,           label: 'AI Assistant' },
  { to: '/browser',       icon: Globe,         label: 'Browser' },
  { to: '/calendar',      icon: CalendarDays,  label: 'Calendar' },
];

export default function Sidebar({ onProfileClick }: Props) {
  const { profile, unreadCount } = useApp();
  const onlineCount = useOnlineUsers().length;
  const [totalUsers, setTotalUsers] = useState(0);
  const [appSettings, setAppSettings] = useState<AppSettings>(DB.getAppSettings());

  useEffect(() => {
    const update = () => {
      setTotalUsers(DB.getAllUsers().length);
      setAppSettings(DB.getAppSettings());
    };
    update();
    const t = setInterval(update, 10000);
    return () => clearInterval(t);
  }, []);

  return (
    <aside className="w-56 flex-shrink-0 bg-card border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h1 className="text-lg font-black bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">🌐 {appSettings.appName}</h1>
        <p className="text-[10px] text-muted-foreground">{appSettings.appTagline}</p>
        <div className="flex items-center gap-1.5 mt-2">
          <Circle className="w-2.5 h-2.5 fill-green-400 text-green-400" />
          <span className="text-[11px] text-green-400 font-semibold">{onlineCount} online</span>
          <span className="text-[11px] text-muted-foreground">/ {totalUsers} total</span>
        </div>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} className={({ isActive }) => cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors relative', isActive ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
            {label === 'Chat' && unreadCount > 0 && (
              <span className="ml-auto bg-red-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center badge-pulse">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
            {label === 'Casino' && (
              <span className="ml-auto text-[9px] font-bold text-yellow-400 bg-yellow-400/10 px-1.5 py-0.5 rounded-full">NEW</span>
            )}
          </NavLink>
        ))}
        {profile && ['owner','co-owner','admin','senior-mod','mod'].includes(profile.role) && (
          <NavLink to="/admin" className={({ isActive }) => cn('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors', isActive ? 'bg-primary text-primary-foreground font-semibold' : 'text-muted-foreground hover:bg-secondary hover:text-foreground')}>
            <Shield className="w-4 h-4" />
            {profile.role === 'owner' ? 'Owner Panel' : profile.role === 'co-owner' ? 'Co-Owner Panel' : profile.role === 'admin' ? 'Admin Panel' : profile.role === 'senior-mod' ? 'Senior Mod Panel' : 'Mod Panel'}
          </NavLink>
        )}
      </nav>
      {profile && (
        <button onClick={onProfileClick} className="p-3 border-t border-border hover:bg-secondary transition-colors flex items-center gap-2.5 w-full text-left group">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden flex-shrink-0">
            {profile.profilePic ? <img src={profile.profilePic} alt="pfp" className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-primary">{profile.name[0]?.toUpperCase()}</span>}
          </div>
          <div className="flex-1 min-w-0">
            {profile.nameColor2 ? (
              <p className="text-xs font-semibold truncate" style={{ backgroundImage: `linear-gradient(90deg, ${profile.nameColor}, ${profile.nameColor2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{profile.name}</p>
            ) : (
              <p className="text-xs font-semibold truncate" style={{ color: profile.nameColor }}>{profile.name}</p>
            )}
            {profile.verified && <BadgeCheck className="w-3 h-3 text-blue-400 inline-block ml-0.5" />}
            {profile.activeTitle && <TitleBadge title={profile.activeTitle} effect={profile.activeTitleEffect} color={profile.activeTitleColor} />}
            {(profile.streak || 0) > 0 && (
              <span className="flex items-center gap-0.5 text-[9px] text-orange-400 font-bold"><Flame className="w-2.5 h-2.5" />{formatStreak(profile.streak)}</span>
            )}
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
      )}
      <button onClick={() => logout()} className="px-3 py-2.5 border-t border-border hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2 w-full text-xs font-medium">
        <LogOut className="w-3.5 h-3.5" /> Sign out
      </button>
    </aside>
  );
}
