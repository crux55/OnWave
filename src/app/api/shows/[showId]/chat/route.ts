import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest, { params }: { params: { showId: string } }) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.text();
    const response = await fetch(`${apiHost}/shows/${params.showId}/chat`, {
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
        { error: errorData.message || 'Failed to send message' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data, { status: 201 });
  } catch (error) {
    console.error('Failed to send chat message:', error);
    return Response.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
