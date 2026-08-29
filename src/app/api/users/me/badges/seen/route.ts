import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${apiHost}/users/me/badges/seen`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.message || 'Failed to mark badges seen' },
        { status: response.status }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Failed to mark badges seen:', error);
    return Response.json({ error: 'Failed to mark badges seen' }, { status: 500 });
  }
}
