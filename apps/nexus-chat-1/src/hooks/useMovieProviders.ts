import { useEffect, useRef, useState } from 'react';
import { movies, MoviesOutputType } from 'zitejs/api';

export type Movie = MoviesOutputType['rows'][0]['movies'][0];
export type Providers = MoviesOutputType['providers'][0];

const cache = new Map<number, Providers>();

/** Loads where-to-watch info for a set of movies (batched, cached). */
export function useProviders(ids: number[]) {
  const [, bump] = useState(0);
  const key = ids.join(',');
  const pending = useRef(new Set<number>());
  useEffect(() => {
    const need = ids.filter(id => !cache.has(id) && !pending.current.has(id));
    for (let i = 0; i < need.length; i += 20) {
      const batch = need.slice(i, i + 20);
      batch.forEach(id => pending.current.add(id));
      movies({ action: 'providers', ids: batch })
        .then(r => { r.providers.forEach(p => cache.set(p.id, p)); bump(n => n + 1); })
        .catch(() => {});
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return (id: number) => cache.get(id);
}
