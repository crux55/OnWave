
import type {NextConfig} from 'next';
import PWA from '@ducanh2912/next-pwa';
import {withSentryConfig} from '@sentry/nextjs';

const withPWA = PWA({
  dest: 'public',
  register: true,
  disable: process.env.NODE_ENV === 'development',
  workboxOptions: {
    // Don't cache audio streams — they're live and must always come from the network
    runtimeCaching: [
      {
        urlPattern: /\/api\/webradio\//,
        handler: 'NetworkFirst',
        options: { cacheName: 'api-cache', networkTimeoutSeconds: 10 },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  /* config options here */
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [], // Allow all domains (not recommended for security reasons)
    remotePatterns:  [
      {
        protocol: "https",
        hostname: "**",
      },{
        protocol: "http",
        hostname: "**",
      },
    ] // Removing restrictions
  },
  // Cast receiver devices are known to cache a registered receiver app's
  // HTML/JS aggressively, at a level above normal HTTP revalidation
  // semantics -- a plain max-age=0 (the default for public/ static files)
  // hasn't been reliably enough to see iteration changes on the actual
  // device. no-store is the strongest signal available; still may need an
  // actual device reboot to drop an already-cached instance.
  async headers() {
    return [
      {
        source: '/cast-receiver.html',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
    ];
  },
};

// No Sentry auth token/org configured -- this is a self-hosted GlitchTip
// instance, not sentry.io, so source-map upload (which needs those) stays
// disabled. Error capture itself works purely off the DSN in
// instrumentation(-client).ts and doesn't need this wrapper's upload step.
export default withSentryConfig(withPWA(nextConfig), {
  silent: true,
  disableLogger: true,
  sourcemaps: { disable: true },
});
