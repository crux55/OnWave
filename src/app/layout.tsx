
import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
// import { GeistMono } from 'geist/font/mono'; // Removed as per previous fix if geist/font/mono is not installed. Re-add if installed.
import './globals.css';
import { PlayerProvider } from '@/contexts/PlayerContext'; // Changed
import { Toaster } from '@/components/ui/toaster';

const geistSans = GeistSans;
// const geistMono = GeistMono; // Removed as per previous fix

export const metadata: Metadata = {
  title: 'OnWave - Your Radio Companion',
  description: 'Discover and listen to radio stations from around the world.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}> {/* Removed geistMono.variable if not used/installed */}
        <PlayerProvider>
          {children}
        </PlayerProvider>
        <Toaster />
      </body>
    </html>
  );
}
