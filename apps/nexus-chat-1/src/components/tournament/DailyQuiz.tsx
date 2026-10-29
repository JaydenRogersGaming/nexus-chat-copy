import { useState } from 'react';
import { Brain, Loader2 } from 'lucide-react';
import { dailyQuiz, DailyQuizOutputType } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Input } from '@project/components/ui/input';
import { toast } from 'sonner';
import { useApp } from '../../contexts/AppContext';

const LEVELS = [
  { name: 'Easy', mult: 1 }, { name: 'Medium', mult: 2 }, { name: 'Hard', mult: 4 },
  { name: 'Expert', mult: 8 }, { name: 'High school', mult: 16 }, { name: 'College', mult: 32 },
];
const BASE = 25; // gems per correct answer, times the level multiplier
const SUBJECTS = ['Math', 'Science', 'History', 'Geography', 'Animals', 'Space', 'Movies', 'Sports'];
const today = () => new Date().toISOString().slice(0, 10);
const key = (email: string) => `nexus_quiz_${email}`;

export default function DailyQuiz() {
  const { profile, addGems } = useApp();
  const email = profile?.email || '';
  const [done, setDone] = useState(() => localStorage.getItem(key(email)) === today());
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState(LEVELS[0]);
  const [qs, setQs] = useState<DailyQuizOutputType['questions'] | null>(null);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);

  async function start() {
    if (!subject.trim()) { toast.error('Pick a subject'); return; }
    setLoading(true);
    try {
      const r = await dailyQuiz({ subject, level: level.name });
      localStorage.setItem(key(email), today()); // uses today's one try
      setDone(true); setQs(r.questions); setI(0); setScore(0);
    } catch (e) { toast.error((e as Error).message || 'Could not start quiz'); }
    finally { setLoading(false); }
  }

  function answer(idx: number) {
    if (!qs) return;
    const right = idx === qs[i].answerIndex;
    const s = score + (right ? 1 : 0);
    toast[right ? 'success' : 'error'](right ? 'Correct!' : `Wrong — it was "${qs[i].choices[qs[i].answerIndex]}"`);
    if (i + 1 < qs.length) { setScore(s); setI(i + 1); return; }
    const won = s * BASE * level.mult;
    if (won > 0) addGems(won);
    toast.success(`${s}/${qs.length} right — you earned 💎 ${won}!`);
    setQs(null);
  }

  return (
    <div className="rounded-2xl border border-primary/40 bg-card p-4 space-y-3">
      <p className="font-bold flex items-center gap-2"><Brain className="w-5 h-5 text-primary" /> Daily Quiz Challenge</p>
      {qs ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Question {i + 1}/{qs.length} · {level.name} (×{level.mult})</p>
          <p className="font-semibold">{qs[i].question}</p>
          <div className="grid sm:grid-cols-2 gap-2">
            {qs[i].choices.map((c, k) => <Button key={k} variant="outline" className="h-auto whitespace-normal py-2" onClick={() => answer(k)}>{c}</Button>)}
          </div>
        </div>
      ) : done ? (
        <p className="text-sm text-muted-foreground">You've used today's quiz. Come back tomorrow for another try!</p>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Pick any subject and a level. Each right answer pays 💎 {BASE} × the level multiplier — College pays ×32! One try per day.</p>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Any subject, e.g. Biology" maxLength={80} />
          <div className="flex flex-wrap gap-1.5">{SUBJECTS.map(s => <Button key={s} size="sm" variant="secondary" className="h-7 text-xs" onClick={() => setSubject(s)}>{s}</Button>)}</div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
            {LEVELS.map(l => <Button key={l.name} size="sm" variant={l === level ? 'default' : 'outline'} className="h-auto py-1.5 flex-col text-xs" onClick={() => setLevel(l)}>{l.name}<span className="opacity-70">×{l.mult}</span></Button>)}
          </div>
          <Button className="w-full" onClick={start} disabled={loading}>{loading && <Loader2 className="w-4 h-4 animate-spin mr-1" />}Start quiz</Button>
        </div>
      )}
    </div>
  );
}
