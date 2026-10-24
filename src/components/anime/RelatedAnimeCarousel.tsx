"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { RelatedAnimeItem } from '@/services/jikan';

interface RelatedAnimeCarouselProps {
  title: string;
  items: RelatedAnimeItem[];
}

/** Per-item card so the load-error fallback only affects the broken cover. */
function RelatedAnimeCard({ item }: { item: RelatedAnimeItem }) {
  const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);

  return (
    <Link
      href={`/anime/${item.malId}`}
      className="flex-none w-36 snap-start group"
    >
      <div className="aspect-[2/3] rounded-2xl overflow-hidden bg-zinc-800 border border-white/5 transition-all duration-300 group-hover:scale-[1.02] group-hover:border-primary/50">
        {item.imageUrl ? (
          <Image
            src={fallbackSrc ?? item.imageUrl}
            alt={item.title}
            width={288}
            height={432}
            sizes="144px"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            onError={() => {
              if (!fallbackSrc) setFallbackSrc(`https://placehold.co/400x600/18181b/ffffff?text=${encodeURIComponent(item.title)}`);
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-4xl">🎬</span>
          </div>
        )}
      </div>
      <h3 className="mt-3 text-sm font-bold text-zinc-400 truncate group-hover:text-white transition-colors uppercase italic tracking-tight">
        {item.title}
      </h3>
    </Link>
  );
}

export default function RelatedAnimeCarousel({ title, items }: RelatedAnimeCarouselProps) {
  if (items.length === 0) return null;

  return (
    <div className="mb-16">
      <h2 className="text-2xl font-black italic mb-8 border-l-4 border-primary pl-4">
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none">
        {items.map((item) => (
          <RelatedAnimeCard key={`${item.relationType}-${item.malId}`} item={item} />
        ))}
      </div>
    </div>
  );
}
