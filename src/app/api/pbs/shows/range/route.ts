import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const apiHost = process.env.API_BASE_URL || 'http://backend:8080';
  const { searchParams } = new URL(request.url);
  
  const queryString = searchParams.toString();

  try {
    const response = await fetch(`${apiHost}/pbs/shows/range?${queryString}`);
    
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
    console.error('Failed to fetch PBS shows:', error);
    return Response.json(
      { error: 'Failed to fetch PBS shows' },
      { status: 500 }
    );
  }
}
