import { useCallback, useEffect, useState } from 'react';
import { customLimited, CustomLimitedOutputType } from 'zitejs/api';
import { setOwnerLimited, type BgTheme, type TypingStyle } from '../lib/cosmetics';

export type OwnerItem = CustomLimitedOutputType['items'][0];
const CHANGED = 'nexus-owner-limited';

export const bgCss = (i: OwnerItem) =>
  `radial-gradient(circle at 80% 15%, ${i.color2}66, transparent 45%), linear-gradient(135deg, ${i.color}, ${i.color2})`;

function register(items: OwnerItem[]) {
  const bg: BgTheme[] = items.filter(i => i.kind === 'Background').map(i => ({ id: `own-${i.id}`, name: `${i.emoji} ${i.name}`, cost: i.cost, css: bgCss(i) }));
  const typing: TypingStyle[] = items.filter(i => i.kind === 'Typing Effect').map(i => ({
    id: `own-${i.id}`, name: `${i.emoji} ${i.name}`, cost: i.cost, text: `${i.typingText} ${i.emoji}`,
    className: `limited-typing ${i.effect === 'rainbow' ? 'title-rainbow' : i.effect === 'pulse' ? 'animate-pulse' : ''}`.trim(), color: i.color,
  }));
  setOwnerLimited(bg, typing);
}

/** Loads owner-made limited items and keeps cosmetics in sync. */
export function useOwnerLimited() {
  const [items, setItems] = useState<OwnerItem[]>([]);
  const load = useCallback(() => customLimited({ action: 'list' }).then(r => { setItems(r.items); register(r.items); }).catch(() => {}), []);
  useEffect(() => {
    load();
    window.addEventListener(CHANGED, load);
    return () => window.removeEventListener(CHANGED, load);
  }, [load]);
  const mutate = async (input: Parameters<typeof customLimited>[0]) => {
    const r = await customLimited(input);
    setItems(r.items); register(r.items); window.dispatchEvent(new Event(CHANGED));
  };
  return { items, mutate };
}
