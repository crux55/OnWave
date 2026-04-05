import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://backend:8080';
  const { searchParams } = new URL(request.url);
  
  const queryString = searchParams.toString();
  const url = `${apiHost}/webradio/search${queryString ? `?${queryString}` : ''}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      return Response.json(
        { error: `Backend error: ${response.status} ${errorText || response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error('Failed to fetch search results:', error);
    return Response.json(
      { error: 'Failed to fetch search results' },
      { status: 500 }
    );
  }
}
