import { useEffect } from 'react';
import { translate } from 'zitejs/api';

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'NOSCRIPT']);
const RTL = new Set(['ar', 'he', 'fa', 'ur']);
const originals = new WeakMap<Text, string>();
const tracked = new Set<Text>();

function shouldTranslate(s: string) {
  const t = s.trim();
  return t.length > 1 && t.length <= 500 && /[A-Za-z]{2}/.test(t);
}

/** Translates every visible piece of interface text into the user's chosen language. */
export default function PageTranslator({ lang }: { lang: string }) {
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang || 'en';
    html.dir = RTL.has(lang) ? 'rtl' : 'ltr';

    // Back to English: restore every original string
    if (!lang || lang === 'en') {
      tracked.forEach(n => { const o = originals.get(n); if (o !== undefined && n.isConnected) n.nodeValue = o; });
      tracked.clear();
      return;
    }

    const cacheKey = `nexus_tr:${lang}`;
    const cache: Record<string, string> = (() => { try { return JSON.parse(localStorage.getItem(cacheKey) || '{}'); } catch { return {}; } })();
    const pending = new Set<string>();
    let timer: number | undefined;
    let applying = false;

    const apply = (n: Text) => {
      const orig = originals.get(n)!;
      const key = orig.trim();
      const tr = cache[key];
      if (tr && n.nodeValue !== orig.replace(key, tr)) { applying = true; n.nodeValue = orig.replace(key, tr); applying = false; }
    };

    const visit = (n: Text) => {
      const p = n.parentElement;
      if (!p || SKIP.has(p.tagName) || p.closest('[data-no-translate],[contenteditable="true"]')) return;
      const cur = n.nodeValue || '';
      const known = originals.get(n);
      // Text changed by React (not by us) → treat as a new original
      if (known === undefined || (cur !== known && !Object.values(cache).some(v => cur.includes(v)))) originals.set(n, cur);
      const orig = originals.get(n)!;
      if (!shouldTranslate(orig)) return;
      tracked.add(n);
      if (cache[orig.trim()]) apply(n); else pending.add(orig.trim());
    };

    const scan = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) { visit(root as Text); return; }
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) visit(w.currentNode as Text);
    };

    const flush = async () => {
      const batch = [...pending].slice(0, 80);
      if (!batch.length) return;
      batch.forEach(b => pending.delete(b));
      try {
        const { translations } = await translate({ lang, texts: batch });
        batch.forEach((b, i) => { cache[b] = translations[i]; });
        localStorage.setItem(cacheKey, JSON.stringify(cache));
        tracked.forEach(n => n.isConnected ? apply(n) : tracked.delete(n));
      } catch { /* keep English if translation fails */ }
      if (pending.size) timer = window.setTimeout(flush, 300);
    };
    const schedule = () => { clearTimeout(timer); timer = window.setTimeout(flush, 400); };

    scan(document.body);
    schedule();
    const obs = new MutationObserver(muts => {
      if (applying) return;
      muts.forEach(m => {
        if (m.type === 'characterData') scan(m.target);
        m.addedNodes.forEach(scan);
      });
      if (pending.size) schedule();
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => { obs.disconnect(); clearTimeout(timer); };
  }, [lang]);

  return null;
}
