
export type RadioStation = {
  id: string;
  name: string;
  streamUrl: string;
  genre: string;
  country: string;
  faviconUrl?: string; // Optional: URL to the station's favicon or logo
};

export type AIRecommendation = {
  id: string;
  name: string;
  reason?: string; // Optional: Why this station is recommended
};
