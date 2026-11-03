import { useEffect, useState } from 'react';
import { events as eventsApi } from 'zitejs/api';
import { getActiveEvent, Override, ActiveEvent, getCountry, COUNTRY_CHANGED } from '../lib/holidays';

export const EVENTS_CHANGED = 'nexus-events-changed';
let cache: Override[] = [];

/** Current holiday event (or null), with owner overrides from the server. Re-checks every 5 minutes. */
export function useActiveEvent() {
  const [overrides, setOverrides] = useState<Override[]>(cache);
  const [country, setCountryState] = useState(getCountry());
  const [, tick] = useState(0);
  // Re-check every 30s so the shop switches to the next holiday as soon as one ends
  useEffect(() => { const t = setInterval(() => tick(n => n + 1), 30_000); return () => clearInterval(t); }, []);
  useEffect(() => {
    let alive = true;
    const load = () => eventsApi({ action: 'list' }).then(r => { cache = r.overrides; if (alive) setOverrides(r.overrides); }).catch(() => {});
    const onCountry = () => setCountryState(getCountry());
    load();
    const t = setInterval(load, 5 * 60 * 1000);
    window.addEventListener(EVENTS_CHANGED, load);
    window.addEventListener(COUNTRY_CHANGED, onCountry);
    return () => { alive = false; clearInterval(t); window.removeEventListener(EVENTS_CHANGED, load); window.removeEventListener(COUNTRY_CHANGED, onCountry); };
  }, []);
  const active: ActiveEvent | null = getActiveEvent(overrides, new Date(), country);
  return { active, overrides, country };
}
