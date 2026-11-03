// Pure word-filter helpers shared by the server and the browser.
const escapeRe = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** Whole-word match only: "ass" blocks "ass" but not "class" or "pass". */
const wordRe = (w: string, flags: string) => new RegExp('(?<![\\p{L}\\p{N}])' + escapeRe(w) + '(?![\\p{L}\\p{N}])', flags + 'u');

export function filterText(text: string, words: string[]): { text: string; hit: boolean } {
  let out = text; let hit = false;
  for (const w of words) {
    if (!w) continue;
    out = out.replace(wordRe(w, 'gi'), m => { hit = true; return '#'.repeat(m.length); });
  }
  return { text: out, hit };
}
