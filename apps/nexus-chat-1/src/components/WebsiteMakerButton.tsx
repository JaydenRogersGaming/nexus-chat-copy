import { useEffect, useState } from 'react';
import { Code2, Loader2, Wand2, Undo2, Plus, Gamepad2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { aiWebsite } from 'zitejs/api';
import { Button } from '@project/components/ui/button';
import { Textarea } from '@project/components/ui/textarea';
import { Input } from '@project/components/ui/input';
import { Switch } from '@project/components/ui/switch';
import { Dialog, DialogContent, DialogTitle } from '@project/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@project/components/ui/tabs';
import { cn } from '@project/components/lib/utils';
import { useApp } from '../contexts/AppContext';
import BuilderPreview from './builder/BuilderPreview';
import SiteCustomizer from './builder/SiteCustomizer';
import PublishPanel from './builder/PublishPanel';
import { loadProjects, saveProjects, newProject, type Project } from '../lib/builderProjects';

const LIMIT = 200_000;
const KINDS = [
  { id: 'business / startup landing page', label: '🚀 Landing page' }, { id: 'SaaS web app with dashboard', label: '📊 Web app' },
  { id: 'online store with cart', label: '🛍️ Store' }, { id: 'personal portfolio website', label: '🎨 Portfolio' },
  { id: 'blog / fan page', label: '📰 Blog' }, { id: 'browser game', label: '🕹️ Game' },
  { id: 'productivity tool (todo, notes, planner)', label: '✅ Tool' }, { id: 'custom website', label: '✨ Anything' },
];
const GAME_KINDS = [
  { id: 'browser game: platformer', label: '🏃 Platformer' }, { id: 'browser game: puzzle', label: '🧩 Puzzle' },
  { id: 'browser game: arcade shooter', label: '🚀 Shooter' }, { id: 'browser game: racing', label: '🏎️ Racing' },
  { id: 'browser game: clicker / idle', label: '👆 Clicker' }, { id: 'browser game: card / board game', label: '🃏 Card / Board' },
  { id: 'browser game: quiz / trivia', label: '❓ Quiz' }, { id: 'browser game: anything fun', label: '🎮 Any game' },
];

/** AI app builder: multiple apps, editable code, live bug finder, customization and publishing. */
export default function WebsiteMakerButton() {
  const { profile } = useApp();
  const email = profile?.email ?? 'guest';
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>(() => loadProjects(email));
  const [currentId, setCurrentId] = useState(projects[0]?.id ?? '');
  const [gamesOnly, setGamesOnly] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [liveChars, setLiveChars] = useState(0);
  const [wide, setWide] = useState(false);
  useEffect(() => { saveProjects(email, projects); }, [email, projects]);

  const kinds = gamesOnly ? GAME_KINDS : KINDS;
  const p = projects.find(x => x.id === currentId) ?? null;
  const html = p?.versions.at(-1)?.html ?? '';
  const update = (patch: Partial<Project>) => setProjects(list => list.map(x => (x.id === currentId ? { ...x, ...patch, updatedAt: Date.now() } : x)));
  const create = () => { const n = newProject(kinds[0].id, gamesOnly ? 'My game' : 'Untitled app'); setProjects(l => [n, ...l]); setCurrentId(n.id); };
  useEffect(() => { if (open && !p) create(); }, [open, p]); // eslint-disable-line react-hooks/exhaustive-deps

  async function run(text = prompt.trim()) {
    if (!p || prompt.length > LIMIT || (html && !text)) return;
    setBusy(true); setLiveChars(0);
    const kind = gamesOnly && !p.kind.startsWith('browser game') ? 'browser game: anything fun' : p.kind;
    try {
      const s = aiWebsite({ kind, prompt: gamesOnly ? `${text}\n\n(This must be a playable browser game.)` : text, currentHtml: html || undefined, history: p.versions.map(v => v.prompt) });
      for await (const chunk of s) setLiveChars(n => n + chunk.length);
      const r = await s.result;
      update({ versions: [...p.versions, { prompt: text || `Build a ${kind}`, html: r.html }] });
      setPrompt('');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Could not build the app'); }
    finally { setBusy(false); }
  }
  const fixBugs = (bugs: string[]) => run(`Fix these bugs/errors so the app works with no console errors:\n${bugs.map(b => `- ${b}`).join('\n')}`);
  const EDIT = '✍️ Edited the code by hand';
  // Keep typing in one "hand edit" version instead of a new version per keystroke
  const editCode = (code: string) => p && update({ versions: p.versions.at(-1)?.prompt === EDIT ? [...p.versions.slice(0, -1), { prompt: EDIT, html: code }] : [...p.versions, { prompt: EDIT, html: code }] });

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}><Code2 className="w-3.5 h-3.5 mr-1" /> Website Builder</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[100vw] w-[100vw] h-[100dvh] sm:rounded-none p-0 overflow-hidden flex flex-col md:flex-row gap-0">
          <DialogTitle className="sr-only">AI Website Builder</DialogTitle>
          {!wide && p && (
            <div className="md:w-[340px] shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-border max-h-[45vh] md:max-h-none">
              <div className="p-3 border-b border-border space-y-2">
                <div className="flex items-center gap-2">
                  <select aria-label="My apps" value={currentId} onChange={e => setCurrentId(e.target.value)} className="flex-1 h-8 rounded-md border border-input bg-background px-2 text-sm font-semibold">
                    {projects.map(x => <option key={x.id} value={x.id}>{x.slug ? '🌐 ' : ''}{x.name}</option>)}
                  </select>
                  <Button size="icon" variant="outline" className="h-8 w-8" onClick={create} aria-label="New app"><Plus className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Delete app" disabled={projects.length < 2}
                    onClick={() => { setProjects(l => l.filter(x => x.id !== currentId)); setCurrentId(projects.find(x => x.id !== currentId)?.id ?? ''); }}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <Input value={p.name} maxLength={60} onChange={e => update({ name: e.target.value })} className="h-8 text-sm" aria-label="App name" />
                <label className="flex items-center gap-2 text-xs"><Switch checked={gamesOnly} onCheckedChange={setGamesOnly} /><Gamepad2 className="w-3.5 h-3.5" />Games only</label>
              </div>
              <Tabs defaultValue="build" className="flex-1 flex flex-col min-h-0">
                <TabsList className="mx-3 mt-2"><TabsTrigger value="build">Build</TabsTrigger><TabsTrigger value="design">Customize</TabsTrigger><TabsTrigger value="publish">Publish</TabsTrigger></TabsList>
                <TabsContent value="build" className="flex-1 flex flex-col min-h-0 mt-0">
                  <div className="flex-1 overflow-y-auto p-3 space-y-3">
                    {!html && (
                      <div className="grid grid-cols-2 gap-1.5">
                        {kinds.map(k => <button key={k.id} onClick={() => update({ kind: k.id })} className={cn('text-xs rounded-md border px-2 py-1.5 text-left', p.kind === k.id ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted')}>{k.label}</button>)}
                      </div>
                    )}
                    {p.versions.map((v, i) => (
                      <div key={i} className="space-y-1">
                        <div className="ml-6 rounded-lg bg-primary/10 px-3 py-2 text-xs whitespace-pre-wrap break-words max-h-32 overflow-y-auto">{v.prompt}</div>
                        <div className="mr-6 rounded-lg bg-muted px-3 py-2 text-xs">✅ Version {i + 1} ({v.html.length.toLocaleString()} chars)</div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 border-t border-border space-y-2">
                    <Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run(); }}
                      placeholder={html ? 'What should change or be added? e.g. "add a leaderboard and sound effects"' : gamesOnly ? 'Describe your game…' : 'Describe your app in as much detail as you want…'} />
                    <Button className="w-full" onClick={() => run()} disabled={busy || prompt.length > LIMIT || (!!html && !prompt.trim())}>
                      {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Wand2 className="w-4 h-4 mr-1" />}{html ? 'Add / change' : 'Build it'}
                    </Button>
                    {html && <Button size="sm" variant="outline" className="w-full" disabled={busy || p.versions.length < 2} onClick={() => update({ versions: p.versions.slice(0, -1) })}><Undo2 className="w-3.5 h-3.5 mr-1" />Undo last change</Button>}
                  </div>
                </TabsContent>
                <TabsContent value="design" className="flex-1 overflow-y-auto p-3 mt-0"><SiteCustomizer value={p.settings} onChange={s => update({ settings: s })} /></TabsContent>
                <TabsContent value="publish" className="flex-1 overflow-y-auto p-3 mt-0"><PublishPanel project={p} onLinked={(siteId, slug) => update({ siteId, slug })} /></TabsContent>
              </Tabs>
            </div>
          )}
          {p && <BuilderPreview html={html} settings={p.settings} liveChars={liveChars} busy={busy} wide={wide} onToggleWide={() => setWide(w => !w)} onCodeChange={editCode} onFix={fixBugs} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
