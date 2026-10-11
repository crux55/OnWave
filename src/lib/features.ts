// Feature flags. Read from NEXT_PUBLIC_* so the same value is visible to
// client components and server route handlers.
//
// Go Live (DJ/station broadcasting) is off until the legal side is sorted.
// Set NEXT_PUBLIC_ENABLE_GO_LIVE=true at build time to turn it back on.
// Listening to existing live shows is unaffected.
export const GO_LIVE_ENABLED = process.env.NEXT_PUBLIC_ENABLE_GO_LIVE === 'true';
