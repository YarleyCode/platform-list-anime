/* eslint-disable @typescript-eslint/no-explicit-any */
export interface JikanImage {
  image_url: string;
  small_image_url: string;
  large_image_url: string;
}

export interface JikanAnime {
  mal_id: number;
  url?: string;
  images: {
    jpg: JikanImage;
    webp: JikanImage;
  };
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  type: string;
  episodes: number | null;
  status: string;
  score: number | null;
  synopsis: string | null;
  background: string | null;
  season: string | null;
  year: number | null;
}

export interface JikanResponse<T> {
  data: T;
  pagination?: {
    last_visible_page: number;
    has_next_page: boolean;
    current_page: number;
    items: {
      count: number;
      total: number;
      per_page: number;
    };
  };
}

const JIKAN_API_BASE = 'https://api.jikan.moe/v4';
const ANILIST_API = 'https://graphql.anilist.co';

// ─── Shared helpers ────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

/** Try Jikan with retries + timeout. Returns null if unavailable. */
async function tryJikan<T>(endpoint: string, revalidate = 3600, retries = 2): Promise<T | null> {
  const url = `${JIKAN_API_BASE}${endpoint}`;

  for (let i = 0; i <= retries; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const res = await fetch(url, {
        next: { revalidate },
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (res.ok) return res.json() as Promise<T>;

      if (res.status === 429 || res.status >= 500) {
        if (i < retries) { await sleep(600 * (i + 1)); continue; }
        return null; // Jikan down
      }

      return null;
    } catch {
      clearTimeout(timer);
      if (i < retries) { await sleep(600 * (i + 1)); continue; }
      return null;
    }
  }
  return null;
}

// ─── AniList helpers ───────────────────────────────────────────────────────────

function formatType(f: string): string {
  const map: Record<string, string> = { TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA' };
  return map[f] ?? f ?? 'Anime';
}

function formatStatus(s: string): string {
  const map: Record<string, string> = { FINISHED: 'Finished Airing', RELEASING: 'Currently Airing', NOT_YET_RELEASED: 'Not yet aired', CANCELLED: 'Cancelled' };
  return map[s] ?? s ?? '';
}

function makeImageObj(large: string, medium: string): { jpg: JikanImage; webp: JikanImage } {
  const obj: JikanImage = { image_url: large, small_image_url: medium, large_image_url: large };
  return { jpg: obj, webp: obj };
}

async function anilistQuery(query: string, variables: Record<string, any>): Promise<any> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(ANILIST_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal,
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

// ─── AniList List Fallbacks ───────────────────────────────────────────────────

async function fetchAniListTop(page: number, perPage = 25): Promise<JikanAnime[] | null> {
  const gql = `
    query ($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) {
          id idMal
          title { romaji english native }
          coverImage { large medium }
          format averageScore episodes status season seasonYear
          description
        }
      }
    }
  `;
  const json = await anilistQuery(gql, { page, perPage });
  const media = json?.data?.Page?.media;
  if (!media) return null;

  return media.map((m: any) => ({
    mal_id: m.idMal ?? m.id,
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
    images: makeImageObj(m.coverImage?.large ?? '', m.coverImage?.medium ?? ''),
  }));
}

async function fetchAniListSearch(query: string, page: number, perPage = 25): Promise<JikanAnime[] | null> {
  const gql = `
    query ($search: String, $page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        media(search: $search, type: ANIME, isAdult: false) {
          id idMal
          title { romaji english native }
          coverImage { large medium }
          format averageScore episodes status season seasonYear
          description
        }
      }
    }
  `;
  const json = await anilistQuery(gql, { search: query, page, perPage });
  const media = json?.data?.Page?.media;
  if (!media) return null;

  return media.map((m: any) => ({
    mal_id: m.idMal ?? m.id,
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
    images: makeImageObj(m.coverImage?.large ?? '', m.coverImage?.medium ?? ''),
  }));
}

// ─── Public API ────────────────────────────────────────────────────────────────

export const getTopAnime = async (page = 1): Promise<JikanResponse<JikanAnime[]>> => {
  const data = await tryJikan<JikanResponse<JikanAnime[]>>(`/top/anime?page=${page}`, 3600);
  if (data?.data) return data;

  // Fallback to AniList
  const fallback = await fetchAniListTop(page);
  if (fallback) return { data: fallback };

  throw new Error('No se pudieron cargar los animes populares. Intenta de nuevo.');
};

export const searchAnime = async (query: string, page = 1): Promise<JikanResponse<JikanAnime[]>> => {
  const data = await tryJikan<JikanResponse<JikanAnime[]>>(`/anime?q=${encodeURIComponent(query)}&page=${page}`, 60);
  if (data?.data) return data;

  // Fallback to AniList
  const fallback = await fetchAniListSearch(query, page);
  if (fallback) return { data: fallback };

  throw new Error('Búsqueda no disponible. Intenta de nuevo.');
};

/** Get anime by MAL ID — falls back to AniList when Jikan/MAL is down */
export const getAnimeById = async (id: number): Promise<JikanResponse<JikanAnime>> => {
  // 1️⃣ Try Jikan
  const jikanData = await tryJikan<JikanResponse<JikanAnime>>(`/anime/${id}`, 86400);
  if (jikanData?.data) return jikanData;

  // 2️⃣ Fallback: AniList by MAL ID
  const gql = `
    query ($idMal: Int) {
      Media(idMal: $idMal, type: ANIME) {
        id idMal
        title { romaji english native }
        description(asHtml: false)
        coverImage { large medium }
        format status episodes averageScore season seasonYear
      }
    }
  `;
  const json = await anilistQuery(gql, { idMal: id });
  const m = json?.data?.Media;

  if (!m) throw new Error('No se pudo cargar este anime. Intenta de nuevo.');

  const anime: JikanAnime = {
    mal_id: m.idMal ?? id,
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
    images: makeImageObj(m.coverImage?.large ?? '', m.coverImage?.medium ?? ''),
  };

  return { data: anime };
};

/** Get anime characters — returns empty array gracefully when Jikan is down */
export const getAnimeCharacters = async (id: number): Promise<JikanResponse<any[]>> => {
  const data = await tryJikan<JikanResponse<any[]>>(`/anime/${id}/characters`, 86400);
  if (data?.data) return data;
  return { data: [] }; // Graceful degradation — page still renders
};

export interface JikanEpisode {
  mal_id: number;
  url: string;
  title: string;
  title_japanese: string | null;
  title_romanji: string | null;
  duration: number | null;
  aired: string | null;
  filler: boolean;
  recap: boolean;
  forum_url: string | null;
}

export const getAnimeEpisodes = async (id: number, page = 1): Promise<JikanResponse<JikanEpisode[]>> => {
  const data = await tryJikan<JikanResponse<JikanEpisode[]>>(`/anime/${id}/episodes?page=${page}`, 86400);
  if (data?.data) return data;
  return { data: [] }; // Graceful degradation
};

// ─── Related Anime (Prequel / Sequel) ─────────────────────────────────────────

export interface RelatedAnimeItem {
  malId: number;
  title: string;
  imageUrl: string | null;
  relationType: 'prequel' | 'sequel' | 'recommendation';
}

/** Run async tasks over `items` with a hard concurrency cap, preserving input order. */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await fn(items[i]);
    }
  });
  await Promise.all(workers);
  return results;
}

/** Fetch prequel/sequel from Jikan; fallback to AniList on failure. */
export const getAnimeRelations = async (id: number): Promise<RelatedAnimeItem[]> => {
  const jikanData = await tryJikan<any>(`/anime/${id}/relations`, 86400);
  if (jikanData?.data) {
    const filtered = jikanData.data.filter(
      (r: any) => r.relation === 'Prequel' || r.relation === 'Sequel'
    );

    // Jikan relation entries only carry { mal_id, type, name, url } — no images —
    // so anime entries still need one detail fetch for the cover. Entries of other
    // types (manga, etc.) can't be resolved via /anime/{id} (overlapping id space),
    // so skip the detail fetch for them and keep name + null image.
    const flat: {
      malId: number;
      name: string;
      relationType: 'prequel' | 'sequel';
      needsDetail: boolean;
    }[] = [];
    for (const rel of filtered) {
      for (const entry of rel.entry ?? []) {
        if (!entry?.mal_id) continue;
        flat.push({
          malId: entry.mal_id,
          name: entry.name || 'Sin título',
          relationType: rel.relation === 'Prequel' ? 'prequel' : 'sequel',
          needsDetail: !entry.type || entry.type === 'anime',
        });
      }
    }

    // Detail fetches run in parallel (max 3 in flight, no sleeps) — Next's fetch
    // cache with revalidate 86400 also dedupes repeated ids across requests.
    const items: RelatedAnimeItem[] = await mapWithConcurrency(flat, 3, async (rel) => {
      if (!rel.needsDetail) {
        return {
          malId: rel.malId,
          title: rel.name,
          imageUrl: null,
          relationType: rel.relationType,
        };
      }
      const detail = await tryJikan<any>(`/anime/${rel.malId}`, 86400);
      return {
        malId: rel.malId,
        title: detail?.data?.title || rel.name || 'Sin título',
        imageUrl: detail?.data?.images?.jpg?.image_url ?? null,
        relationType: rel.relationType,
      };
    });

    return items;
  }

  // Fallback: AniList
  return fetchAniListRelations(id);
};

async function fetchAniListRelations(id: number): Promise<RelatedAnimeItem[]> {
  const gql = `
    query ($idMal: Int) {
      Media(idMal: $idMal, type: ANIME) {
        relations {
          edges {
            relationType
            node {
              idMal
              title { romaji }
              coverImage { large }
            }
          }
        }
      }
    }
  `;
  const json = await anilistQuery(gql, { idMal: id });
  const edges = json?.data?.Media?.relations?.edges;
  if (!edges) return [];

  return edges
    .filter(
      (e: any) => e.relationType === 'PREQUEL' || e.relationType === 'SEQUEL'
    )
    .map((e: any) => ({
      malId: e.node.idMal ?? 0,
      title: e.node.title?.romaji || 'Sin título',
      imageUrl: e.node.coverImage?.large ?? null,
      relationType: e.relationType === 'PREQUEL' ? 'prequel' as const : 'sequel' as const,
    }));
}

// ─── Recommendations ──────────────────────────────────────────────────────────

/** Fetch recommendations from Jikan; fallback to AniList on failure. */
export const getAnimeRecommendations = async (id: number): Promise<RelatedAnimeItem[]> => {
  const jikanData = await tryJikan<any>(`/anime/${id}/recommendations`, 86400);
  if (jikanData?.data) {
    const sorted = [...jikanData.data].sort(
      (a: any, b: any) => (b.votes || 0) - (a.votes || 0)
    );
    return sorted.slice(0, 10).map((r: any) => ({
      malId: r.entry.mal_id,
      title: r.entry.title,
      imageUrl: r.entry.images?.jpg?.image_url ?? null,
      relationType: 'recommendation' as const,
    }));
  }

  // Fallback: AniList
  return fetchAniListRecommendations(id);
};

async function fetchAniListRecommendations(id: number): Promise<RelatedAnimeItem[]> {
  const gql = `
    query ($idMal: Int) {
      Media(idMal: $idMal, type: ANIME) {
        recommendations(sort: RATING_DESC, perPage: 10) {
          nodes {
            mediaRecommendation {
              idMal
              title { romaji }
              coverImage { large }
            }
          }
        }
      }
    }
  `;
  const json = await anilistQuery(gql, { idMal: id });
  const nodes = json?.data?.Media?.recommendations?.nodes;
  if (!nodes) return [];

  return nodes
    .filter((n: any) => n.mediaRecommendation)
    .map((n: any) => ({
      malId: n.mediaRecommendation.idMal ?? 0,
      title: n.mediaRecommendation.title?.romaji || 'Sin título',
      imageUrl: n.mediaRecommendation.coverImage?.large ?? null,
      relationType: 'recommendation' as const,
    }));
}
