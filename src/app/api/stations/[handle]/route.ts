import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { handle: string } }) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';

  try {
    const response = await fetch(`${apiHost}/stations/${params.handle}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.message || 'Failed to fetch station' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to fetch station:', error);
    return Response.json({ error: 'Failed to fetch station' }, { status: 500 });
  }
}
