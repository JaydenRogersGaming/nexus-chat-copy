import { useEffect, useState } from 'react';
import { bans } from 'zitejs/api';

export type ServerBan = { bannedBy: string; banType: string; reason: string };

export function getDeviceId() {
  let id = localStorage.getItem('nexus_device_id');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('nexus_device_id', id); }
  return id;
}

export async function getMyIp(): Promise<string> {
  try {
    const r = await fetch('https://api.ipify.org?format=json');
    return ((await r.json()) as { ip: string }).ip || '';
  } catch { return ''; }
}

/** Checks the shared ban list (email, IP and device) for the signed-in user. */
export function useServerBan(enabled: boolean) {
  const [ban, setBan] = useState<ServerBan | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    const run = async () => {
      try {
        const res = await bans({ action: 'check', ip: await getMyIp(), deviceId: getDeviceId() });
        if (alive) setBan(res.ban);
      } catch { /* ignore network errors */ }
    };
    run();
    const t = setInterval(run, 60000);
    return () => { alive = false; clearInterval(t); };
  }, [enabled]);
  return ban;
}
