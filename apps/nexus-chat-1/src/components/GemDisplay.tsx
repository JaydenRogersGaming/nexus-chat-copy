import { useApp } from '../contexts/AppContext';
import { Gem } from 'lucide-react';

export default function GemDisplay() {
  const { profile } = useApp();
  if (!profile) return null;
  return (
    <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 shadow-lg">
      <Gem className="w-4 h-4 text-purple-400 gem-icon" />
      <span className="text-sm font-bold text-purple-300">{(profile.gems ?? 0).toLocaleString()}</span>
    </div>
  );
}
