import { useEffect, useState } from 'react';
import { presence, PresenceOutputType } from 'zitejs/api';
import { useApp } from '../contexts/AppContext';

export type OnlineUser = PresenceOutputType['online'][number];

// Pings "I'm here" and fetches everyone online, across all devices, every 10s.
export function useOnlineUsers() {
  const { profile } = useApp();
  const [online, setOnline] = useState<OnlineUser[]>([]);

  useEffect(() => {
    if (!profile) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await presence({
          action: 'ping',
          user: {
            email: profile.email, name: profile.name, profilePic: profile.profilePic || '',
            nameColor: profile.nameColor || '', activeTitle: profile.activeTitle || '',
            activeTitleColor: profile.activeTitleColor || '', activeTitleEffect: profile.activeTitleEffect || '',
            role: profile.role,
          },
        });
        if (alive) setOnline(res.online);
      } catch { /* try again next tick */ }
    };
    tick();
    const t = setInterval(tick, 10000);
    return () => { alive = false; clearInterval(t); };
  }, [profile?.email, profile?.name, profile?.profilePic, profile?.nameColor, profile?.activeTitle, profile?.role]);

  return online;
}
