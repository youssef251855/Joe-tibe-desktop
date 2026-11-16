import type { VideoMetadata, PlatformAdapter } from './base.js';

export class FacebookAdapter implements PlatformAdapter {
  platformName = 'facebook';

  inspect(url: string): boolean {
    return /facebook\.com|fb\.watch|fb\.com/i.test(url);
  }

  async fetchMetadata(url: string): Promise<VideoMetadata> {
    return {
      id: 'fb_' + Date.now(),
      title: 'فيديو فيسبوك',
      thumbnail: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=600&auto=format&fit=crop&q=80',
      author: 'Facebook Creator',
      duration: '02:15',
      url,
      platform: 'facebook',
      downloadAvailable: true,
      formats: [
        { quality: 'عالي الدقة HD', format: 'mp4', hasAudio: true, hasVideo: true },
        { quality: 'قياسي SD', format: 'mp4', hasAudio: true, hasVideo: true }
      ]
    };
  }
}
