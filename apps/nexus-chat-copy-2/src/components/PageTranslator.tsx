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
      document.querySelectorAll('[data-tr-placeholder],[data-tr-title],[data-tr-aria-label]').forEach(el => {
        ['placeholder', 'title', 'aria-label'].forEach(a => { const o = el.getAttribute(`data-tr-${a}`); if (o !== null) el.setAttribute(a, o); });
      });
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

    const ATTRS = ['placeholder', 'title', 'aria-label'];
    const attrEls = new Set<Element>();
    const visitAttrs = (el: Element) => {
      if (el.closest('[data-no-translate]')) return;
      ATTRS.forEach(a => {
        const v = el.getAttribute(a); if (!v) return;
        const ok = `data-tr-${a}`;
        let orig = el.getAttribute(ok);
        if (orig === null || (v !== orig && v !== cache[orig.trim()])) { orig = v; el.setAttribute(ok, v); }
        if (!shouldTranslate(orig)) return;
        attrEls.add(el);
        const tr = cache[orig.trim()];
        if (tr) { if (v !== tr) { applying = true; el.setAttribute(a, tr); applying = false; } } else pending.add(orig.trim());
      });
    };
    const scan = (root: Node) => {
      if (root.nodeType === Node.TEXT_NODE) { visit(root as Text); return; }
      if (root.nodeType !== Node.ELEMENT_NODE) return;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      while (w.nextNode()) visit(w.currentNode as Text);
      const el = root as Element;
      visitAttrs(el);
      el.querySelectorAll('[placeholder],[title],[aria-label]').forEach(visitAttrs);
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
        attrEls.forEach(el => el.isConnected ? visitAttrs(el) : attrEls.delete(el));
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
        else if (m.type === 'attributes') visitAttrs(m.target as Element);
        m.addedNodes.forEach(scan);
      });
      if (pending.size) schedule();
    });
    obs.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    return () => { obs.disconnect(); clearTimeout(timer); };
  }, [lang]);

  return null;
}
