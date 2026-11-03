import { EFFECT_TO_CLASS, TITLE_FONTS } from '../lib/gameData';
import * as DB from '../lib/storage';

type Props = {
  title: string;
  effect?: string;
  color?: string;
  font?: string;
  size?: 'sm' | 'md';
};

export default function TitleBadge({ title, effect = 'none', color = '#aaaaaa', font, size = 'sm' }: Props) {
  if (!title) return null;
  const cls = EFFECT_TO_CLASS[effect] || '';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const fontKey = font ?? DB.getCustomTitles().find(t => t.name === title)?.font;
  const family = fontKey ? TITLE_FONTS[fontKey]?.family : undefined;
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold border ${textSize} ${cls}`}
      style={{ color, borderColor: color + '55', backgroundColor: color + '18', fontFamily: family, fontSize: fontKey === 'pixel' ? '0.6rem' : undefined }}
    >
      {title}
    </span>
  );
}
