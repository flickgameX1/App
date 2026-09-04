import { useEffect, useState } from 'react';

/** Live match for a media query, so layout can follow the actual window. */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/**
 * Wide enough for two columns: an iPad in landscape, or any laptop. Below this
 * the app stays the single phone column it was designed as.
 */
export const WIDE = '(min-width: 1024px)';
