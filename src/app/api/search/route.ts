/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

const JIKAN_API_BASE = 'https://api.jikan.moe/v4';
const ANILIST_API = 'https://graphql.anilist.co';

// ─── Jikan search ──────────────────────────────────────────────────────────────
async function searchJikan(query: string): Promise<any[] | null> {
  const controller = new AbortController();
  // Short timeout so the AniList fallback kicks in quickly when Jikan is slow.
  const timer = setTimeout(() => controller.abort(), 4000);

  try {
    const res = await fetch(
      `${JIKAN_API_BASE}/anime?q=${encodeURIComponent(query)}&limit=6&sfw=true`,
      {
        signal: controller.signal,
        // Shared Next data cache: repeated dropdown queries are served from cache.
        next: { revalidate: 120 },
      }
    );
    clearTimeout(timer);

    if (!res.ok) return null; // Jikan down → fallback
    const json = await res.json();
    return json.data ?? null;
  } catch {
    clearTimeout(timer);
    return null; // Timeout or network error → fallback
  }
}

// ─── AniList fallback ──────────────────────────────────────────────────────────
async function searchAniList(query: string): Promise<any[]> {
  const graphql = {
    query: `
      query ($search: String) {
        Page(perPage: 6) {
          media(search: $search, type: ANIME, isAdult: false) {
            id
            idMal
            title { romaji english }
            coverImage { medium large }
            format
            averageScore
            episodes
            status
            season
            seasonYear
          }
        }
      }
    `,
    variables: { search: query },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(graphql),
      signal: controller.signal,
      // Shared Next data cache: same as the Jikan search above.
      next: { revalidate: 120 },
    });
    clearTimeout(timer);

    if (!res.ok) throw new Error(`AniList ${res.status}`);
    const json = await res.json();
    const media = json?.data?.Page?.media ?? [];

    // Normalize to Jikan-like shape so the client doesn't need changes
    return media.map((m: any) => ({
      mal_id: m.idMal ?? m.id,
      title: m.title?.english || m.title?.romaji || 'Sin título',
      type: formatAniListType(m.format),
      score: m.averageScore ? +(m.averageScore / 10).toFixed(1) : null,
      images: {
        jpg: {
          small_image_url: m.coverImage?.medium ?? '',
          image_url: m.coverImage?.large ?? '',
          large_image_url: m.coverImage?.large ?? '',
        },
        webp: {
          small_image_url: m.coverImage?.medium ?? '',
          image_url: m.coverImage?.large ?? '',
          large_image_url: m.coverImage?.large ?? '',
        },
      },
    }));
  } catch {
    clearTimeout(timer);
    throw new Error('Ambas APIs no están disponibles. Intenta más tarde.');
  }
}

function formatAniListType(format: string): string {
  const map: Record<string, string> = {
    TV: 'TV',
    TV_SHORT: 'TV Short',
    MOVIE: 'Movie',
    SPECIAL: 'Special',
    OVA: 'OVA',
    ONA: 'ONA',
    MUSIC: 'Music',
  };
  return map[format] ?? format ?? 'Anime';
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.trim();

  if (!query || query.length < 2) {
    return NextResponse.json({ error: 'Escribe al menos 2 caracteres.' }, { status: 400 });
  }

  try {
    // 1️⃣ Try Jikan first (has MAL IDs, best match)
    const jikanResults = await searchJikan(query);
    if (jikanResults !== null) {
      return NextResponse.json(
        { data: jikanResults, source: 'jikan' },
        { headers: { 'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300' } }
      );
    }

    // 2️⃣ Jikan down → fallback to AniList
    console.warn('[/api/search] Jikan unavailable, falling back to AniList');
    const anilistResults = await searchAniList(query);
    return NextResponse.json(
      { data: anilistResults, source: 'anilist' },
      { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'No se pudo buscar. Intenta de nuevo.';
    console.error('[/api/search] Both APIs failed:', msg);
    return NextResponse.json(
      { error: msg },
      { status: 503 }
    );
  }
}
