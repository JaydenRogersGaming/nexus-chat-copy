import { useEffect, useState } from 'react';
import { events as eventsApi } from 'zitejs/api';
import { getActiveEvent, Override, ActiveEvent } from '../lib/holidays';

export const EVENTS_CHANGED = 'nexus-events-changed';
let cache: Override[] = [];

/** Current holiday event (or null), with owner overrides from the server. Re-checks every 5 minutes. */
export function useActiveEvent() {
  const [overrides, setOverrides] = useState<Override[]>(cache);
  useEffect(() => {
    let alive = true;
    const load = () => eventsApi({ action: 'list' }).then(r => { cache = r.overrides; if (alive) setOverrides(r.overrides); }).catch(() => {});
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    window.addEventListener(EVENTS_CHANGED, load);
    return () => { alive = false; clearInterval(t); window.removeEventListener(EVENTS_CHANGED, load); };
  }, []);
  const active: ActiveEvent | null = getActiveEvent(overrides);
  return { active, overrides };
}
