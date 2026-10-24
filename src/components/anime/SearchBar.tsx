"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { JikanAnime } from '@/services/jikan';
import Link from 'next/link';

// ─── In-memory search cache (bounded + TTL) ────────────────────────────────────
// Survives re-renders of the SearchBar; avoids re-fetching queries already seen.
const SEARCH_CACHE_MAX = 50;
const SEARCH_CACHE_TTL_MS = 5 * 60_000; // 5 minutes
const searchCache = new Map<string, { ts: number; data: JikanAnime[] }>();

function readSearchCache(key: string): JikanAnime[] | null {
  const hit = searchCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > SEARCH_CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  // LRU touch: re-insert so the entry counts as recently used.
  searchCache.delete(key);
  searchCache.set(key, hit);
  return hit.data;
}

function writeSearchCache(key: string, data: JikanAnime[]) {
  if (searchCache.has(key)) searchCache.delete(key);
  searchCache.set(key, { ts: Date.now(), data });
  while (searchCache.size > SEARCH_CACHE_MAX) {
    const oldest = searchCache.keys().next().value;
    if (oldest === undefined) break;
    searchCache.delete(oldest);
  }
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === 'AbortError') ||
    (err instanceof Error && err.name === 'AbortError')
  );
}

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JikanAnime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    // Short queries show no dropdown — state is already reset by the change handler.
    if (query.length <= 2) return;

    const cacheKey = query.trim().toLowerCase();
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      // Serve from cache instantly — no request, no loading flicker.
      const cached = readSearchCache(cacheKey);
      if (cached) {
        setResults(cached);
        setIsOpen(true);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || 'Error al buscar');
        }

        const data: JikanAnime[] = (json.data ?? []).slice(0, 5);
        writeSearchCache(cacheKey, data);
        setResults(data);
        setIsOpen(true);
      } catch (err: unknown) {
        // A newer query (or unmount) aborted this request — ignore it silently.
        if (controller.signal.aborted || isAbortError(err)) return;
        setError(err instanceof Error ? err.message : 'Error al buscar. Intenta de nuevo.');
        setResults([]);
        setIsOpen(true);
      } finally {
        // Only the request that still owns the UI may clear the spinner.
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const closeDropdown = () => {
    setIsOpen(false);
    setQuery('');
    setResults([]);
    setError(null);
  };

  return (
    <div className="relative w-full" ref={searchRef}>
      {/* Input */}
      <div className="flex items-center bg-zinc-900/60 border border-zinc-800 rounded-full px-3 py-2 focus-within:border-primary transition-colors">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 text-zinc-400 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          placeholder="Buscar anime..."
          className="bg-transparent border-none focus:outline-none text-sm text-white ml-2 w-full min-w-0"
          value={query}
          onChange={(e) => {
            const next = e.target.value;
            setQuery(next);
            if (next.length <= 2) {
              // Reset immediately on short queries (event handler, not effect).
              setResults([]);
              setIsOpen(false);
              setError(null);
              setIsLoading(false);
            }
          }}
          onFocus={() => query.length > 2 && setIsOpen(true)}
        />
        {isLoading && (
          <span className="loading loading-spinner loading-xs text-primary ml-2 flex-shrink-0" />
        )}
      </div>

      {/* Dropdown: error */}
      {isOpen && error && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-zinc-900 border border-yellow-500/30 rounded-2xl p-4 text-center z-[200] shadow-2xl">
          <span className="text-xl mb-2 block">😴</span>
          <p className="text-xs text-yellow-400 font-semibold leading-relaxed">{error}</p>
          <button
            className="mt-3 text-xs text-zinc-500 hover:text-white underline transition-colors"
            onClick={() => { setError(null); setIsOpen(false); }}
          >
            Cerrar
          </button>
        </div>
      )}


      {/* Dropdown: results */}
      {isOpen && !error && results.length > 0 && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="py-2">
            {results.map((anime) => {
              // AniList fallback normalizes covers to '' — never pass an empty src to next/image.
              const thumb =
                anime.images.webp?.small_image_url || anime.images.jpg?.small_image_url || null;
              return (
              <Link
                key={anime.mal_id}
                href={`/anime/${anime.mal_id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800 transition-colors"
                onClick={closeDropdown}
              >
                <div className="relative w-10 h-14 flex-shrink-0">
                  {thumb ? (
                    <Image
                      src={thumb}
                      alt={anime.title}
                      width={40}
                      height={56}
                      sizes="40px"
                      className="w-full h-full object-cover rounded-md"
                    />
                  ) : null}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-white truncate">{anime.title}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-zinc-400">{anime.type || 'Anime'}</span>
                    {anime.score != null && (
                      <>
                        <span className="text-xs text-zinc-500">•</span>
                        <span className="text-xs text-primary font-medium">★ {anime.score}</span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
              );
            })}
            <div className="p-2 border-t border-zinc-800">
              <Link
                href={`/search?q=${encodeURIComponent(query)}`}
                className="block text-center text-xs font-bold text-zinc-500 hover:text-white py-2 transition-colors uppercase tracking-wider"
                onClick={closeDropdown}
              >
                Ver todos los resultados
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Dropdown: no results */}
      {isOpen && !error && query.length > 2 && results.length === 0 && !isLoading && (
        <div className="absolute top-full mt-2 left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center z-[200] shadow-2xl">
          <p className="text-xs text-zinc-500 font-medium">No se encontraron resultados para «{query}»</p>
        </div>
      )}
    </div>
  );
}
