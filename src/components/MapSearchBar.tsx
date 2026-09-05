import { useState, useRef, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import L from 'leaflet';

interface SearchResult {
  lat: string;
  lon: string;
  display_name: string;
}

interface SearchBarProps {
  mapRef: React.MutableRefObject<L.Map | null>;
}

// Nominatim usage policy requires identifying the application.
// TODO: Replace the email below with your actual contact email for Nominatim compliance.
const NOMINATIM_EMAIL = 'your-email@example.com';

export function SearchBar({ mapRef }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(
    async (q: string) => {
      if (q.trim().length < 3) return;

      if (abortRef.current) abortRef.current.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.set('format', 'json');
        url.searchParams.set('q', q);
        url.searchParams.set('limit', '1');

        const res = await fetch(url.toString(), {
          signal: controller.signal,
          headers: {
            'Accept-Language': 'en',
          },
        });

        if (!res.ok) throw new Error('Search failed');

        const results: SearchResult[] = await res.json();
        if (results.length === 0) {
          setError('No place found');
          return;
        }

        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);

        if (isNaN(lat) || isNaN(lon)) {
          setError('Invalid location');
          return;
        }

        const map = mapRef.current;
        if (map) {
          map.setView([lat, lon], 14, { animate: true });
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Search failed. Try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [mapRef]
  );

  const handleChange = (value: string) => {
    setQuery(value);
    setError(null);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      performSearch(value);
    }, 800);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    performSearch(query);
  };

  const handleClear = () => {
    setQuery('');
    setError(null);
    if (abortRef.current) abortRef.current.abort();
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="flex items-center gap-2 h-11 px-3 rounded-xl bg-[#0f1115]/70 backdrop-blur-md border border-white/10 shadow-lg">
        {loading ? (
          <Loader2 className="w-4 h-4 text-accent flex-shrink-0 animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
        )}
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search a place"
          className="flex-1 bg-transparent text-[14px] text-gray-100 placeholder:text-gray-500 focus:outline-none min-w-0"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-200 flex-shrink-0"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {error && (
        <p className="text-[12px] text-red-400 mt-1.5 px-1">{error}</p>
      )}
    </form>
  );
}
