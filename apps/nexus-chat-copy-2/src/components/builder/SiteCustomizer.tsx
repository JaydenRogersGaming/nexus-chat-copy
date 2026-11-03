import { Input } from '@project/components/ui/input';
import { Label } from '@project/components/ui/label';
import { Textarea } from '@project/components/ui/textarea';
import { Button } from '@project/components/ui/button';
import { DEFAULT_SETTINGS, FONTS, type SiteSettings } from '../../lib/siteSettings';

const BGS = ['', '#0b1020', '#ffffff', 'linear-gradient(135deg,#1e1b4b,#0f766e)', 'linear-gradient(135deg,#fde68a,#f9a8d4)', 'radial-gradient(circle at top,#334155,#020617)'];

/** Customize the look of the site without touching code. */
export default function SiteCustomizer({ value, onChange }: { value: SiteSettings; onChange: (s: SiteSettings) => void }) {
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3 text-sm">
      <div className="grid grid-cols-[1fr_72px] gap-2">
        <div><Label className="text-xs">Tab title</Label><Input value={value.title} maxLength={60} onChange={e => set('title', e.target.value)} placeholder="My awesome app" /></div>
        <div><Label className="text-xs">Icon</Label><Input value={value.favicon} maxLength={4} onChange={e => set('favicon', e.target.value)} /></div>
      </div>
      <div><Label className="text-xs">Accent color</Label>
        <div className="flex gap-2"><Input type="color" className="h-9 w-14 p-1" value={value.accent || '#3b82f6'} onChange={e => set('accent', e.target.value)} />
          <Button size="sm" variant="ghost" onClick={() => set('accent', '')}>Use original</Button></div>
      </div>
      <div><Label className="text-xs">Font</Label>
        <select value={value.font} onChange={e => set('font', e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
          {FONTS.map(f => <option key={f} value={f}>{f || 'Original font'}</option>)}
        </select>
      </div>
      <div><Label className="text-xs">Background</Label>
        <div className="flex flex-wrap gap-1.5">
          {BGS.map(b => <button key={b} onClick={() => set('background', b)} title={b || 'Original'} className={`h-8 w-8 rounded-md border-2 ${value.background === b ? 'border-primary' : 'border-border'}`} style={{ background: b || 'repeating-linear-gradient(45deg,#ccc 0 4px,#fff 4px 8px)' }} />)}
        </div>
      </div>
      <div><Label className="text-xs">Corner roundness {value.radius >= 0 ? `· ${value.radius}px` : '· original'}</Label>
        <input type="range" min={-1} max={32} value={value.radius} onChange={e => set('radius', Number(e.target.value))} className="w-full accent-primary" />
      </div>
      <div><Label className="text-xs">Custom CSS</Label>
        <Textarea rows={4} className="font-mono text-xs" value={value.customCss} onChange={e => set('customCss', e.target.value)} placeholder="h1 { letter-spacing: 2px; }" />
      </div>
      <Button size="sm" variant="outline" className="w-full" onClick={() => onChange({ ...DEFAULT_SETTINGS })}>Reset customization</Button>
    </div>
  );
}
