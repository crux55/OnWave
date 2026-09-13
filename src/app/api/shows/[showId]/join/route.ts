import type { NextRequest } from 'next/server';

// Deliberately usable when logged out (project_r#19) -- listening to a
// live show shouldn't require an account. token is forwarded when present
// so a logged-in listener's session is still attributable server-side,
// but its absence isn't rejected here the way it used to be.
export async function POST(request: NextRequest, { params }: { params: { showId: string } }) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '');

  try {
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(`${apiHost}/shows/${params.showId}/join`, {
      method: 'POST',
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.message || "This show isn't live right now" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to join broadcast:', error);
    return Response.json({ error: 'Failed to join broadcast' }, { status: 500 });
  }
}
