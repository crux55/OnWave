import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';

  try {
    const body = await request.json();

    const response = await fetch(`${apiHost}/users`, {
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

    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('Register proxy error:', error);
    return Response.json({ error: 'Registration request failed' }, { status: 500 });
  }
}
