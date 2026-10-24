/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

const JIKAN_API_BASE = 'https://api.jikan.moe/v4';
const ANILIST_API = 'https://graphql.anilist.co';

/** Fetch Jikan with timeout, returns null on any error */
async function tryJikan(endpoint: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${JIKAN_API_BASE}${endpoint}`, {
      signal: controller.signal,
      // Shared Next data cache: anime details change rarely — 1 hour.
      next: { revalidate: 3600 },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

/** Fetch AniList anime by MAL ID as fallback */
async function fetchAniListById(malId: number): Promise<any | null> {
  const graphql = {
    query: `
      query ($idMal: Int) {
        Media(idMal: $idMal, type: ANIME) {
          id
          idMal
          title { romaji english native }
          description(asHtml: false)
          coverImage { large medium }
          bannerImage
          format
          status
          episodes
          averageScore
          season
          seasonYear
          genres
          studios(isMain: true) { nodes { name } }
        }
      }
    `,
    variables: { idMal: malId },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(graphql),
      signal: controller.signal,
      // POST + next.revalidate is cached in the Next data cache (same as /api/search).
      next: { revalidate: 1800 },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const json = await res.json();
    const m = json?.data?.Media;
    if (!m) return null;

    // Normalize to Jikan shape
    return {
      mal_id: m.idMal ?? malId,
      title: m.title?.english || m.title?.romaji || 'Sin título',
      title_english: m.title?.english ?? null,
      title_japanese: m.title?.native ?? null,
      type: formatType(m.format),
      episodes: m.episodes ?? null,
      status: formatStatus(m.status),
      score: m.averageScore ? +(m.averageScore / 10).toFixed(1) : null,
      synopsis: m.description?.replace(/<[^>]+>/g, '') ?? null,
      background: null,
      season: m.season?.toLowerCase() ?? null,
      year: m.seasonYear ?? null,
      images: {
        jpg: {
          image_url: m.coverImage?.large ?? '',
          small_image_url: m.coverImage?.medium ?? '',
          large_image_url: m.coverImage?.large ?? '',
        },
        webp: {
          image_url: m.coverImage?.large ?? '',
          small_image_url: m.coverImage?.medium ?? '',
          large_image_url: m.coverImage?.large ?? '',
        },
      },
    };
  } catch {
    clearTimeout(timer);
    return null;
  }
}

function formatType(f: string): string {
  const map: Record<string, string> = { TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA' };
  return map[f] ?? f ?? 'Anime';
}

function formatStatus(s: string): string {
  const map: Record<string, string> = { FINISHED: 'Finished Airing', RELEASING: 'Currently Airing', NOT_YET_RELEASED: 'Not yet aired', CANCELLED: 'Cancelled' };
  return map[s] ?? s ?? '';
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const malId = parseInt(id);

  if (isNaN(malId)) {
    return NextResponse.json({ error: 'ID de anime inválido.' }, { status: 400 });
  }

  // 1️⃣ Try Jikan
  const jikanData = await tryJikan(`/anime/${malId}`);
  if (jikanData?.data) {
    return NextResponse.json(jikanData, {
      headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' },
    });
  }

  // 2️⃣ Fallback: AniList
  const anilistData = await fetchAniListById(malId);
  if (anilistData) {
    return NextResponse.json(
      { data: anilistData, source: 'anilist' },
      { headers: { 'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600' } }
    );
  }

  return NextResponse.json({ error: 'No se pudo cargar el anime. Intenta de nuevo.' }, { status: 503 });
}
