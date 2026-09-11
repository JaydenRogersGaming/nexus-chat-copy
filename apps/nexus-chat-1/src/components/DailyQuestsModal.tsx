import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@project/components/ui/dialog';
import { Button } from '@project/components/ui/button';
import { Progress } from '@project/components/ui/progress';
import { useApp } from '../contexts/AppContext';
import * as DB from '../lib/storage';
import { toast } from 'sonner';
import { Flame, Gift } from 'lucide-react';

type Props = { open: boolean; onClose: () => void };

export default function DailyQuestsModal({ open, onClose }: Props) {
  const { profile, refreshProfile } = useApp();
  const [questProgress, setQuestProgress] = useState<DB.DailyQuestProgress | null>(null);

  useEffect(() => {
    if (!open || !profile) return;
    setQuestProgress(DB.getDailyQuestProgress(profile.email));
    const t = setInterval(() => setQuestProgress(DB.getDailyQuestProgress(profile.email)), 3000);
    return () => clearInterval(t);
  }, [open, profile?.email]);

  function claim(questId: string) {
    if (!profile) return;
    const reward = DB.claimQuestReward(profile.email, questId);
    if (reward > 0) {
      toast.success(`💎 +${reward} gems claimed!`);
      refreshProfile();
      setQuestProgress(DB.getDailyQuestProgress(profile.email));
    }
  }

  if (!profile || !questProgress) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Gift className="w-5 h-5 text-yellow-400" />
            Daily Quests
          </DialogTitle>
        </DialogHeader>

        {/* Streak display */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
          <Flame className="w-8 h-8 text-orange-400" />
          <div>
            <p className="text-2xl font-black text-orange-400">{profile.streak || 0}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">Day Streak</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Log in daily to</p>
            <p className="text-xs text-muted-foreground">keep your streak!</p>
          </div>
        </div>

        {/* Quests */}
        <div className="space-y-2 mt-2">
          {DB.DAILY_QUESTS.map(quest => {
            const current = Math.min(questProgress.progress[quest.id] || 0, quest.target);
            const done = current >= quest.target;
            const claimed = questProgress.claimed.includes(quest.id);
            const pct = Math.round((current / quest.target) * 100);

            return (
              <div key={quest.id} className={`p-3 rounded-xl border transition-colors ${claimed ? 'bg-green-500/5 border-green-500/20' : done ? 'bg-yellow-500/5 border-yellow-500/30' : 'bg-secondary/30 border-border'}`}>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl">{quest.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold">{quest.title}</p>
                      <span className="text-xs font-bold text-yellow-400">💎 {quest.reward}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{quest.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Progress value={pct} className="h-1.5 flex-1" />
                      <span className="text-[10px] text-muted-foreground font-mono">{current}/{quest.target}</span>
                    </div>
                  </div>
                  {claimed ? (
                    <span className="text-xs font-bold text-green-400">✓</span>
                  ) : done ? (
                    <Button size="sm" variant="default" className="text-xs h-7 px-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold" onClick={() => claim(quest.id)}>
                      Claim
                    </Button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-[10px] text-center text-muted-foreground mt-2">Quests reset every day at midnight</p>
      </DialogContent>
    </Dialog>
  );
}
