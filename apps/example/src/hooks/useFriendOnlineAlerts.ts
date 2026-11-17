import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { friends } from 'zitejs/api';
import { usePresence } from './useOnlineUsers';
import { useApp } from '../contexts/AppContext';

const norm = (e: string) => e.trim().toLowerCase();

/** Toasts when one of your friends comes online (checked against live presence). */
export function useFriendOnlineAlerts() {
  const { profile } = useApp();
  const { online } = usePresence();
  const friendSet = useRef<Set<string>>(new Set());
  const wasOnline = useRef<Set<string>>(new Set());
  const seeded = useRef(false);

  // Keep the friend list fresh.
  useEffect(() => {
    if (!profile) return;
    let alive = true;
    const load = async () => {
      try { const r = await friends({ action: 'list' }); if (alive) friendSet.current = new Set(r.friends.map(norm)); }
      catch { /* retry next cycle */ }
    };
    load();
    const t = setInterval(load, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [profile?.email]);

  // Compare the online set each tick; alert on friends that just appeared.
  useEffect(() => {
    const nowOnline = new Set(online.map(u => norm(u.email)).filter(e => friendSet.current.has(e)));
    if (!seeded.current) { wasOnline.current = nowOnline; seeded.current = true; return; }
    for (const u of online) {
      const e = norm(u.email);
      if (friendSet.current.has(e) && !wasOnline.current.has(e)) {
        toast(`${u.name} is online 🟢`, { description: 'Your friend just came online.' });
      }
    }
    wasOnline.current = nowOnline;
  }, [online]);
}
