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
    />
  );
};