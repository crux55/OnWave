import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';

  try {
    const body = await request.json();

    const response = await fetch(`${apiHost}/users/verify-email-change`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      return Response.json(
        { error: errorText || 'Failed to confirm email change' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to confirm email change:', error);
    return Response.json({ error: 'Failed to confirm email change' }, { status: 500 });
  }
}
