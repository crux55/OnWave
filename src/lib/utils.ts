import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Radio-browser.info station data sometimes has favicon set to the literal
// string "null" instead of an empty value, which passes a `value || fallback`
// truthy check but crashes next/image (it isn't a valid URL). Validate for real.
export function isValidImageUrl(urlString: string | null | undefined): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Station favicons come from third-party URLs (radio-browser.info's
// crowdsourced favicon field, mostly) that are frequently dead, blocked by
// Cross-Origin-Resource-Policy, or served over plain http — which this https
// site's browser will refuse to load as mixed content. Routing them through
// our own backend's favicon-cache endpoint instead of hotlinking directly
// fetches (and caches) the image server-side, so none of those three
// failure modes apply to the copy the browser actually loads.
export function getProxiedFaviconUrl(urlString: string | null | undefined): string | null {
  if (!isValidImageUrl(urlString)) return null;
  return `/api/favicon-cache?url=${encodeURIComponent(urlString!)}`;
}
