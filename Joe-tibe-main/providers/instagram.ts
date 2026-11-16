import type { VideoMetadata, PlatformAdapter } from './base.js';

export class InstagramAdapter implements PlatformAdapter {
  platformName = 'instagram';

  inspect(url: string): boolean {
    return /instagram\.com|instagr\.am/i.test(url);
  }

  async fetchMetadata(url: string): Promise<VideoMetadata> {
    return {
      id: 'ig_' + Date.now(),
      title: 'ريلز إنستغرام أو فيديو',
      thumbnail: 'https://images.unsplash.com/photo-1611262588024-d124302989bf?w=600&auto=format&fit=crop&q=80',
      author: 'Instagram Creator',
      duration: '00:45',
      url,
      platform: 'instagram',
      downloadAvailable: true,
      formats: [
        { quality: 'فيديو MP4 عالي الوضوح', format: 'mp4', hasAudio: true, hasVideo: true }
      ]
    };
  }
}
