/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

const JIKAN_API_BASE = 'https://api.jikan.moe/v4';
const ANILIST_API = 'https://graphql.anilist.co';

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

async function tryJikan<T>(url: string, retries = 2): Promise<T | null> {
  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(url, {
        signal: controller.signal,
        // Shared Next data cache: trending lists stay fresh for 5 minutes.
        next: { revalidate: 300 },
      });
      clearTimeout(timer);
      if (res.ok) return res.json() as Promise<T>;
      if (res.status === 429 || res.status >= 500) {
        if (i < retries) { await sleep(700 * (i + 1)); continue; }
        return null;
      }
      return null;
    } catch {
      clearTimeout(timer);
      if (i < retries) { await sleep(700 * (i + 1)); continue; }
      return null;
    }
  }
  return null;
}

// AniList fallback for trending
async function fetchAniListTrending(page: number, perPage: number): Promise<any[] | null> {
  const gql = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          id idMal
          title { romaji english }
          coverImage { large medium }
          format averageScore episodes status season seasonYear
          genres
          description(asHtml: false)
        }
      }
    }
  `;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql, variables: { page, perPage } }),
      signal: controller.signal,
      // POST + next.revalidate is cached in the Next data cache (same as /api/search).
      next: { revalidate: 300 },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    const media = json?.data?.Page?.media ?? [];
    const normalized = media.map((m: any) => ({
      mal_id: m.idMal ?? m.id,
      title: m.title?.english || m.title?.romaji || 'Sin título',
      title_english: m.title?.english ?? null,
      title_japanese: null,
      type: formatAniListType(m.format),
      episodes: m.episodes ?? null,
      status: formatStatus(m.status),
      score: m.averageScore ? +(m.averageScore / 10).toFixed(1) : null,
      synopsis: m.description?.replace(/<[^>]+>/g, '') ?? null,
      season: m.season?.toLowerCase() ?? null,
      year: m.seasonYear ?? null,
      genres: m.genres ?? [],
      images: {
        jpg: { image_url: m.coverImage?.large ?? '', small_image_url: m.coverImage?.medium ?? '', large_image_url: m.coverImage?.large ?? '' },
        webp: { image_url: m.coverImage?.large ?? '', small_image_url: m.coverImage?.medium ?? '', large_image_url: m.coverImage?.large ?? '' },
      },
    }));

    return normalized;
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function formatAniListType(format: string): string {
  const map: Record<string, string> = { TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music' };
  return map[format] ?? format ?? 'Anime';
}

function formatStatus(s: string): string {
  const map: Record<string, string> = { FINISHED: 'Finished Airing', RELEASING: 'Currently Airing', NOT_YET_RELEASED: 'Not yet aired', CANCELLED: 'Cancelled' };
  return map[s] ?? s ?? '';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const type = searchParams.get('type') ?? ''; // TV, Movie, OVA, etc.
  const filter = searchParams.get('filter') ?? 'bypopularity'; // bypopularity, airing, upcoming
  const limit = 24;

  // Build Jikan URL
  let jikanUrl = `${JIKAN_API_BASE}/top/anime?page=${page}&limit=${limit}`;
  if (type) jikanUrl += `&type=${type.toLowerCase()}`;
  if (filter) jikanUrl += `&filter=${filter}`;

  const jikanData = await tryJikan<any>(jikanUrl);

  if (jikanData?.data) {
    const animes = jikanData.data.map((a: any) => ({
      mal_id: a.mal_id,
      title: a.title,
      title_english: a.title_english ?? null,
      type: a.type ?? 'Anime',
      episodes: a.episodes ?? null,
      status: a.status ?? '',
      score: a.score ?? null,
      synopsis: a.synopsis ?? null,
      season: a.season ?? null,
      year: a.year ?? null,
      genres: (a.genres ?? []).map((g: any) => g.name),
      images: a.images,
    }));

    return NextResponse.json({
      data: animes,
      pagination: jikanData.pagination ?? null,
      source: 'jikan',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  }

  // Fallback AniList
  console.warn('[/api/trending] Jikan unavailable, falling back to AniList');
  const anilistData = await fetchAniListTrending(page, limit);

  if (anilistData) {
    return NextResponse.json({
      data: anilistData,
      pagination: { has_next_page: anilistData.length === limit, current_page: page, last_visible_page: 10 },
      source: 'anilist',
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' },
    });
  }

  return NextResponse.json({ error: 'No se pudieron cargar los animes. Intenta de nuevo.' }, { status: 503 });
}
