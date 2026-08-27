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
