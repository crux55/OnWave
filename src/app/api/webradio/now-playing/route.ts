import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return Response.json({ error: 'url is required' }, { status: 400 });
  }

  try {
    const response = await fetch(`${apiHost}/webradio/now-playing?url=${encodeURIComponent(url)}`);

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { error: errorText || `Backend error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to fetch now-playing:', error);
    return Response.json({ error: 'Failed to fetch now-playing' }, { status: 500 });
  }
}
