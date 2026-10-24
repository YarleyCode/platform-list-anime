
import React, { Suspense } from 'react';
import Image from 'next/image';
import { getAnimeById, getAnimeCharacters, getAnimeEpisodes, getAnimeRelations, getAnimeRecommendations } from '@/services/jikan';
import type { RelatedAnimeItem } from '@/services/jikan';
import { Metadata } from 'next';
import Link from 'next/link';
import LibraryButton from '@/components/anime/LibraryButton';
import FavoriteButton from '@/components/anime/FavoriteButton';
import EpisodeList from '@/components/anime/EpisodeList';
import RelatedAnimeCarousel from '@/components/anime/RelatedAnimeCarousel';
import { db } from '@/lib/db';
import type { LibraryItem } from '@/services/library';

interface AnimePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: AnimePageProps): Promise<Metadata> {
  const { id } = await params;
  try {
    const res = await getAnimeById(parseInt(id));
    return {
      title: `${res.data.title} - EpiNeko`,
      description: res.data.synopsis?.slice(0, 160),
    };
  } catch {
    return {
      title: 'Anime Details - EpiNeko',
    };
  }
}

export default async function AnimePage({ params }: AnimePageProps) {
  const { id } = await params;
  const animeId = parseInt(id);
  
  // Fetch anime data from Jikan (server-side, cached by Next.js)
  const [animeRes, charactersRes, episodesRes, relations, recommendations] = await Promise.all([
    getAnimeById(animeId),
    getAnimeCharacters(animeId),
    getAnimeEpisodes(animeId),
    getAnimeRelations(animeId).catch(() => [] as RelatedAnimeItem[]),
    getAnimeRecommendations(animeId).catch(() => [] as RelatedAnimeItem[]),
  ]);

  const anime = animeRes?.data;
  const characters = charactersRes?.data?.slice(0, 10) || [];
  const episodes = episodesRes?.data || [];

  if (!anime || !anime.images) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-4xl font-black mb-4">¡UY! ALGO SALIÓ MAL</h1>
        <p className="text-zinc-400 mb-8 max-w-md">No pudimos cargar la información de este anime en este momento. Por favor, intenta de nuevo más tarde.</p>
        <Link href="/" className="btn btn-primary rounded-full px-8">VOLVER AL INICIO</Link>
      </div>
    );
  }

  // Try to get library status from local SQLite
  let libraryItem: LibraryItem | null = null;
  try {
    const data = db.prepare<[number], LibraryItem>('SELECT * FROM user_library WHERE anime_id_jikan = ?').get(animeId);
    libraryItem = data ?? null;
  } catch (error) {
    console.error('Error fetching server-side library status from SQLite:', error);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Hero Section */}
      <section className="relative h-[70vh] w-full flex items-end">
        {/* Backdrop (LCP) — AniList fallback may normalize this to '' */}
        <div className="absolute inset-0">
          {anime.images.webp.large_image_url ? (
            <Image 
              src={anime.images.webp.large_image_url} 
              alt={anime.title}
              fill
              priority
              sizes="100vw"
              className="w-full h-full object-cover opacity-30"
            />
          ) : null}
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent" />
        </div>

        <div className="container mx-auto px-6 relative z-10 pb-16">
          <div className="flex flex-col md:flex-row gap-8 items-end">
            {/* Poster */}
            <div className="hidden md:block w-64 aspect-[2/3] rounded-2xl overflow-hidden shadow-2xl border border-white/10 shrink-0 transform -rotate-1">
              {anime.images.webp.large_image_url ? (
                <Image 
                  src={anime.images.webp.large_image_url} 
                  alt={anime.title}
                  width={512}
                  height={768}
                  priority
                  sizes="256px"
                  className="w-full h-full object-cover"
                />
              ) : null}
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-yellow-400 text-black text-xs font-black rounded-full italic uppercase shadow-lg shadow-yellow-400/20">
                  ⭐ {anime.score || 'N/A'}
                </span>
                <span className="text-zinc-400 font-medium">{anime.year || anime.season || 'TBD'}</span>
                <span className="text-zinc-500">•</span>
                <span className="text-zinc-400 font-medium">{anime.type}</span>
              </div>
              
              <h1 className="text-5xl md:text-7xl font-black italic uppercase tracking-tighter mb-4 text-white">
                {anime.title}
              </h1>
              
              {anime.title_japanese && (
                <p className="text-xl text-zinc-400 mb-6 font-medium">{anime.title_japanese}</p>
              )}

              <div className="flex flex-wrap gap-4 mt-8">
                <Suspense fallback={<div className="h-14 w-14 bg-zinc-900 animate-pulse rounded-full" />}>
                  <FavoriteButton
                    animeId={anime.mal_id}
                    initialIsFavorite={libraryItem?.is_favorite === 1}
                    size="lg"
                  />
                </Suspense>
                <Suspense fallback={<div className="h-14 w-full bg-zinc-900 animate-pulse rounded-full" />}>
                  <LibraryButton 
                    animeId={anime.mal_id} 
                    title={anime.title} 
                    imageUrl={anime.images.webp.large_image_url} 
                    initialStatus={libraryItem?.status}
                  />
                </Suspense>
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-4">
                    {characters.slice(0, 4).map((char, i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-zinc-950 overflow-hidden bg-zinc-900">
                        <Image src={char.character.images.webp.image_url} alt={char.character.name} width={40} height={40} sizes="40px" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <span className="text-zinc-400 text-sm font-bold">12k+ fans</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="container mx-auto px-6 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
          {/* Left Column: Synopsis & Characters */}
          <div className="lg:col-span-2">
            <div className="mb-16">
              <h2 className="text-2xl font-black italic mb-6 border-l-4 border-primary pl-4">SINOPSIS</h2>
              <p className="text-xl text-zinc-100 leading-relaxed font-light">
                {anime.synopsis || "No hay sinopsis disponible para este anime."}
              </p>

              <Suspense fallback={<div className="h-32 w-full bg-zinc-900 animate-pulse rounded-2xl mt-12" />}>
                <EpisodeList 
                  animeId={anime.mal_id} 
                  totalEpisodes={anime.episodes} 
                  title={anime.title}
                  imageUrl={anime.images.webp.large_image_url}
                  initialEpisodes={episodes}
                  initialWatchedCount={libraryItem?.episodes_watched}
                  initialIsInLibrary={!!libraryItem}
                />
              </Suspense>
            </div>

            <div className="mb-16">
              <div className="flex items-end justify-between mb-8">
                <h2 className="text-2xl font-black italic border-l-4 border-primary pl-4">PERSONAJES</h2>
                <Link href="#" className="text-sm font-bold text-zinc-500 hover:text-white transition-colors">VER TODOS</Link>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6">
                {characters.map((char) => (
                  <div key={char.character.mal_id} className="group cursor-pointer">
                    <div className="aspect-square rounded-2xl overflow-hidden mb-3 border border-white/5 bg-zinc-900">
                      <Image 
                        src={char.character.images.webp.image_url} 
                        alt={char.character.name} 
                        width={300}
                        height={300}
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 150px"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                    <h4 className="text-sm font-bold text-zinc-200 truncate group-hover:text-primary transition-colors">
                      {char.character.name}
                    </h4>
                    <p className="text-xs text-zinc-500 truncate">{char.role}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Details & Extras */}
          <div className="space-y-12">
            <div className="bg-zinc-900/50 rounded-3xl p-8 border border-white/5 backdrop-blur-sm">
              <h2 className="text-xl font-black italic mb-8 uppercase tracking-widest text-primary">Detalles</h2>
              
              <div className="space-y-6">
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Estado</p>
                  <p className="text-zinc-200 font-medium">{anime.status}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Episodios</p>
                  <p className="text-zinc-200 font-medium">{anime.episodes || 'TBD'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Tipo</p>
                  <p className="text-zinc-200 font-medium">{anime.type}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Temporada</p>
                  <p className="text-zinc-200 font-medium">{anime.season} {anime.year}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Anime Carousels */}
      <section className="container mx-auto px-6 pb-20">
        <RelatedAnimeCarousel title="Temporadas Relacionadas" items={relations} />
        <RelatedAnimeCarousel title="Recomendados para ti" items={recommendations} />
      </section>
    </div>
  );
}
