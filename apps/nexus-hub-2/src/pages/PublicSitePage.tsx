import { useEffect, useState } from 'react';
import { sites, SitesOutputType } from 'zitejs/api';

/** Public page for a site published from the Website Builder: /site/:slug */
export default function PublicSitePage({ slug }: { slug: string }) {
  const [site, setSite] = useState<SitesOutputType['site'] | undefined>(undefined);
  useEffect(() => { sites({ action: 'get', slug }).then(r => setSite(r.site)).catch(() => setSite(null)); }, [slug]);
  useEffect(() => { if (site?.name) document.title = site.name; }, [site?.name]);

  if (site === undefined) return <div className="h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (!site || !site.active) return (
    <div className="h-screen flex flex-col items-center justify-center gap-2 text-center p-6">
      <p className="text-5xl">🌐</p>
      <h1 className="text-xl font-bold">{site ? 'This site is offline' : 'Site not found'}</h1>
      <p className="text-sm text-muted-foreground">{site ? 'The owner needs to renew it to bring it back online.' : 'Check the link and try again.'}</p>
    </div>
  );
  return <iframe title={site.name} srcDoc={site.html} sandbox="allow-scripts allow-modals allow-forms allow-popups" className="fixed inset-0 w-full h-full border-0 bg-white" />;
}
