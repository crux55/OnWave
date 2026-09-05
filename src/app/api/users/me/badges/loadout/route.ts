import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${apiHost}/users/me/badges/loadout`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.message || 'Failed to fetch badge loadout' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to fetch badge loadout:', error);
    return Response.json({ error: 'Failed to fetch badge loadout' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.text();
    const response = await fetch(`${apiHost}/users/me/badges/loadout`, {
      method: 'PUT',
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
        { error: errorData.message || 'Failed to set badge loadout' },
        { status: response.status }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Failed to set badge loadout:', error);
    return Response.json({ error: 'Failed to set badge loadout' }, { status: 500 });
  }
}
