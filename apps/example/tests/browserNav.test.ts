// Run: npx tsx --test tests/browserNav.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
const expect = (a: unknown) => ({ toBe: (b: unknown) => assert.equal(a, b), toEqual: (b: unknown) => assert.deepEqual(a, b), toMatch: (r: RegExp) => assert.match(String(a), r) });
import { HOME, classifyInput, searchEntry, queryOf, isSafeUrl, push, step, canBack, canForward, closeTab, cycleTab, errorMessage, NavTab } from '../src/lib/browserNav';

const tab = (id: number, history = [HOME], idx = 0): NavTab => ({ id, history, idx });

describe('search vs URL', () => {
  it('treats URLs as URLs', () => {
    expect(classifyInput('https://example.com')).toBe('https://example.com');
    expect(classifyInput('example.com/path')).toBe('https://example.com/path');
    expect(classifyInput('localhost:3000')).toBe('http://localhost:3000');
  });
  it('treats everything else as a search', () => {
    expect(classifyInput('how do volcanoes work')).toBe(searchEntry('how do volcanoes work'));
    expect(classifyInput('node.js tutorial')).toBe(searchEntry('node.js tutorial'));
    expect(queryOf(classifyInput('cats & dogs'))).toBe('cats & dogs');
  });
  it('empty input goes home', () => expect(classifyInput('   ')).toBe(HOME));
});

describe('security', () => {
  it('only allows http(s)', () => {
    expect(isSafeUrl('https://a.com')).toBe(true);
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,hi')).toBe(false);
    expect(isSafeUrl('file:///etc/passwd')).toBe(false);
  });
});

describe('navigation', () => {
  it('push, back, forward', () => {
    let t = push(push(tab(1), 'https://a.com'), 'https://b.com');
    expect(t.history).toEqual([HOME, 'https://a.com', 'https://b.com']);
    t = step(t, -1);
    expect(canForward(t)).toBe(true);
    t = push(t, 'https://c.com');
    expect(t.history).toEqual([HOME, 'https://a.com', 'https://c.com']);
    expect(canForward(t)).toBe(false);
  });
  it('step stays in bounds', () => {
    const t = tab(1);
    expect(step(t, -1)).toBe(t);
    expect(step(t, 1)).toBe(t);
    expect(canBack(t)).toBe(false);
  });
  it('does not duplicate same entry', () => {
    const t = push(tab(1), 'https://a.com');
    expect(push(t, 'https://a.com').history.length).toBe(2);
  });
});

describe('tabs', () => {
  const make = () => tab(99);
  it('closing active picks a neighbour', () => {
    const r = closeTab([tab(1), tab(2), tab(3)], 2, 2, make);
    expect(r.tabs.map(t => t.id)).toEqual([1, 3]);
    expect(r.activeId).toBe(3);
  });
  it('closing last active tab picks previous', () => {
    expect(closeTab([tab(1), tab(2)], 2, 2, make).activeId).toBe(1);
  });
  it('closing inactive keeps active', () => {
    expect(closeTab([tab(1), tab(2)], 1, 2, make).activeId).toBe(2);
  });
  it('never leaves zero tabs', () => {
    const r = closeTab([tab(1)], 1, 1, make);
    expect(r.tabs.map(t => t.id)).toEqual([99]);
    expect(r.activeId).toBe(99);
  });
  it('cycles with wrap-around', () => {
    const ts = [tab(1), tab(2), tab(3)];
    expect(cycleTab(ts, 3, 1)).toBe(1);
    expect(cycleTab(ts, 1, -1)).toBe(3);
  });
});

describe('errors', () => {
  it('has friendly messages and a fallback', () => {
    expect(errorMessage('OFFLINE')).toMatch(/offline/i);
    expect(errorMessage('WHATEVER')).toMatch(/something went wrong/i);
  });
});
