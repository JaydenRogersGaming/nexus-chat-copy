import { useCallback, useEffect, useState } from 'react';
import { Trophy, Plus, Clock, Crown, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tournaments, TournamentsOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { toast } from 'sonner';
import { useApp } from '../contexts/AppContext';
import { ReactionGame, ClickFrenzyGame, SpeedTypingGame } from '../components/tournament/MiniGames';
import CreateTournament from '../components/tournament/CreateTournament';

type T = TournamentsOutputType['tournaments'][0];
const STAFF = ['owner', 'co-owner', 'admin', 'senior-mod', 'mod'];
const ICON: Record<string, string> = { Reaction: '⚡', 'Click Frenzy': '👆', 'Speed Typing': '⌨️' };

function Board({ t, me }: { t: T; me: string }) {
  if (!t.leaderboard.length) return <p className="text-xs text-muted-foreground">No scores yet — be the first!</p>;
  return (
    <ol className="space-y-1">
      {t.leaderboard.map((r, i) => (
        <li key={r.email} className={`flex items-center gap-2 text-sm px-2 py-1 rounded ${r.email === me ? 'bg-primary/10' : ''}`}>
          <span className="w-5 text-center font-bold">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}</span>
          <span className="flex-1 truncate">{r.name}</span>
          <span className="text-[10px] text-muted-foreground">{r.attempts} tries</span>
          <span className="font-mono font-semibold">{r.score}</span>
        </li>
      ))}
    </ol>
  );
}

export default function TournamentPage() {
  const { profile, isRealOwner, addGems } = useApp();
  const me = (profile?.email || '').toLowerCase();
  const isStaff = isRealOwner || STAFF.includes(profile?.role || '');
  const [list, setList] = useState<T[] | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => tournaments({ action: 'list' }).then(r => setList(r.tournaments)).catch(() => setList([])), []);
  useEffect(() => { load(); const i = setInterval(load, 15000); return () => clearInterval(i); }, [load]);

  const current = list?.find(t => t.id === active);

  const finish = useCallback(async (score: number) => {
    if (!active) return;
    toast.success(`Score: ${score}`);
    try { await tournaments({ action: 'submit', tournamentId: active, score, playerName: profile?.name }); load(); }
    catch (e) { toast.error((e as Error).message || 'Could not submit'); }
  }, [active, profile?.name, load]);

  async function claim(t: T) {
    try {
      const r = await tournaments({ action: 'claim', tournamentId: t.id });
      addGems(r.prize);
      toast.success(`You won ${r.prize} gems! 🏆`);
      load();
    } catch (e) { toast.error((e as Error).message || 'Could not claim'); }
  }

  async function remove(t: T) {
    try { await tournaments({ action: 'delete', tournamentId: t.id }); if (active === t.id) setActive(null); load(); }
    catch (e) { toast.error((e as Error).message || 'Could not delete'); }
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Trophy className="w-6 h-6 text-primary" /> Mini-Game Tournaments</h1>
          <p className="text-sm text-muted-foreground">Play as many times as you like — your best score counts. Top player wins the gems.</p>
        </div>
        {isStaff && <Button onClick={() => setCreating(true)} className="gap-1.5"><Plus className="w-4 h-4" />New</Button>}
      </div>

      {current && !current.ended && (
        <div className="rounded-2xl border border-primary/40 bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-bold">{ICON[current.game]} {current.title}</p>
            <Button size="sm" variant="ghost" onClick={() => setActive(null)}>Close</Button>
          </div>
          {current.game === 'Reaction' && <ReactionGame onFinish={finish} />}
          {current.game === 'Click Frenzy' && <ClickFrenzyGame onFinish={finish} />}
          {current.game === 'Speed Typing' && <SpeedTypingGame onFinish={finish} />}
        </div>
      )}

      {!list ? <div className="grid md:grid-cols-2 gap-4">{[0, 1].map(i => <Skeleton key={i} className="h-56 rounded-2xl" />)}</div>
        : !list.length ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-2xl">
            <Trophy className="w-10 h-10 mx-auto mb-2 opacity-40" />
            No tournaments yet.{isStaff ? ' Start one with the New button.' : ' Check back soon!'}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {list.map(t => {
              const winner = t.leaderboard[0];
              return (
                <div key={t.id} className={`rounded-2xl border border-border bg-card p-4 space-y-3 ${t.ended ? 'opacity-80' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold truncate">{ICON[t.game]} {t.title}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />
                        {t.ended ? 'Ended' : `Ends ${formatDistanceToNow(new Date(t.endsAt), { addSuffix: true })}`} · 💎 {t.prizeGems}
                      </p>
                    </div>
                    {isStaff && <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => remove(t)}><Trash2 className="w-3.5 h-3.5" /></Button>}
                  </div>
                  <Board t={t} me={me} />
                  {!t.ended && <Button size="sm" className="w-full" onClick={() => setActive(t.id)}>Play</Button>}
                  {t.ended && winner && (
                    <div className="flex items-center gap-2 text-sm"><Crown className="w-4 h-4 text-primary" /> Winner: <b>{winner.name}</b>
                      {winner.email === me && !t.prizePaid && <Button size="sm" className="ml-auto" onClick={() => claim(t)}>Claim prize</Button>}
                      {t.prizePaid && <span className="ml-auto text-xs text-muted-foreground">Prize claimed</span>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      <CreateTournament open={creating} onOpenChange={setCreating} onCreated={load} />
    </div>
  );
}
