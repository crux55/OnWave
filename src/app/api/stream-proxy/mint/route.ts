import type { NextRequest } from 'next/server';

// In production, nginx routes /api/* straight to the Go backend (see
// nginx.prod.conf) -- this file never actually runs there. It exists so
// `npm run dev` (no nginx in front) proxies the same way as prod, matching
// the pattern every other /api/* route in this app already follows.
export async function POST(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';

  try {
    const body = await request.text();

    const response = await fetch(`${apiHost}/stream-proxy/mint`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') || 'application/json' },
    });
  } catch (error) {
    console.error('Failed to mint stream-proxy URL:', error);
    return Response.json({ error: 'Failed to mint proxy URL' }, { status: 500 });
  }
}
