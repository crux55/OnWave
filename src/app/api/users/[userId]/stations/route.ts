import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  // Optional -- this stays reachable with no token for a real public
  // profile's stations. Forwarding it when present lets the backend
  // recognize the profile's own owner previewing their own private one.
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '');

  try {
    const response = await fetch(`${apiHost}/users/${params.userId}/stations`, {
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.message || 'Failed to fetch stations' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to fetch user stations:', error);
    return Response.json({ error: 'Failed to fetch stations' }, { status: 500 });
  }
}
