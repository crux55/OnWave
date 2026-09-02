import { redirect } from 'next/navigation';

// Search was absorbed into Discover's Search tab. Kept as a redirect
// (rather than deleted outright) so existing links — e.g. Home's Top Tags
// row, still pointing at /search?search=... until that page is updated —
// keep working instead of 404ing.
export default async function SearchRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string }>;
}) {
  const params = await searchParams;
  const query = params.search ? `?tab=search&search=${encodeURIComponent(params.search)}` : '?tab=search';
  redirect(`/discover${query}`);
}
