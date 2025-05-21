
import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { PlayerProvider } from '@/contexts/PlayerContext'; // Changed
import { Toaster } from '@/components/ui/toaster';

const geistSans = GeistSans;
const geistMono = GeistMono;

export const metadata: Metadata = {
  title: 'OnWave - Your Radio Companion',
  description: 'Discover and listen to radio stations from around the world.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'OnWave',
    // startupImage: [], // You can add startup images for iOS
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: 'hsl(270 30% 12%)', // Corresponds to background from globals.css
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <PlayerProvider>
          {children}
        </PlayerProvider>
        <Toaster />
      </body>
    </html>
  );
}
