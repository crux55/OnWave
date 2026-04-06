import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';

  try {
    const body = await request.json();

    const response = await fetch(`${apiHost}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const text = await response.text();

    if (!response.ok) {
      return new Response(text, { status: response.status });
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return new Response(text, { status: 200 });
    }

    // Forward Set-Cookie headers if the backend sets them
    const setCookie = response.headers.get('set-cookie');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (setCookie) {
      headers['set-cookie'] = setCookie;
    }

    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (error) {
    console.error('Login proxy error:', error);
    return Response.json({ error: 'Login request failed' }, { status: 500 });
  }
}
