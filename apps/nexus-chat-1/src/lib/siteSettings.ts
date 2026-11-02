/** Customization the builder layers on top of the AI's HTML. */
export type SiteSettings = { title: string; favicon: string; accent: string; font: string; background: string; radius: number; customCss: string };
export const DEFAULT_SETTINGS: SiteSettings = { title: '', favicon: '🌐', accent: '', font: '', background: '', radius: -1, customCss: '' };
export const FONTS = ['', 'Inter', 'Poppins', 'Space Grotesk', 'Playfair Display', 'Press Start 2P', 'Fredoka', 'JetBrains Mono'];

export const parseSettings = (s: string | undefined): SiteSettings => {
  try { return { ...DEFAULT_SETTINGS, ...JSON.parse(s || '{}') }; } catch { return DEFAULT_SETTINGS; }
};

/** Reports runtime errors from inside the preview iframe back to the builder. */
const BUG_CATCHER = `<script>(function(){var s=function(m){try{parent.postMessage({__nexusBug:String(m).slice(0,400)},'*')}catch(e){}};
window.addEventListener('error',function(e){s((e.message||'Error')+(e.lineno?' (line '+e.lineno+')':''))});
window.addEventListener('unhandledrejection',function(e){s('Unhandled promise: '+(e.reason&&e.reason.message||e.reason))});
var ce=console.error;console.error=function(){s([].slice.call(arguments).join(' '));ce.apply(console,arguments)};})();</script>`;

export function applySettings(html: string, st: SiteSettings, opts: { catchBugs?: boolean } = {}) {
  const head: string[] = [];
  if (opts.catchBugs) head.push(BUG_CATCHER);
  if (st.title) head.push(`<title>${st.title.replace(/</g, '&lt;')}</title>`);
  if (st.favicon) head.push(`<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>${st.favicon}</text></svg>`)}">`);
  if (st.font) head.push(`<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${encodeURIComponent(st.font)}:wght@400;700&display=swap">`);
  const css = [
    st.font && `body,button,input,textarea,h1,h2,h3{font-family:'${st.font}',sans-serif!important}`,
    st.accent && `:root{--accent:${st.accent};--primary:${st.accent}}a,button{accent-color:${st.accent}}button,.btn{background-color:${st.accent}!important;border-color:${st.accent}!important}`,
    st.background && `body{background:${st.background}!important}`,
    st.radius >= 0 && `button,input,img,.card{border-radius:${st.radius}px!important}`,
    st.customCss,
  ].filter(Boolean).join('\n');
  if (css) head.push(`<style id="nexus-custom">${css}</style>`);
  if (!head.length) return html;
  const out = st.title ? html.replace(/<title>[\s\S]*?<\/title>/i, '') : html;
  return /<head[^>]*>/i.test(out) ? out.replace(/<head[^>]*>/i, m => `${m}\n${head.join('\n')}`) : head.join('\n') + out;
}
