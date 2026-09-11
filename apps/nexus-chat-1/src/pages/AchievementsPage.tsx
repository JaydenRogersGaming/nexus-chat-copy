import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { ACHIEVEMENTS } from '../lib/gameData';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { cn } from '@project/components/lib/utils';

export default function AchievementsPage() {
  const { profile } = useApp();
  const [earned, setEarned] = useState<string[]>([]);

  useEffect(() => { if (profile) setEarned(DB.getUserAchievements(profile.email)); }, [profile]);

  const earnedCount = earned.length;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 h-full overflow-y-auto">
      <div className="text-center mb-6">
        <Star className="w-10 h-10 text-yellow-400 mx-auto mb-2" />
        <h1 className="text-2xl font-black">Achievements</h1>
        <p className="text-muted-foreground text-sm">{earnedCount} / {totalCount} unlocked</p>
        <div className="mt-3 bg-secondary rounded-full h-2 max-w-xs mx-auto overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all" style={{ width: `${(earnedCount/totalCount)*100}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ACHIEVEMENTS.map(a => {
          const isEarned = earned.includes(a.id);
          return (
            <div key={a.id} className={cn('p-4 rounded-xl border transition-all', isEarned ? 'border-yellow-500/40 bg-yellow-500/10 shadow-lg' : 'border-border bg-card/50 opacity-60 grayscale')}>
              <div className="flex items-start gap-3">
                <span className="text-3xl">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm truncate">{a.name}</h3>
                    {isEarned && <span className="text-yellow-400 text-xs">✓</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.description}</p>
                  {a.gems > 0 && (
                    <p className="text-xs text-purple-400 mt-1">+{a.gems} gems reward</p>
                  )}
                </div>
              </div>
              {isEarned && <div className="mt-2 text-[10px] text-yellow-500 font-semibold">🏆 UNLOCKED</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
