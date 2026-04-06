
import type {NextConfig} from 'next';
import PWA from '@ducanh2912/next-pwa';

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
  }
};

export default withPWA(nextConfig);
