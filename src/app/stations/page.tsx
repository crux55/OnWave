import { redirect } from 'next/navigation';

// The station directory moved to the Shows page (OnWave's own hosted
// stations belong there, not in Discover, which is for finding stations
// from radio-browser's external catalog). /stations/[handle] (individual
// station pages) are untouched.
export default function StationsRedirectPage() {
  redirect('/shows');
}
