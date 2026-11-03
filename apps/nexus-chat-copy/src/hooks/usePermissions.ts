import { useEffect, useState } from 'react';
import { adminUsers } from 'zitejs/api';

export function errMsg(e: unknown, fallback = 'Something went wrong') {
  const err = e as { userFacingMessage?: string; message?: string };
  return err?.userFacingMessage || err?.message || fallback;
}

export function usePermissions() {
  const [perms, setPerms] = useState<string[] | null>(null);
  const [marketRole, setMarketRole] = useState('Customer');
  const [restriction, setRestriction] = useState('None');
  useEffect(() => {
    adminUsers({ action: 'me' })
      .then(r => { setPerms(r.permissions); setMarketRole(r.marketRole); setRestriction(r.restriction); })
      .catch(() => setPerms([]));
  }, []);
  return { perms, has: (p: string) => !!perms?.includes(p), marketRole, restriction, loading: perms === null };
}

export const money = (n: number) => n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
export const when = (s: string) => (s ? new Date(s).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');
