import { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@project/components/ui/button';
import MovieCard from './MovieCard';
import { useProviders, type Movie } from '../../hooks/useMovieProviders';

export default function MovieRow({ title, items, service }: { title: string; items: Movie[]; service?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const get = useProviders(items.map(m => m.id));
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  const shown = service ? items.filter(m => { const p = get(m.id); return !p || p.services.some(s => s.name.toLowerCase().includes(service.toLowerCase())); }) : items;
  if (!shown.length) return null;
  return (
    <section aria-label={title} className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="hidden gap-1 sm:flex">
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}><ChevronLeft className="h-4 w-4" /></Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div ref={ref} tabIndex={0} className="flex snap-x gap-3 overflow-x-auto pb-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
        {shown.map(m => <MovieCard key={m.id} m={m} prov={get(m.id)} service={service} />)}
      </div>
    </section>
  );
}
