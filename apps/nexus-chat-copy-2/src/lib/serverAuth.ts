// Server-only helpers (imported by endpoints in src/api). Never import from UI code.
import { zite } from 'zitejs/db';
import { ZiteError } from 'zitejs/backend';
import { Actor, isOwnerEmail, Permission, can } from './permissions';

export async function loadActor(email: string): Promise<Actor> {
  const e = email.toLowerCase();
  const { rows } = await zite.sql({
    query: `SELECT "role","marketRole","accountRestriction" FROM "Presence" WHERE lower("email") = $1 LIMIT 1`,
    params: [e],
  });
  const r = rows[0];
  return {
    email: e,
    chatRole: isOwnerEmail(e) ? 'owner' : String(r?.role || 'user'),
    marketRole: String(r?.marketRole || 'Customer'),
    restriction: String(r?.accountRestriction || 'None'),
  };
}

export async function requirePerm(email: string, p: Permission): Promise<Actor> {
  const a = await loadActor(email);
  if (!can(a, p)) throw new ZiteError({ code: 'FORBIDDEN', message: `missing ${p}`, userFacingMessage: "You don't have permission to do that." });
  return a;
}

export function deny(msg: string): never {
  throw new ZiteError({ code: 'FORBIDDEN', message: msg, userFacingMessage: msg });
}

export function bad(msg: string): never {
  throw new ZiteError({ code: 'BAD_REQUEST', message: msg, userFacingMessage: msg });
}

export async function audit(actorEmail: string, action: string, target: string, details = '') {
  await zite.auditLog.create({ record: { action, actorEmail, target, details: details.slice(0, 2000) } });
}
