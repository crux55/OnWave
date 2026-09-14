import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.text();
    const response = await fetch(`${apiHost}/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body,
    });

    if (!response.ok) {
      if (response.status === 401) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.message || 'Failed to open room' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to open room:', error);
    return Response.json({ error: 'Failed to open room' }, { status: 500 });
  }
}

export async function GET() {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';

  try {
    const response = await fetch(`${apiHost}/rooms`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.message || 'Failed to list rooms' },
        { status: response.status }
      );
    }
    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to list rooms:', error);
    return Response.json({ error: 'Failed to list rooms' }, { status: 500 });
  }
}
