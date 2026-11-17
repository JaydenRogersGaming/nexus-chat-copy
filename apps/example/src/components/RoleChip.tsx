type Props = { name: string; color?: string; color2?: string; icon?: string; className?: string };

// Custom role badge — one color, or a two-color gradient when color2 is set
export default function RoleChip({ name, color = '#aaaaaa', color2, icon, className = '' }: Props) {
  const text = color2
    ? { backgroundImage: `linear-gradient(90deg, ${color}, ${color2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }
    : { color };
  return (
    <span className={`inline-flex items-center gap-1 font-bold px-1.5 py-0.5 rounded border ${className}`}
      style={{
        borderColor: color + '66',
        background: color2 ? `linear-gradient(90deg, ${color}22, ${color2}22)` : color + '18',
      }}>
      {icon && <span>{icon}</span>}
      <span style={text}>{name}</span>
    </span>
  );
}
