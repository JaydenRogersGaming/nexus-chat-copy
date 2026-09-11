import { EFFECT_TO_CLASS } from '../lib/gameData';

type Props = {
  title: string;
  effect?: string;
  color?: string;
  size?: 'sm' | 'md';
};

export default function TitleBadge({ title, effect = 'none', color = '#aaaaaa', size = 'sm' }: Props) {
  if (!title) return null;
  const cls = EFFECT_TO_CLASS[effect] || '';
  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded font-semibold border ${textSize} ${cls}`}
      style={{ color, borderColor: color + '55', backgroundColor: color + '18' }}
    >
      {title}
    </span>
  );
}
