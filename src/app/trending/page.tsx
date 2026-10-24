"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";

// ─── Types ──────────────────────────────────────────────────────────────────────

interface TrendingAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  type: string;
  episodes: number | null;
  status: string;
  score: number | null;
  synopsis: string | null;
  season: string | null;
  year: number | null;
  genres: string[];
  images: {
    webp: { large_image_url: string };
    jpg: { large_image_url: string };
  };
}

// ─── Filter Config ───────────────────────────────────────────────────────────────

const TYPE_FILTERS = [
  { label: "Todo", value: "" },
  { label: "TV", value: "tv" },
  { label: "Película", value: "movie" },
  { label: "OVA", value: "ova" },
  { label: "ONA", value: "ona" },
  { label: "Especial", value: "special" },
];

const SORT_FILTERS = [
  { label: "Más populares", value: "bypopularity" },
  { label: "En emisión", value: "airing" },
  { label: "Próximamente", value: "upcoming" },
  { label: "Más votados", value: "favorite" },
];

// ─── Anime Grid Card (richer variant for this page) ──────────────────────────────

function TrendingAnimeCard({ anime, rank }: { anime: TrendingAnime; rank: number }) {
  const [hovered, setHovered] = useState(false);
  // On load error we swap to a placeholder cover (same behaviour as the old <img> onError).
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
  // AniList fallback normalizes covers to '' — never pass an empty src to next/image.
  const cover = anime.images.webp?.large_image_url || anime.images.jpg?.large_image_url || null;

  return (
    <Link href={`/anime/${anime.mal_id}`} className="group block">
      <div
        className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-white/5 transition-all duration-300 group-hover:border-primary/50 group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:scale-[1.02]"
        style={{ aspectRatio: "2/3" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Rank badge */}
        <div className="absolute top-3 left-3 z-20 w-8 h-8 rounded-full bg-black/70 backdrop-blur-md border border-white/10 flex items-center justify-center">
          <span className="text-xs font-black text-white">{rank}</span>
        </div>

        {/* Score badge */}
        {anime.score && (
          <div
            className={`absolute top-3 right-3 z-20 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10 transition-opacity duration-300 ${
              hovered ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="text-yellow-400 text-xs font-bold font-mono">
              ★ {anime.score}
            </span>
          </div>
        )}

        {/* Image */}
        {cover || fallbackSrc ? (
          <Image
            src={fallbackSrc ?? cover!}
            alt={anime.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 180px"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={() => {
              if (!fallbackSrc) setFallbackSrc(`https://placehold.co/400x600/18181b/ffffff?text=${encodeURIComponent(anime.title)}`);
            }}
          />
        ) : null}

        {/* Hover overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent transition-opacity duration-300 ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Type + Episodes */}
            <div className="flex items-center gap-2 mb-2">
              {anime.type && (
                <span className="px-2 py-0.5 rounded-full bg-primary/80 text-white text-[10px] font-bold uppercase tracking-wider">
                  {anime.type}
                </span>
              )}
              {anime.episodes && (
                <span className="text-zinc-400 text-xs">
                  {anime.episodes} eps
                </span>
              )}
            </div>
            {/* Genres */}
            {anime.genres?.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {anime.genres.slice(0, 2).map((g) => (
                  <span
                    key={g}
                    className="px-1.5 py-0.5 rounded bg-white/10 text-white text-[9px] font-semibold "
                  >
                    {g}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Title below card */}
      <div className="mt-3 px-1">
        <h3 className="text-sm font-bold text-zinc-400 line-clamp-1 group-hover:text-white transition-colors uppercase italic tracking-tight">
          {anime.title_english || anime.title}
        </h3>
        {anime.year && (
          <p className="text-xs text-zinc-600 mt-0.5">{anime.year}</p>
        )}
      </div>
    </Link>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────────

export default function TrendingPage() {
  const [animes, setAnimes] = useState<TrendingAnime[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [sortFilter, setSortFilter] = useState("bypopularity");
  const [error, setError] = useState<string | null>(null);

  const topRef = useRef<HTMLDivElement>(null);

  // ── Fetch anime ────────────────────────────────────────────────────────────────
  const fetchAnimes = useCallback(
    async (currentPage: number, reset = false) => {
      if (reset) {
        setIsLoading(true);
        setAnimes([]);
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      try {
        const params = new URLSearchParams({
          page: currentPage.toString(),
          filter: sortFilter,
        });
        if (typeFilter) params.set("type", typeFilter);

        const res = await fetch(`/api/trending?${params.toString()}`);
        if (!res.ok) throw new Error("Error al cargar");

        const json = await res.json();
        if (json.error) throw new Error(json.error);

        const newData = Array.isArray(json.data) ? json.data : [];
        setAnimes((prev) => (reset ? newData : [...prev, ...newData]));
        setHasNextPage(json.pagination?.has_next_page ?? false);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "No se pudieron cargar los animes.");
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [typeFilter, sortFilter]
  );

  // Re-fetch when filters change
  useEffect(() => {
    setPage(1); // eslint-disable-line react-hooks/set-state-in-effect
    fetchAnimes(1, true);
  }, [typeFilter, sortFilter, fetchAnimes]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchAnimes(nextPage);
  };

  // ── Skeleton ───────────────────────────────────────────────────────────────────
  const Skeleton = () => (
    <div className="rounded-2xl overflow-hidden bg-zinc-900 animate-pulse" style={{ aspectRatio: "2/3" }} />
  );

  return (
    <div className="min-h-screen bg-zinc-950" ref={topRef}>
      {/* ── Hero header ────────────────────────────────────────────────────────── */}
      <div className="relative pt-32 pb-16 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/10 rounded-full blur-[120px]" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-zinc-500 text-sm mb-8">
            <Link href="/" className="hover:text-white transition-colors">
              Inicio
            </Link>
            <span>/</span>
            <span className="text-white font-medium">Tendencias</span>
          </div>

          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <p className="text-primary font-bold text-sm tracking-widest uppercase mb-2">
                Lo más visto
              </p>
              <h1 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter uppercase">
                TENDENCIAS
              </h1>
              <p className="text-zinc-400 mt-3 text-lg max-w-xl">
                Los animes que el mundo está viendo ahora mismo. Actualizado en tiempo real.
              </p>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 border border-white/10 self-start md:self-auto">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-zinc-300 text-xs font-bold uppercase tracking-wider">
                En vivo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-zinc-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="container mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Type filter */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Tipo:
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {TYPE_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setTypeFilter(f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all duration-200 ${
                      typeFilter === f.value
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/30"
                        : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="hidden sm:block w-px h-6 bg-zinc-800" />

            {/* Sort filter */}
            <div className="flex items-center gap-2">
              <span className="text-zinc-500 text-xs font-bold uppercase tracking-wider whitespace-nowrap">
                Ordenar:
              </span>
              <div className="flex gap-1.5 flex-wrap">
                {SORT_FILTERS.map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setSortFilter(f.value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border transition-all duration-200 ${
                      sortFilter === f.value
                        ? "bg-white text-zinc-950 border-white"
                        : "bg-transparent text-zinc-400 border-zinc-700 hover:border-zinc-500 hover:text-white"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grid ───────────────────────────────────────────────────────────────── */}
      <div className="container mx-auto px-6 py-12">
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-3xl">
              ⚠️
            </div>
            <p className="text-zinc-400 text-lg">{error}</p>
            <button
              onClick={() => fetchAnimes(1, true)}
              className="mt-6 px-6 py-2.5 rounded-full bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Grid */}
        {!error && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {isLoading
                ? Array.from({ length: 24 }).map((_, i) => <Skeleton key={i} />)
                : animes.map((anime, idx) => (
                    <TrendingAnimeCard
                      key={`${anime.mal_id}-${idx}`}
                      anime={anime}
                      rank={idx + 1}
                    />
                  ))}

              {/* Load more skeletons */}
              {isLoadingMore &&
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={`more-${i}`} />
                ))}
            </div>

            {/* Load more button */}
            {!isLoading && !isLoadingMore && hasNextPage && animes.length > 0 && (
              <div className="flex justify-center mt-16">
                <button
                  onClick={handleLoadMore}
                  className="group relative px-12 py-4 rounded-full bg-zinc-900 border border-white/10 text-white font-black uppercase tracking-wider text-sm hover:border-primary/50 hover:shadow-xl hover:shadow-primary/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <span className="relative z-10">Cargar más animes</span>
                  <div className="absolute inset-0 rounded-full bg-primary opacity-0 group-hover:opacity-10 transition-opacity duration-300" />
                </button>
              </div>
            )}

            {/* End of list */}
            {!isLoading && !hasNextPage && animes.length > 0 && (
              <div className="flex flex-col items-center mt-16 text-center">
                <div className="w-12 h-1 rounded-full bg-zinc-800 mb-4" />
                <p className="text-zinc-600 text-sm font-medium">
                  Has llegado al final del catálogo
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Back to top */}
      <button
        onClick={() => topRef.current?.scrollIntoView({ behavior: "smooth" })}
        className="fixed bottom-8 right-8 z-50 w-12 h-12 rounded-full bg-zinc-900 border border-white/10 text-white flex items-center justify-center shadow-2xl hover:border-primary/50 hover:scale-110 transition-all duration-200"
        aria-label="Volver arriba"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
        </svg>
      </button>

      <style jsx>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
