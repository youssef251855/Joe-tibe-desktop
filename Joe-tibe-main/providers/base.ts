export interface VideoMetadata {
  id: string;
  title: string;
  thumbnail: string;
  author: string;
  duration: string | number;
  url: string;
  platform: string;
  formats: {
    quality: string;
    format: string;
    hasAudio: boolean;
    hasVideo: boolean;
    url?: string;
    directUrl?: string;
  }[];
  downloadAvailable: boolean;
}

export interface PlatformAdapter {
  platformName: string;
  inspect(url: string): boolean;
  fetchMetadata(url: string): Promise<VideoMetadata>;
}
