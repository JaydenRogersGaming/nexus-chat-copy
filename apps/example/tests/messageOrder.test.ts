// Run with: npx tsx apps/nexus-chat-1/tests/messageOrder.test.ts
import assert from 'node:assert/strict';
import { mergeMessages } from '../src/lib/messageOrder';

type M = { id: string; timestamp: number; sender: string };
const msg = (id: string, timestamp: number, sender: string): M => ({ id, timestamp, sender });
const ids = (list: M[]) => list.map(m => m.id);

// 1. Initial load from server keeps chronological order across users.
let screen = mergeMessages<M>([], [msg('a1', 1000, 'alice'), msg('b1', 2000, 'bob')], []);
assert.deepEqual(ids(screen), ['a1', 'b1']);

// 2. Alice sends a message: it shows at the end while still saving.
const pending = msg('a2', 3000, 'alice');
screen = mergeMessages(screen, [msg('a1', 1000, 'alice'), msg('b1', 2000, 'bob')], [pending]);
assert.deepEqual(ids(screen), ['a1', 'b1', 'a2']);

// 3. Bob's reply arrives while Alice's message is still saving: Bob's is appended after
//    the saved messages, and Alice's unsaved message stays last until it's saved.
screen = mergeMessages(screen, [msg('a1', 1000, 'alice'), msg('b1', 2000, 'bob'), msg('b2', 3500, 'bob')], [pending]);
assert.deepEqual(ids(screen), ['a1', 'b1', 'b2', 'a2']);

// 4. Once Alice's message is saved, nothing moves (no jumping around).
screen = mergeMessages(screen, [msg('a1', 1000, 'alice'), msg('b1', 2000, 'bob'), msg('a2', 3100, 'alice'), msg('b2', 3500, 'bob')], []);
assert.deepEqual(ids(screen), ['a1', 'b1', 'b2', 'a2']);

// 5. A message whose clock is "in the past" (sender's device skew) is still added to the end,
//    never inserted beneath an older message.
screen = mergeMessages(screen, [msg('a1', 1000, 'alice'), msg('c1', 1500, 'carol'), msg('b1', 2000, 'bob'), msg('a2', 3100, 'alice'), msg('b2', 3500, 'bob')], []);
assert.deepEqual(ids(screen), ['a1', 'b1', 'b2', 'a2', 'c1']);

// 6. Several new messages from different users in one poll are appended in server order.
screen = mergeMessages([], [msg('x', 10, 'bob'), msg('y', 20, 'alice'), msg('z', 20, 'carol')], []);
assert.deepEqual(ids(screen), ['x', 'y', 'z']);

// 7. Deleted messages disappear without reordering the rest.
screen = mergeMessages(screen, [msg('x', 10, 'bob'), msg('z', 20, 'carol')], []);
assert.deepEqual(ids(screen), ['x', 'z']);

console.log('✅ messageOrder: all tests passed');
