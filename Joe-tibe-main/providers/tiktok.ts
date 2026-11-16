import type { VideoMetadata, PlatformAdapter } from './base.js';

export class TikTokAdapter implements PlatformAdapter {
  platformName = 'tiktok';

  inspect(url: string): boolean {
    return /tiktok\.com|douyin\.com|vm\.tiktok\.com|vt\.tiktok\.com/i.test(url);
  }

  async fetchMetadata(url: string): Promise<VideoMetadata> {
    let title = 'فيديو تيك توك بدون علامة مائية';
    let author = 'TikTok Creator';
    let thumbnail = 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=600&auto=format&fit=crop&q=80';

    try {
      const res = await fetch('https://www.tikwm.com/api/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ url: url.trim(), hd: '1' }),
        signal: AbortSignal.timeout(5000)
      });
      const json = await res.json();
      if (json.code === 0 && json.data) {
        if (json.data.title) title = json.data.title;
        if (json.data.cover) thumbnail = json.data.cover;
        if (json.data.author?.nickname) author = json.data.author.nickname;
      }
    } catch {}

    return {
      id: 'tk_' + Date.now(),
      title,
      thumbnail,
      author,
      duration: '00:30',
      url,
      platform: 'tiktok',
      downloadAvailable: true,
      formats: [
        { quality: 'فيديو HD (بدون علامة مائية)', format: 'mp4', hasAudio: true, hasVideo: true },
        { quality: 'صوت التيك توك الأصلي MP3', format: 'mp3', hasAudio: true, hasVideo: false }
      ]
    };
  }
}
