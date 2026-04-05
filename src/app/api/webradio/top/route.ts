import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://backend:8080';

  try {
    const response = await fetch(`${apiHost}/webradio/top`);
    
    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { error: `Backend error: ${response.status} ${errorText || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    
    if (!Array.isArray(data)) {
      console.error('Invalid response format from /webradio/top:', data);
      return Response.json(
        { error: 'Invalid response format: expected array' },
        { status: 500 }
      );
    }

    return Response.json(data);
  } catch (error) {
    console.error('Failed to fetch top stations:', error);
    return Response.json(
      { error: 'Failed to fetch top stations' },
      { status: 500 }
    );
  }
}
