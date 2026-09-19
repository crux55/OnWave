import type { NextRequest } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  // Optional -- this route stays reachable with no token at all for a real
  // public profile. Forwarding it when present lets the backend recognize
  // the one exception it makes: the profile's own owner previewing their
  // own currently-private profile.
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '');

  try {
    const response = await fetch(`${apiHost}/users/${params.userId}/profile`, {
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.message || 'Profile not found' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to fetch public profile:', error);
    return Response.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
