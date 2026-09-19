import type { NextRequest } from 'next/server';

// In production, nginx routes /api/* straight to the Go backend (see
// nginx.prod.conf) -- this file never actually runs there. It exists so
// `npm run dev` (no nginx in front) proxies the same way as prod, matching
// the pattern every other /api/* route in this app already follows.
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  const token = request.cookies.get('token')?.value ||
                request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.text();

    const response = await fetch(`${apiHost}/badges/${params.id}`, {
      method: 'PATCH',
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
      const errorText = await response.text().catch(() => '');
      return Response.json(
        { error: errorText || 'Failed to update badge' },
        { status: response.status }
      );
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error('Failed to update badge:', error);
    return Response.json({ error: 'Failed to update badge' }, { status: 500 });
  }
}
