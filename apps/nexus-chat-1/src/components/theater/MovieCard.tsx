import { Star, ExternalLink } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import type { Movie, Providers } from '../../hooks/useMovieProviders';

export default function MovieCard({ m, prov, service }: { m: Movie; prov?: Providers; service?: string }) {
  const services = prov?.services ?? [];
  const picked = service ? services.filter(s => s.name.toLowerCase().includes(service.toLowerCase())) : services;
  return (
    <article className="group flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-border bg-card sm:w-48" aria-label={m.title}>
      <div className="relative aspect-[2/3] overflow-hidden bg-muted">
        {m.poster && <img src={m.poster} alt={`Poster for ${m.title}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />}
        <span className="absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-background/85 px-1.5 py-0.5 text-[11px] font-bold">
          <Star className="h-3 w-3 fill-primary text-primary" aria-hidden />{m.rating.toFixed(1)}<span className="sr-only"> out of 10</span>
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <h3 className="line-clamp-1 text-sm font-semibold">{m.title}</h3>
        <p className="text-[11px] text-muted-foreground">{[m.year, ...m.genres].filter(Boolean).join(' · ')}</p>
        <p className="line-clamp-3 text-[11px] text-muted-foreground">{m.description || 'No description yet.'}</p>
        <div className="mt-auto flex min-h-[22px] flex-wrap gap-1" aria-label="Available on">
          {!prov ? <Skeleton className="h-5 w-24" />
            : services.length === 0 ? <span className="text-[10px] text-muted-foreground">Not streaming in the US</span>
            : services.slice(0, 4).map(s => (
              s.logo ? <img key={s.name} src={s.logo} alt={`${s.name} (${s.type})`} title={`${s.name} · ${s.type}`} className="h-5 w-5 rounded" />
                : <span key={s.name} className="rounded bg-muted px-1 text-[10px]">{s.name}</span>
            ))}
        </div>
        <Button asChild size="sm" className="h-8 gap-1 text-xs" disabled={!prov}>
          <a href={prov?.link ?? '#'} target="_blank" rel="noopener noreferrer" aria-label={`Watch ${m.title}${picked[0] ? ` on ${picked[0].name}` : ''} (opens in a new tab)`}>
            Watch{picked[0] ? ` on ${picked[0].name}` : ''} <ExternalLink className="h-3 w-3" aria-hidden />
          </a>
        </Button>
      </div>
    </article>
  );
}
