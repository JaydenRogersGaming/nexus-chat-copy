// Shared ordering logic for chat messages — used for every sender (you, friends, the bot).
// Rules:
//  1. Messages already on screen never move (their relative order is preserved).
//  2. Newly arrived saved messages are appended at the end, in server order
//     (sentAt ascending, then id) — never inserted between existing messages.
//  3. Your own unsent ("pending") messages always sit at the very end until saved;
//     once saved they keep the spot they already had.

export interface OrderableMessage {
  id: string;
  timestamp: number;
}

function byServerOrder<T extends OrderableMessage>(a: T, b: T) {
  return a.timestamp - b.timestamp || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
}

export function mergeMessages<T extends OrderableMessage>(prev: T[], remote: T[], pending: T[]): T[] {
  const latest = new Map<string, T>();
  for (const m of remote) latest.set(m.id, m);
  const pendingIds = new Set(pending.map(m => m.id));
  for (const m of pending) if (!latest.has(m.id)) latest.set(m.id, m);

  const seen = new Set<string>();
  const out: T[] = [];
  // 1. Keep existing messages where they are (with fresh content), drop ones that vanished.
  for (const m of prev) {
    const fresh = latest.get(m.id);
    if (!fresh || seen.has(m.id)) continue;
    // A still-pending message stays at the end (handled below).
    if (pendingIds.has(m.id) && !remote.some(r => r.id === m.id)) continue;
    seen.add(m.id);
    out.push(fresh);
  }
  // 2. Append newly arrived saved messages in server order.
  for (const m of [...remote].sort(byServerOrder)) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  // 3. Unsaved messages always last.
  for (const m of [...pending].sort((a, b) => a.timestamp - b.timestamp)) {
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    out.push(m);
  }
  return out;
}
