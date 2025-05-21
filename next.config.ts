import type {NextConfig} from 'next';
import PWA from '@ducanh2912/next-pwa';

const withPWA = PWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  // fallbacks: {
    // image: "/static/images/fallback.png",
    // document: "/offline", // if you want to fallback to a custom page rather than /_offline
    // font: '/static/font/fallback.woff2',
    // audio: ...,
    // video: ...,
  // },
  // cacheOnFrontEndNav: true, // Caches pages navigated to dynamically.
  // aggressiveFrontEndNavCaching: true, // Aggressively caches all links. May lead to stale content.
  // reloadOnOnline: true, // Reloads page when app comes back online.
});

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default withPWA(nextConfig);
