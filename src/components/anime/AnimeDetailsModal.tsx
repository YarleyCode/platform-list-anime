"use client";

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { getLibraryItem, addToLibrary, removeFromLibrary } from '@/services/library';

interface AnimeDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  anime: {
    mal_id: number;
    title: string;
    image: string;
    backdrop?: string;
    synopsis: string;
    score: string;
    episodes: string;
    status: string;
    genres: string[];
  } | null;
}

export default function AnimeDetailsModal({ isOpen, onClose, anime }: AnimeDetailsModalProps) {
  const hasValidImage = anime?.image && anime.image.trim().length > 0;
  const [isInLibrary, setIsInLibrary] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !anime) return;
    const checkLibraryStatus = async () => {
      if (!anime) return;
      try {
        const item = await getLibraryItem(anime.mal_id);
        setIsInLibrary(!!item);
      } catch (error) {
        console.error('Error checking library status:', error);
      }
    };
    checkLibraryStatus();
  }, [isOpen, anime]);

  const handleLibraryAction = async () => {
    if (!anime) return;
    setIsLoading(true);
    try {
      if (isInLibrary) {
        await removeFromLibrary(anime.mal_id);
        setIsInLibrary(false);
      } else {
        const item: Parameters<typeof addToLibrary>[0] = {
          anime_id_jikan: anime.mal_id,
          title: anime.title,
          image_url: anime.image,
          status: 'plan_to_watch',
          episodes_watched: 0,
        };
        await addToLibrary(item);
        setIsInLibrary(true);
      }
    } catch (error) {
      console.error('Library action error:', error);
      const msg = error instanceof Error ? error.message : 'Ocurrió un problema inesperado.';
      alert('Error al actualizar tu lista: ' + msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !anime) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-10">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-5xl bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 animate-in zoom-in-95 fade-in duration-300">
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 right-6 z-50 btn btn-circle btn-sm bg-black/50 border-white/10 text-white hover:bg-white/20"
        >
          ✕
        </button>

        <div className="flex flex-col md:flex-row h-full max-h-[90vh] overflow-y-auto no-scrollbar">
          
          {/* Left Side: Poster / Background */}
          <div className="relative w-full md:w-2/5 aspect-[2/3] md:aspect-auto">
            {hasValidImage ? (
              <Image 
                src={anime.image} 
                alt={anime.title}
                fill
                sizes="(max-width: 768px) 100vw, 40vw"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                <span className="text-4xl">🎬</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent md:bg-gradient-to-r md:from-transparent md:to-zinc-900" />
          </div>

          {/* Right Side: Details */}
          <div className="w-full md:w-3/5 p-8 md:p-12 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-4">
              <span className="badge badge-primary font-bold">★ {anime.score}</span>
              <span className="text-zinc-400 text-sm">• {anime.episodes} Episodios</span>
              <span className="text-zinc-400 text-sm">• {anime.status}</span>
            </div>

            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter italic">
              {anime.title}
            </h2>

            <div className="flex flex-wrap gap-2 mb-8">
              {anime.genres.map((genre) => (
                <span key={genre} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-zinc-300 font-medium">
                  {genre}
                </span>
              ))}
            </div>

            <p className="text-lg text-zinc-300 leading-relaxed mb-10 line-clamp-6">
              {anime.synopsis}
            </p>

            <div className="flex flex-wrap gap-4">
              <button 
                onClick={handleLibraryAction}
                disabled={isLoading}
                className={`btn ${isInLibrary ? 'btn-outline text-success border-success/50 hover:bg-success/10' : 'btn-primary'} btn-lg rounded-full px-10 font-bold shadow-xl`}
              >
                {isLoading ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : isInLibrary ? (
                  '✓ En mi Lista'
                ) : (
                  '+ Añadir a mi Lista'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
