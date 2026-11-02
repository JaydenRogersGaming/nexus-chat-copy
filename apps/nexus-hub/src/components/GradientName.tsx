type Props = {
  name: string;
  color: string;
  color2?: string;
  className?: string;
};

export default function GradientName({ name, color, color2, className = '' }: Props) {
  if (color2) {
    return (
      <span className={className} style={{
        backgroundImage: `linear-gradient(90deg, ${color}, ${color2})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>{name}</span>
    );
  }
  return <span className={className} style={{ color }}>{name}</span>;
}
