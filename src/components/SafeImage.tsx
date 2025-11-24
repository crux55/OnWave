import Image from 'next/image';
import { useState } from 'react';

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

  // Validate URL
  const isValidUrl = (urlString: string | null | undefined): boolean => {
    if (!urlString || typeof urlString !== 'string') return false;
    try {
      const url = new URL(urlString);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  };

  if (!isValidUrl(src) || hasError) {
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