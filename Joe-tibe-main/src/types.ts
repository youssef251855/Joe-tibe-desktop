export interface QualityOption {
  quality: string;
  format: "mp4" | "mp3" | "m4a" | "jpg" | string;
  formatCode: string;
  hasAudio: boolean;
  hasVideo: boolean;
  sizeEstimate?: string;
  directStreamAvailable: boolean;
  // Present for TikTok / Facebook / Instagram / X direct-CDN media.
  // The client downloads these through the secure serverless media proxy.
  directUrl?: string;
}

export interface VideoDetails {
  id: string;
  url: string;
  title: string;
  author: string;
  authorUrl?: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  views: number;
  uploadDate?: string;
  platform?: string;
  qualities: QualityOption[];
}

export interface SearchResultItem {
  id: string;
  url: string;
  title: string;
  description?: string;
  duration: string;
  durationSeconds: number;
  thumbnail: string;
  author: string;
  views: number;
  ago?: string;
}

export interface HistoryItem {
  id: string;
  videoId: string;
  title: string;
  thumbnail: string;
  quality: string;
  format: string;
  downloadUrl: string;
  downloadedAt: number;
}

export interface PlaylistItem {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  duration: string;
  author: string;
}

export interface PlaylistDetails {
  playlistId: string;
  title: string;
  author: string;
  itemCount: number;
  items: PlaylistItem[];
}
