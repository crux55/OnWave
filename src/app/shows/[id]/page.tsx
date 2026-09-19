import type { Metadata } from 'next';

import ShowDetailClient from './ShowDetailClient';
import { fetchShowForMetadata, describeShow } from './shared';

// Everything interactive about this page (playback, chat, live polling)
// lives in ShowDetailClient, which has to be a client component. Metadata
// generation needs a server component, so this file's only job is: look up
// the show server-side for its title/description/OG tags (project_r#44),
// then render the client page underneath. opengraph-image.tsx alongside
// this file supplies the actual preview image via Next's file convention —
// no need to reference it here.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const show = await fetchShowForMetadata(id);

  if (!show) {
    return { title: 'Show — OnWave' };
  }

  const title = `${show.name} — OnWave`;
  const description = describeShow(show);

  return {
    title,
    description,
    openGraph: {
      title: show.name,
      description,
      siteName: 'OnWave',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: show.name,
      description,
    },
  };
}

export default function ShowDetailPage() {
  return <ShowDetailClient />;
}
