import { redirect } from 'next/navigation';

// The station directory was absorbed into Discover's Directory tab.
// /stations/[handle] (individual station pages) are untouched.
export default function StationsRedirectPage() {
  redirect('/discover?tab=directory');
}
