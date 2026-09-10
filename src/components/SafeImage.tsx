import Image from 'next/image';
import { useState } from 'react';
import { isValidImageUrl } from '@/lib/utils';

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  width: number;
  height: number;
  fallback?: React.ReactNode;
  className?: string;
}

export const SafeImage = ({ src, alt, width, height, fallback, className }: SafeImageProps) => {
  const [hasError, setHasError] = useState(false);

  // isValidImageUrl only recognizes absolute http(s) URLs (it uses `new
  // URL()` with no base, which throws on a relative path) — but callers now
  // legitimately pass a same-origin relative path like
  // `/api/favicon-cache?url=...` (see getProxiedFaviconUrl), so that form
  // needs to be accepted here too rather than rejected as invalid.
  const isUsableSrc = typeof src === 'string' && (isValidImageUrl(src) || src.startsWith('/'));
  if (!isUsableSrc || hasError) {
    return fallback || (
      <div className={`bg-gray-200 rounded flex items-center justify-center text-xs ${className}`} 
           style={{ width, height }}>
        📻
      </div>
    );
  }

  return (
    <Image
      src={src!}
      alt={alt}
      width={width}
      height={height}
      className={className}
      onError={() => setHasError(true)}
      // Every caller now passes a same-origin relative path
      // (/api/favicon-cache?url=...), which next/image's optimizer treats
      // as "local" and re-fetches by calling back into the Next.js server
      // itself — but that server has no route for /api/*, only nginx does
      // (it proxies /api/ straight to the Go backend at the reverse-proxy
      // layer). The self-fetch 404s there, so the optimizer reports "not a
      // valid image" for every single station. Skipping optimization lets
      // the browser request the path directly instead, the same way it
      // already fetches every other /api/* endpoint.
      unoptimized
    />
  );
};