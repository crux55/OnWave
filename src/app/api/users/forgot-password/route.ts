import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';

  try {
    const body = await request.json();

    const response = await fetch(`${apiHost}/users/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    if (!response.ok) {
      return new Response(text, { status: response.status });
    }

    return new Response(text, { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Forgot-password proxy error:', error);
    return Response.json({ error: 'Request failed' }, { status: 500 });
  }
}
