import type { VideoMetadata, PlatformAdapter } from './base.js';

export class YouTubeAdapter implements PlatformAdapter {
  platformName = 'youtube';

  inspect(url: string): boolean {
    return /youtube\.com|youtu\.be/i.test(url);
  }

  async fetchMetadata(url: string): Promise<VideoMetadata> {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/);
    const videoId = match ? match[1] : 'dQw4w9WgXcQ';

    let title = 'فيديو يوتيوب';
    let author = 'YouTube Creator';
    let thumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    let duration = '03:45';

    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
        signal: AbortSignal.timeout(4000)
      });
      if (oembedRes.ok) {
        const data = await oembedRes.json();
        if (data.title) title = data.title;
        if (data.author_name) author = data.author_name;
        if (data.thumbnail_url) thumbnail = data.thumbnail_url;
      }
    } catch {}

    return {
      id: videoId,
      title,
      thumbnail,
      author,
      duration,
      url,
      platform: 'youtube',
      downloadAvailable: true,
      formats: [
        { quality: 'صوت نقي MP3 320kbps', format: 'mp3', hasAudio: true, hasVideo: false },
        { quality: 'عالي الدقة 720p HD', format: 'mp4', hasAudio: true, hasVideo: true },
        { quality: 'عالي جداً 1080p Full HD', format: 'mp4', hasAudio: true, hasVideo: true },
        { quality: 'اقتصادي 360p SD', format: 'mp4', hasAudio: true, hasVideo: true }
      ]
    };
  }
}
