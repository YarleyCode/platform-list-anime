/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';

const JIKAN_API_BASE = 'https://api.jikan.moe/v4';

/** Fetch Jikan with timeout, returns null on any error */
async function tryJikan(endpoint: string): Promise<any | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const res = await fetch(`${JIKAN_API_BASE}${endpoint}`, {
      signal: controller.signal,
      // Shared Next data cache: character lists barely change — 24 hours.
      next: { revalidate: 86400 },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return res.json();
  } catch {
    clearTimeout(timer);
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const malId = parseInt(id);

  if (isNaN(malId)) {
    return NextResponse.json({ error: 'ID inválido.' }, { status: 400 });
  }

  // Characters only come from Jikan/MAL, no equivalent in AniList easily
  const data = await tryJikan(`/anime/${malId}/characters`);
  if (data) {
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800' },
    });
  }

  // Return empty array gracefully so the page still renders
  return NextResponse.json({ data: [] }, { status: 200 });
}
