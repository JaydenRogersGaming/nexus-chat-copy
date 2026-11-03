import { useEffect, useState } from 'react';
import { Languages } from 'lucide-react';
import { translate } from 'zitejs/api';

const cache = new Map<string, string>();
let queue: { lang: string; text: string; resolve: (t: string) => void }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  timer = null;
  const batch = queue; queue = [];
  const byLang = new Map<string, typeof batch>();
  batch.forEach(q => byLang.set(q.lang, [...(byLang.get(q.lang) || []), q]));
  byLang.forEach((items, lang) => {
    for (let i = 0; i < items.length; i += 40) {
      const chunk = items.slice(i, i + 40);
      translate({ lang, texts: chunk.map(c => c.text.slice(0, 500)) })
        .then(r => chunk.forEach((c, j) => { const t = r.translations[j] || c.text; cache.set(`${lang}|${c.text}`, t); c.resolve(t); }))
        .catch(() => chunk.forEach(c => c.resolve(c.text)));
    }
  });
}

function translateBatched(lang: string, text: string) {
  const hit = cache.get(`${lang}|${text}`);
  if (hit) return Promise.resolve(hit);
  return new Promise<string>(resolve => { queue.push({ lang, text, resolve }); if (!timer) timer = setTimeout(flush, 250); });
}

const COMMON_EN = new Set('i you he she it we they the a an and or but is are was were be am to of in on at for with my your me so not no yes yeah lol ok okay hi hey hello what why how who when where this that do does did can will just like im its dont gonna wanna good bad u ur sup bro thanks ty np idk omg wow nice cool fr'.split(' '));
/** Cheap guess so we only call the translator for messages that aren't already English. */
export function looksForeign(text: string): boolean {
  const t = text.replace(/https?:\/\/\S+|@\w+|\[gif\]\S*/g, '');
  const letters: string[] = t.match(/\p{L}/gu) ?? [];
  if (!letters.length) return false;
  const nonLatin = letters.filter(c => !/[a-zA-Z]/.test(c)).length;
  if (nonLatin / letters.length > 0.15) return true;
  const words: string[] = t.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length < 3) return false;
  return !words.some(w => COMMON_EN.has(w.replace(/'/g, '')));
}

/** Shows a chat message; auto-translates into `lang` (non-English) and lets anyone flip between original/translation. */
export default function TranslatedText({ text, auto, style }: { text: string; lang?: string; auto: boolean; style?: React.CSSProperties }) {
  const target = 'en';
  // Only messages that aren't already English get translated
  const foreign = looksForeign(text);
  const [on, setOn] = useState(auto && foreign);
  const [tr, setTr] = useState<string | null>(cache.get(`${target}|${text}`) ?? null);
  useEffect(() => {
    if (!on || tr || !text.trim()) return;
    let alive = true;
    translateBatched(target, text).then(t => alive && setTr(t));
    return () => { alive = false; };
  }, [on, tr, text, target]);
  const showing = on && tr && tr.trim() !== text.trim();
  return (
    <span data-no-translate>
      <span style={style}>{showing ? tr : text}</span>
      {(foreign || auto) && text.trim() && <button type="button" onClick={() => setOn(o => !o)} title={showing ? 'Show original' : 'Translate to English'}
        className="ml-1.5 inline-flex items-center gap-0.5 align-middle text-[10px] text-muted-foreground hover:text-primary opacity-60 hover:opacity-100">
        <Languages className="w-3 h-3" />{showing ? 'original' : on && !tr ? '…' : 'translate'}
      </button>}
    </span>
  );
}
