import type { NextRequest } from 'next/server';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const apiHost = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://backend:8080';
  const token = request.cookies.get('token')?.value || 
                request.headers.get('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return Response.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const response = await fetch(`${apiHost}/reminders/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return Response.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
      const errorData = await response.json().catch(() => ({}));
      return Response.json(
        { error: errorData.message || 'Failed to delete reminder' },
        { status: response.status }
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Failed to delete reminder:', error);
    return Response.json(
      { error: 'Failed to delete reminder' },
      { status: 500 }
    );
  }
}
