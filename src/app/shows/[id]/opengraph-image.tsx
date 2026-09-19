import { ImageResponse } from 'next/og';

import { fetchShowForMetadata, showStatusLabel, hueFromId } from './shared';

export const runtime = 'nodejs'; // self-hosted standalone build, not Vercel edge
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const show = await fetchShowForMetadata(id);

  const name = show?.name || 'OnWave Show';
  const who = show?.dj_name || show?.station_name || 'OnWave';
  const statusLabel = show ? showStatusLabel(show.status) : 'OnWave';
  const isLive = show?.status === 'live';
  const hue = hueFromId(id);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '64px',
          background: `linear-gradient(135deg, hsl(${hue}, 75%, 30%) 0%, hsl(${(hue + 60) % 360}, 70%, 14%) 100%)`,
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: isLive ? '#ff5c7a' : 'rgba(255,255,255,0.75)',
          }}
        >
          {isLive && <div style={{ display: 'flex', width: 14, height: 14, borderRadius: 999, background: '#ff5c7a' }} />}
          {statusLabel}
        </div>
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, marginTop: 16, lineHeight: 1.15 }}>{name}</div>
        <div style={{ display: 'flex', fontSize: 32, marginTop: 20, opacity: 0.85 }}>{who} · OnWave</div>
      </div>
    ),
    { ...size }
  );
}
