import { YouTubeAdapter } from './youtube.js';
import { TikTokAdapter } from './tiktok.js';
import { FacebookAdapter } from './facebook.js';
import { InstagramAdapter } from './instagram.js';
import type { PlatformAdapter } from './base.js';

const adapters: PlatformAdapter[] = [
  new YouTubeAdapter(),
  new TikTokAdapter(),
  new FacebookAdapter(),
  new InstagramAdapter()
];

export function getAdapterForUrl(url: string): PlatformAdapter | null {
  for (const adapter of adapters) {
    if (adapter.inspect(url)) {
      return adapter;
    }
  }
  return null;
}

export function getAllAdapters() {
  return adapters.map(a => ({
    name: a.platformName,
    active: true
  }));
}
