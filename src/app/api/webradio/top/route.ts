import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';

  try {
    const response = await fetch(`${apiHost}/webradio/top`);

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { error: `Backend error: ${response.status} ${errorText || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Accept grouped object { featured, popular, trending, random } or legacy flat array
    const isGrouped =
      data && typeof data === 'object' && !Array.isArray(data) &&
      ('featured' in data || 'popular' in data || 'trending' in data || 'random' in data);
    const isLegacyArray = Array.isArray(data);

    if (!isGrouped && !isLegacyArray) {
      console.error('Invalid response format from /webradio/top:', data);
      return Response.json(
        { error: 'Invalid response format: expected grouped object or array' },
        { status: 500 }
      );
    }

    return Response.json(data);
  } catch (error) {
    console.error('Failed to fetch top stations:', error);
    return Response.json(
      { error: 'Failed to fetch top stations' },
      { status: 500 }
    );
  }
}
