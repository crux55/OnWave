
import type { RadioStation } from '@/lib/types';

export const mockStations: RadioStation[] = [
  {
    id: '1',
    name: 'Synthwave FM',
    streamUrl: 'https://stream.synthwaveradio.org:8443/stream', // Example, might not be a real stream
    genre: 'Synthwave',
    country: 'USA',
    faviconUrl: 'https://placehold.co/100x100.png',
  },
  {
    id: '2',
    name: 'Chillhop Raccoon',
    streamUrl: 'https://stream.streemlion.com/chsystem', // Example, might not be a real stream
    genre: 'Lo-Fi Hip Hop',
    country: 'Netherlands',
    faviconUrl: 'https://placehold.co/100x100.png',
  },
  {
    id: '3',
    name: 'Jazz Radio FR', // Updated name
    streamUrl: 'https://jazzradio.ice.infomaniak.ch/jazzradio-high.mp3', // Updated to a working HTTPS MP3 stream
    genre: 'Jazz',
    country: 'France', // Updated country
    faviconUrl: 'https://placehold.co/100x100.png',
  },
  {
    id: '4',
    name: 'Classic Rock Hits',
    streamUrl: 'http://media-ice.musicradio.com/ClassicFMMP3', // Example (Classic FM, not rock)
    genre: 'Classic Rock',
    country: 'UK',
    faviconUrl: 'https://placehold.co/100x100.png',
  },
  {
    id: '5',
    name: 'Indie Pop Radio',
    streamUrl: 'https://kexp-mp3-128.streamguys1.com/kexp128.mp3', // Example (KEXP)
    genre: 'Indie Pop',
    country: 'USA',
    faviconUrl: 'https://placehold.co/100x100.png',
  },
  {
    id: '6',
    name: 'Electro Swing Elite',
    streamUrl: 'http://broadcast.electroswingelite.com:8000/ese-128.mp3', // Example
    genre: 'Electro Swing',
    country: 'Germany',
    faviconUrl: 'https://placehold.co/100x100.png',
  },
  {
    id: '7',
    name: 'Ambient Dreams',
    streamUrl: 'https://streams.fluid-radio.co.uk/fluid.mp3', // Example (Fluid Radio)
    genre: 'Ambient',
    country: 'UK',
    faviconUrl: 'https://placehold.co/100x100.png',
  },
  {
    id: '8',
    name: 'Reggae Vibes',
    streamUrl: 'http://priboj.primcast.com:6050/;', // Example (Might be dead)
    genre: 'Reggae',
    country: 'Jamaica',
    faviconUrl: 'https://placehold.co/100x100.png',
  },
];

