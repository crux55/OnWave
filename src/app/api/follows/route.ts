import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const response = await fetch(`${apiHost}/follows`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.message || 'Failed to follow' },
        { status: response.status }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Failed to follow:', error);
    return Response.json({ error: 'Failed to follow' }, { status: 500 });
  }
}
