import { useEffect, useState } from 'react';
import { useDebounce } from 'use-debounce';
import { Search, Star, ExternalLink } from 'lucide-react';
import { Input } from '@project/components/ui/input';
import { Button } from '@project/components/ui/button';
import { Skeleton } from '@project/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@project/components/ui/select';
import { movies, MoviesOutputType } from 'zitejs/api';
import MovieRow from './MovieRow';
import { useProviders } from '../../hooks/useMovieProviders';

type Data = MoviesOutputType;

function Featured({ m }: { m: Data['rows'][0]['movies'][0] }) {
  const get = useProviders([m.id]);
  const p = get(m.id);
  return (
    <section aria-label="Featured movie" className="relative overflow-hidden rounded-2xl border border-border bg-card">
      {m.backdrop && <img src={m.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/10" />
      <div className="relative max-w-xl space-y-3 p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-primary">Featured</p>
        <h2 className="text-3xl font-black leading-tight sm:text-4xl">{m.title}</h2>
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Star className="h-4 w-4 fill-primary text-primary" aria-hidden />{m.rating.toFixed(1)} · {[m.year, ...m.genres].filter(Boolean).join(' · ')}</p>
        <p className="line-clamp-3 text-sm">{m.description}</p>
        {p && p.services.length > 0 && <p className="text-xs text-muted-foreground">On {p.services.slice(0, 4).map(s => s.name).join(', ')}</p>}
        <Button asChild className="gap-1.5"><a href={p?.link ?? '#'} target="_blank" rel="noopener noreferrer">Watch now <ExternalLink className="h-4 w-4" aria-hidden /></a></Button>
      </div>
    </section>
  );
}

/** Movie discovery: browse what's streaming on Netflix, Plex, Tubi and more (TMDB / JustWatch data). */
export default function MovieDiscover() {
  const [q, setQ] = useState('');
  const [query] = useDebounce(q.trim(), 400);
  const [genre, setGenre] = useState('all');
  const [service, setService] = useState('all');
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(d => d && { ...d, rows: [] }); setError('');
    movies({ action: 'browse', query: query || undefined, genreId: genre === 'all' ? undefined : Number(genre), serviceId: service === 'all' ? undefined : Number(service) })
      .then(setData).catch(e => setError(e instanceof Error ? e.message : "Couldn't load movies"));
  }, [query, genre, service]);

  const serviceName = data?.services.find(s => String(s.id) === service)?.name;
  const featured = data?.rows[0]?.movies.find(m => m.backdrop);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search any movie" className="pl-8" aria-label="Search movies" />
        </div>
        <Select value={genre} onValueChange={setGenre}>
          <SelectTrigger className="w-[150px]" aria-label="Filter by genre"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All genres</SelectItem>{data?.genres.map(g => <SelectItem key={g.id} value={String(g.id)}>{g.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={service} onValueChange={setService}>
          <SelectTrigger className="w-[160px]" aria-label="Filter by streaming service"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">All services</SelectItem>{data?.services.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {error ? <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">{error}</p>
        : !data || !data.rows.length ? <div className="space-y-4"><Skeleton className="h-64 w-full rounded-2xl" /><div className="flex gap-3">{[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-80 w-44 rounded-xl" />)}</div></div>
        : <>
          {!query && featured && <Featured m={featured} />}
          {data.rows.every(r => !r.movies.length) && <p className="text-center text-sm text-muted-foreground py-8">No movies found. Try another search or filter.</p>}
          {data.rows.map(r => <MovieRow key={r.key + r.title} title={r.title} items={r.movies} service={serviceName} />)}
        </>}
      <p className="text-center text-[11px] text-muted-foreground">Movie info and posters from TMDB. Streaming availability from JustWatch. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </div>
  );
}
