import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';

  const upstream = await fetch(`${apiHost}/stream-proxy/${params.key}`, {
    signal: request.signal,
  });

  if (!upstream.ok || !upstream.body) {
    return new Response('Stream unavailable', { status: upstream.status || 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstream.headers.get('Content-Type') || 'audio/mpeg',
      'Cache-Control': 'no-cache',
    },
  });
}
