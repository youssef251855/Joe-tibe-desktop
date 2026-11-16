const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return clean;
  const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/);
  if (match && match[1]) return match[1];
  const fallback = clean.match(/(?:v=|(?:\/))([a-zA-Z0-9_-]{11})(?:[?&/#]|$)/);
  if (fallback && fallback[1]) return fallback[1];
  return null;
}

export function isFacebookUrl(input: string): boolean {
  if (!input) return false;
  return /facebook\.com|fb\.watch|fb\.com/i.test(input);
}

export function isTikTokUrl(input: string): boolean {
  if (!input) return false;
  return /tiktok\.com|douyin\.com|vm\.tiktok\.com|vt\.tiktok\.com/i.test(input);
}

export function isInstagramUrl(input: string): boolean {
  if (!input) return false;
  return /instagram\.com|instagr\.am/i.test(input);
}

export function isTwitterUrl(input: string): boolean {
  if (!input) return false;
  return /twitter\.com|x\.com|t\.co/i.test(input);
}

export function extractPlaylistId(input: string): string | null {
  if (!input) return null;
  let clean = input.trim();
  try {
    clean = decodeURIComponent(clean);
  } catch {}

  // 1. Match list= parameter (e.g. ?list=PLxxx or &list=PLxxx)
  const listMatch = clean.match(/[?&]list=([a-zA-Z0-9_-]+)/i);
  if (listMatch && listMatch[1]) {
    return listMatch[1];
  }

  // 2. Match browseId / VL parameter or playlist path
  const browseMatch = clean.match(/(?:browse\/|playlist\?list=|playlist\/|list\/)(VL)?([a-zA-Z0-9_-]+)/i);
  if (browseMatch && browseMatch[2]) {
    const cand = browseMatch[2];
    if (cand.length >= 8) return cand;
  }

  // 3. Raw Playlist IDs (starts with PL, RD, UU, FL, LL, OLAK5uy_, CLAK5uy_, etc.)
  const rawIdMatch = clean.match(/^((?:PL|RD|UU|FL|LL|OLAK5uy_|CLAK5uy_|TLGG)[a-zA-Z0-9_-]{8,})$/i);
  if (rawIdMatch && rawIdMatch[1]) {
    return rawIdMatch[1];
  }

  return null;
}

export function isPlaylistUrl(input: string): boolean {
  return !!extractPlaylistId(input);
}

export async function fetchTikTokMedia(url: string) {
  let title = 'فيديو تيك توك بدون علامة مائية';
  let thumbnail = 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=600&auto=format&fit=crop&q=80';
  let duration = 'HD';
  let musicInfo: any = null;
  const formats: any[] = [];

  // Tier 1: TikWM POST API
  try {
    const res = await fetch('https://www.tikwm.com/api/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: new URLSearchParams({ url: url.trim(), hd: '1' })
    });
    const json = await res.json();
    if (json.code === 0 && json.data) {
      if (json.data.title) title = json.data.title;
      if (json.data.cover) thumbnail = json.data.cover;
      if (json.data.duration) duration = `${json.data.duration} ثانية`;

      if (json.data.music_info) {
        musicInfo = {
          title: json.data.music_info.title || 'صوت تيك توك الأصلي',
          author: json.data.music_info.author || json.data.author?.nickname || 'TikTok Creator',
          playUrl: json.data.music_info.play || json.data.music,
          cover: json.data.music_info.cover || thumbnail,
          duration: json.data.music_info.duration || json.data.duration
        };
      } else if (json.data.music) {
        musicInfo = {
          title: 'صوت / فويس التيك توك',
          author: json.data.author?.nickname || 'TikTok',
          playUrl: json.data.music,
          cover: thumbnail,
          duration: json.data.duration
        };
      }

      // Voice / Audio MP3 (High Priority)
      const audioUrl = json.data.music || json.data.music_info?.play;
      if (audioUrl) {
        formats.push({
          quality: 'فويس / صوت التيك توك الأصلي MP3',
          format: 'mp3',
          hasAudio: true,
          hasVideo: false,
          url: audioUrl,
          directUrl: audioUrl
        });
        formats.push({
          quality: 'فويس التيك توك بصيغة M4A / AAC نقية',
          format: 'm4a',
          hasAudio: true,
          hasVideo: false,
          url: audioUrl,
          directUrl: audioUrl
        });
      }

      if (json.data.hdplay) {
        formats.push({
          quality: 'فيديو HD عالي الجودة (بدون علامة مائية)',
          format: 'mp4',
          hasAudio: true,
          hasVideo: true,
          url: json.data.hdplay,
          directUrl: json.data.hdplay
        });
      }

      if (json.data.play) {
        formats.push({
          quality: 'فيديو MP4 سريع (بدون علامة مائية)',
          format: 'mp4',
          hasAudio: true,
          hasVideo: true,
          url: json.data.play,
          directUrl: json.data.play
        });
      }

      if (json.data.wmplay) {
        formats.push({
          quality: 'فيديو MP4 (مع العلامة المائية الأصلية)',
          format: 'mp4',
          hasAudio: true,
          hasVideo: true,
          url: json.data.wmplay,
          directUrl: json.data.wmplay
        });
      }
    }
  } catch (e: any) {
    console.warn("TikWM fetch error:", e.message);
  }

  // Tier 2: TikWM GET fallback
  if (formats.length === 0) {
    try {
      const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url.trim())}&hd=1`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const json = await res.json();
      if (json.code === 0 && json.data) {
        if (json.data.title) title = json.data.title;
        if (json.data.cover) thumbnail = json.data.cover;
        if (json.data.duration) duration = `${json.data.duration}s`;

        if (json.data.music) {
          musicInfo = {
            title: json.data.music_info?.title || 'فويس تيك توك الأصلي',
            author: json.data.music_info?.author || 'TikTok',
            playUrl: json.data.music,
            cover: thumbnail,
            duration: json.data.duration
          };

          formats.push({
            quality: 'فويس / صوت التيك توك الأصلي MP3',
            format: 'mp3',
            hasAudio: true,
            hasVideo: false,
            url: json.data.music,
            directUrl: json.data.music
          });
        }

        const playUrl = json.data.hdplay || json.data.play;
        if (playUrl) {
          formats.push({
            quality: 'فيديو MP4 عالي الجودة (بدون علامة مائية)',
            format: 'mp4',
            hasAudio: true,
            hasVideo: true,
            url: playUrl,
            directUrl: playUrl
          });
        }
      }
    } catch (e: any) {
      console.warn("TikWM GET fallback error:", e.message);
    }
  }

  return {
    id: `tiktok_${Date.now()}`,
    url,
    title,
    thumbnail,
    duration,
    formats,
    platform: 'tiktok',
    musicInfo
  };
}

export async function fetchFacebookMedia(url: string) {
  let title = 'فيديو فيسبوك / ريلز';
  let thumbnail = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80';
  let duration = 'HD';
  const formats: any[] = [];

  // 1. Try Engine 1 (siputzx API)
  try {
    const res = await fetch(`https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (res.ok) {
      const json = await res.json();
      if (json.status && json.data) {
        if (json.data.title && json.data.title !== 'Facebook Video') {
          title = json.data.title;
        } else {
          title = 'فيديو فيسبوك ريلز';
        }
        if (json.data.thumbnail) thumbnail = json.data.thumbnail;
        if (json.data.duration) duration = json.data.duration;

        if (Array.isArray(json.data.downloads)) {
          for (const dl of json.data.downloads) {
            if (dl.url) {
              const isHd = dl.quality?.toLowerCase().includes('hd') || dl.quality?.includes('720');
              formats.push({
                quality: isHd ? 'فيديو 720p HD عالي الجودة' : 'فيديو 360p SD (توفير البيانات)',
                format: 'mp4',
                hasAudio: true,
                hasVideo: true,
                url: dl.url,
                directUrl: dl.url
              });
            }
          }
        }
      }
    }
  } catch (e: any) {
    console.warn("Siputzx FB note:", e.message);
  }

  // 2. Try Engine 2 (tioo API fallback)
  if (formats.length === 0) {
    try {
      const res = await fetch(`https://backend1.tioo.eu.org/api/downloader/fbdown?url=${encodeURIComponent(url)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status) {
          if (json.HD) {
            formats.push({
              quality: 'فيديو 720p HD عالي الجودة',
              format: 'mp4',
              hasAudio: true,
              hasVideo: true,
              url: json.HD,
              directUrl: json.HD
            });
          }
          if (json.Normal_video) {
            formats.push({
              quality: 'فيديو 360p SD عادي',
              format: 'mp4',
              hasAudio: true,
              hasVideo: true,
              url: json.Normal_video,
              directUrl: json.Normal_video
            });
          }
        }
      }
    } catch (e: any) {
      console.warn("Tioo FB note:", e.message);
    }
  }

  // 3. Audio format option
  if (formats.length > 0) {
    formats.push({
      quality: 'صوت الفيديو MP3 / M4A',
      format: 'm4a',
      hasAudio: true,
      hasVideo: false,
      url: formats[0].directUrl,
      directUrl: formats[0].directUrl
    });
  }

  return {
    id: `fb_${Date.now()}`,
    url,
    title,
    thumbnail,
    duration,
    formats,
    platform: 'facebook'
  };
}

export async function fetchInstagramMedia(url: string) {
  let title = 'فيديو / ريلز إنستغرام';
  let thumbnail = 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=600&auto=format&fit=crop&q=80';
  let duration = 'HD';
  const formats: any[] = [];

  // Engine 1: Siputzx Instagram API
  try {
    const res = await fetch(`https://api.siputzx.my.id/api/d/ig?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (res.ok) {
      const json = await res.json();
      if (json.status && json.data) {
        if (Array.isArray(json.data)) {
          json.data.forEach((item: any, idx: number) => {
            if (item.url) {
              const isVideo = item.url.includes('.mp4') || !item.url.includes('.jpg');
              formats.push({
                quality: isVideo ? `فيديو ريلز HD (مقطع ${idx + 1})` : `صورة عالية الدقة (${idx + 1})`,
                format: isVideo ? 'mp4' : 'jpg',
                hasAudio: isVideo,
                hasVideo: isVideo,
                url: item.url,
                directUrl: item.url
              });
              if (item.thumbnail) {
                thumbnail = item.thumbnail;
              }
            }
          });
        } else if (json.data.url) {
          formats.push({
            quality: 'فيديو ريلز إنستغرام HD عالي الدقة',
            format: 'mp4',
            hasAudio: true,
            hasVideo: true,
            url: json.data.url,
            directUrl: json.data.url
          });
        }
      }
    }
  } catch (e: any) {
    console.warn("Instagram siputzx error:", e.message);
  }

  // Engine 2: Tioo Instagram fallback
  if (formats.length === 0) {
    try {
      const res = await fetch(`https://backend1.tioo.eu.org/api/downloader/igdown?url=${encodeURIComponent(url)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status && json.data) {
          const items = Array.isArray(json.data) ? json.data : [json.data];
          items.forEach((item: any, idx: number) => {
            const dlUrl = item.url || item.download_url || item;
            if (typeof dlUrl === 'string' && dlUrl.startsWith('http')) {
              const isMp4 = dlUrl.includes('.mp4') || dlUrl.includes('video');
              formats.push({
                quality: isMp4 ? `فيديو إنستغرام MP4 HD (${idx + 1})` : `صورة إنستغرام HD (${idx + 1})`,
                format: isMp4 ? 'mp4' : 'jpg',
                hasAudio: isMp4,
                hasVideo: isMp4,
                url: dlUrl,
                directUrl: dlUrl
              });
            }
          });
        }
      }
    } catch (e: any) {
      console.warn("Instagram tioo error:", e.message);
    }
  }

  // Engine 3: Fast Instagram oEmbed fallback for metadata
  try {
    const oembedRes = await fetch(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`);
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      if (oembed.title) title = oembed.title;
      if (oembed.thumbnail_url && thumbnail.includes('unsplash')) thumbnail = oembed.thumbnail_url;
    }
  } catch (e) {}

  // Add Audio extraction format if video is present
  const videoFormat = formats.find(f => f.hasVideo && f.directUrl);
  if (videoFormat) {
    formats.push({
      quality: 'صوت وفويس الريلز MP3 / M4A',
      format: 'm4a',
      hasAudio: true,
      hasVideo: false,
      url: videoFormat.directUrl,
      directUrl: videoFormat.directUrl
    });
  }

  return {
    id: `ig_${Date.now()}`,
    url,
    title,
    thumbnail,
    duration,
    formats,
    platform: 'instagram'
  };
}

export async function fetchTwitterMedia(url: string) {
  let title = 'فيديو منصة X (تويتر)';
  let thumbnail = 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=600&auto=format&fit=crop&q=80';
  let duration = 'HD';
  const formats: any[] = [];

  // Engine 1: Siputzx Twitter API
  try {
    const res = await fetch(`https://api.siputzx.my.id/api/d/twitter?url=${encodeURIComponent(url)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (res.ok) {
      const json = await res.json();
      if (json.status && json.data) {
        if (json.data.title) title = json.data.title;
        if (json.data.thumbnail) thumbnail = json.data.thumbnail;

        if (Array.isArray(json.data.videos)) {
          json.data.videos.forEach((v: any) => {
            if (v.url) {
              const qualityLabel = v.quality ? `فيديو X بجودة ${v.quality}` : 'فيديو MP4 عالي الدقة';
              formats.push({
                quality: qualityLabel,
                format: 'mp4',
                hasAudio: true,
                hasVideo: true,
                url: v.url,
                directUrl: v.url
              });
            }
          });
        } else if (json.data.url) {
          formats.push({
            quality: 'فيديو X (تويتر) عالي الجودة HD',
            format: 'mp4',
            hasAudio: true,
            hasVideo: true,
            url: json.data.url,
            directUrl: json.data.url
          });
        }
      }
    }
  } catch (e: any) {
    console.warn("Twitter siputzx note:", e.message);
  }

  // Engine 2: Tioo Twitter Fallback
  if (formats.length === 0) {
    try {
      const res = await fetch(`https://backend1.tioo.eu.org/api/downloader/twitter?url=${encodeURIComponent(url)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (res.ok) {
        const json = await res.json();
        if (json.status && json.data) {
          if (json.data.HD) {
            formats.push({
              quality: 'فيديو 720p HD عالي الجودة',
              format: 'mp4',
              hasAudio: true,
              hasVideo: true,
              url: json.data.HD,
              directUrl: json.data.HD
            });
          }
          if (json.data.SD) {
            formats.push({
              quality: 'فيديو 360p SD (سريع)',
              format: 'mp4',
              hasAudio: true,
              hasVideo: true,
              url: json.data.SD,
              directUrl: json.data.SD
            });
          }
        }
      }
    } catch (e: any) {
      console.warn("Twitter tioo note:", e.message);
    }
  }

  // Add MP3 Audio format
  if (formats.length > 0) {
    formats.push({
      quality: 'صوت الفيديو MP3 / M4A',
      format: 'm4a',
      hasAudio: true,
      hasVideo: false,
      url: formats[0].directUrl,
      directUrl: formats[0].directUrl
    });
  }

  return {
    id: `tw_${Date.now()}`,
    url,
    title,
    thumbnail,
    duration,
    formats,
    platform: 'twitter'
  };
}

export async function fetchPlaylistCore(playlistUrlOrId: string) {
  const listId = extractPlaylistId(playlistUrlOrId) || playlistUrlOrId.trim();
  if (!listId) throw new Error("معرّف قائمة التشغيل غير صالح، يرجى التأكد من الرابط.");

  let playlistTitle = 'قائمة تشغيل يوتيوب';
  let playlistAuthor = 'قناة يوتيوب';
  let playlistThumbnail = `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80`;
  const videoItems: Array<{
    index: number;
    id: string;
    title: string;
    duration: string;
    thumbnail: string;
    url: string;
    uploader: string;
  }> = [];
  const foundIds = new Set<string>();

  const extractItemsFromData = (data: any) => {
    if (!data || typeof data !== 'object') return;

    // Header metadata extraction
    const header = data.header?.playlistHeaderRenderer || 
                   data.header?.pageHeaderRenderer ||
                   data.metadata?.playlistMetadataRenderer ||
                   data.microformat?.microformatDataRenderer;
    
    if (header?.title?.simpleText) playlistTitle = header.title.simpleText;
    else if (header?.pageTitle) playlistTitle = header.pageTitle;
    else if (header?.title?.runs?.[0]?.text) playlistTitle = header.title.runs[0].text;
    else if (data.metadata?.playlistMetadataRenderer?.title) playlistTitle = data.metadata.playlistMetadataRenderer.title;

    if (header?.ownerText?.runs?.[0]?.text) playlistAuthor = header.ownerText.runs[0].text;
    else if (header?.contentTitle?.simpleText) playlistAuthor = header.contentTitle.simpleText;

    // Recursive traversal for all YouTube renderer formats
    function traverse(obj: any) {
      if (!obj || typeof obj !== 'object') return;

      // 1. YouTube 2024-2026 lockupViewModel
      if (obj.lockupViewModel && obj.lockupViewModel.contentId) {
        const lvm = obj.lockupViewModel;
        const vId = lvm.contentId;
        if (vId && !foundIds.has(vId) && vId.length === 11) {
          foundIds.add(vId);
          const meta = lvm.metadata?.lockupMetadataViewModel;
          const vTitle = meta?.title?.content || lvm.rendererContext?.accessibilityContext?.label?.split(' ')?.[0] || `فيديو ${videoItems.length + 1}`;
          const thumbSources = lvm.contentImage?.thumbnailViewModel?.image?.sources;
          const vThumb = thumbSources?.[thumbSources.length - 1]?.url || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
          
          let vDuration = 'HD';
          const acc = lvm.rendererContext?.accessibilityContext?.label;
          if (acc) {
            const timeMatch = acc.match(/(\d+\s*(?:دقيقة|دقائق|ساعة|ساعات|ثانية|ثوانٍ|minutes?|seconds?|hours?)[^,]*)/i);
            if (timeMatch) vDuration = timeMatch[0].trim();
          }

          let vUploader = playlistAuthor;
          const metaRows = meta?.metadata?.contentMetadataViewModel?.metadataRows;
          if (Array.isArray(metaRows) && metaRows[0]?.metadataParts?.[0]?.text?.content) {
            vUploader = metaRows[0].metadataParts[0].text.content;
          }

          videoItems.push({
            index: videoItems.length + 1,
            id: vId,
            title: vTitle,
            duration: vDuration,
            thumbnail: vThumb,
            url: `https://www.youtube.com/watch?v=${vId}`,
            uploader: vUploader
          });
        }
      }

      // 2. Classic playlistVideoRenderer
      if (obj.playlistVideoRenderer && obj.playlistVideoRenderer.videoId) {
        const pvr = obj.playlistVideoRenderer;
        const vId = pvr.videoId;
        if (vId && !foundIds.has(vId)) {
          foundIds.add(vId);
          const vTitle = pvr.title?.runs?.[0]?.text || pvr.title?.simpleText || pvr.title?.accessibility?.accessibilityData?.label || `فيديو ${videoItems.length + 1}`;
          const vDuration = pvr.lengthText?.simpleText || pvr.lengthText?.runs?.[0]?.text || 'HD';
          const thumbSources = pvr.thumbnail?.thumbnails;
          const vThumb = thumbSources?.[thumbSources.length - 1]?.url || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
          const vAuthor = pvr.shortBylineText?.runs?.[0]?.text || playlistAuthor;

          videoItems.push({
            index: videoItems.length + 1,
            id: vId,
            title: vTitle,
            duration: vDuration,
            thumbnail: vThumb,
            url: `https://www.youtube.com/watch?v=${vId}`,
            uploader: vAuthor
          });
        }
      }

      // 3. Next endpoint playlistPanelVideoRenderer
      if (obj.playlistPanelVideoRenderer && obj.playlistPanelVideoRenderer.videoId) {
        const ppvr = obj.playlistPanelVideoRenderer;
        const vId = ppvr.videoId;
        if (vId && !foundIds.has(vId)) {
          foundIds.add(vId);
          const vTitle = ppvr.title?.runs?.[0]?.text || ppvr.title?.simpleText || `فيديو ${videoItems.length + 1}`;
          const vDuration = ppvr.lengthText?.simpleText || ppvr.lengthText?.runs?.[0]?.text || 'HD';
          const thumbSources = ppvr.thumbnail?.thumbnails;
          const vThumb = thumbSources?.[thumbSources.length - 1]?.url || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
          const vAuthor = ppvr.shortBylineText?.runs?.[0]?.text || playlistAuthor;

          videoItems.push({
            index: videoItems.length + 1,
            id: vId,
            title: vTitle,
            duration: vDuration,
            thumbnail: vThumb,
            url: `https://www.youtube.com/watch?v=${vId}`,
            uploader: vAuthor
          });
        }
      }

      // 4. Grid / compact / rich video renderers
      if (obj.gridVideoRenderer && obj.gridVideoRenderer.videoId) {
        const gvr = obj.gridVideoRenderer;
        const vId = gvr.videoId;
        if (vId && !foundIds.has(vId)) {
          foundIds.add(vId);
          const vTitle = gvr.title?.runs?.[0]?.text || gvr.title?.simpleText || `فيديو ${videoItems.length + 1}`;
          const vDuration = gvr.thumbnailOverlays?.[0]?.thumbnailOverlayTimeStatusRenderer?.text?.simpleText || 'HD';
          const thumbSources = gvr.thumbnail?.thumbnails;
          const vThumb = thumbSources?.[thumbSources.length - 1]?.url || `https://i.ytimg.com/vi/${vId}/hqdefault.jpg`;
          const vAuthor = gvr.shortBylineText?.runs?.[0]?.text || playlistAuthor;

          videoItems.push({
            index: videoItems.length + 1,
            id: vId,
            title: vTitle,
            duration: vDuration,
            thumbnail: vThumb,
            url: `https://www.youtube.com/watch?v=${vId}`,
            uploader: vAuthor
          });
        }
      }

      for (const key of Object.keys(obj)) {
        traverse(obj[key]);
      }
    }

    traverse(data);
  };

  // Tier 1: YouTube Innertube Web Browse API (Ultra fast, official JSON)
  try {
    const browseId = listId.startsWith('VL') ? listId : 'VL' + listId;
    const res = await fetch('https://www.youtube.com/youtubei/v1/browse?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Origin': 'https://www.youtube.com'
      },
      body: JSON.stringify({
        context: {
          client: {
            clientName: 'WEB',
            clientVersion: '2.20240501.00.00',
            hl: 'ar',
            gl: 'US'
          }
        },
        browseId: browseId
      }),
      signal: AbortSignal.timeout(6000)
    });

    if (res.ok) {
      const data = await res.json();
      extractItemsFromData(data);
    }
  } catch (err: any) {
    console.warn("Innertube Browse API note:", err?.message);
  }

  // Tier 2: YouTube Innertube Watch Next API (High reliability for playlists/mixes)
  if (videoItems.length === 0) {
    try {
      const res = await fetch('https://www.youtube.com/youtubei/v1/next?prettyPrint=false', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Origin': 'https://www.youtube.com'
        },
        body: JSON.stringify({
          context: {
            client: {
              clientName: 'WEB',
              clientVersion: '2.20240501.00.00',
              hl: 'ar',
              gl: 'US'
            }
          },
          playlistId: listId
        }),
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = await res.json();
        extractItemsFromData(data);
      }
    } catch (nextErr: any) {
      console.warn("Innertube Next API note:", nextErr?.message);
    }
  }

  // Tier 3: Direct YouTube Playlist HTML & ytInitialData Parser with cookies
  if (videoItems.length === 0) {
    try {
      const ytUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(listId)}&hl=ar`;
      const res = await fetch(ytUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
          'Cookie': 'SOCS=CAISNQgDEitib3FfaWRlbnRpdHlmcm9udGVuZHVpc2VydmVyXzIwMjQwNTAxLjA2X3AwGgJ1cyIAEhkAem0xMzFvODh1d2E4YWZoc3drMmVkN216; YSC=kQ1Z98wZ7tE; PREF=hl=ar&gl=US'
        },
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const html = await res.text();

        // Extract Playlist Title & Image
        const titleMatch = html.match(/<meta property="og:title" content="([^"]+)">/) ||
                           html.match(/<title>(.+?) - YouTube<\/title>/);
        if (titleMatch && titleMatch[1]) {
          playlistTitle = titleMatch[1].replace(/ - YouTube$/, '').trim();
        }

        const ogImg = html.match(/<meta property="og:image" content="([^"]+)">/);
        if (ogImg && ogImg[1]) {
          playlistThumbnail = ogImg[1];
        }

        // Find ytInitialData
        const jsonMatch = html.match(/var ytInitialData\s*=\s*({.+?});<\/script>/) ||
                          html.match(/window\["ytInitialData"\]\s*=\s*({.+?});<\/script>/) ||
                          html.match(/ytInitialData\s*=\s*({.+?});/);

        if (jsonMatch && jsonMatch[1]) {
          try {
            const ytData = JSON.parse(jsonMatch[1]);
            extractItemsFromData(ytData);
          } catch (parseErr) {
            console.warn("ytInitialData parse error:", parseErr);
          }
        }

        // Fallback regex matching videoIds if videoItems is still empty
        if (videoItems.length === 0) {
          const idRegex = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
          let m;
          while ((m = idRegex.exec(html)) !== null) {
            if (m[1] && !foundIds.has(m[1])) {
              foundIds.add(m[1]);
              videoItems.push({
                index: videoItems.length + 1,
                id: m[1],
                title: `فيديو رقم (${videoItems.length + 1})`,
                duration: 'HD',
                thumbnail: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg`,
                url: `https://www.youtube.com/watch?v=${m[1]}`,
                uploader: playlistAuthor
              });
              if (videoItems.length >= 100) break;
            }
          }
        }
      }
    } catch (err: any) {
      console.warn("Direct YouTube playlist scrape note:", err?.message);
    }
  }

  // Tier 4: yt-search library fallback (safely caught)
  if (videoItems.length === 0) {
    try {
      const yts = (await import('yt-search')).default;
      const r = await yts({ listId });
      if (r && Array.isArray(r.videos) && r.videos.length > 0) {
        playlistTitle = r.title || playlistTitle;
        playlistAuthor = r.author?.name || playlistAuthor;
        playlistThumbnail = r.thumbnail || r.videos[0]?.thumbnail || playlistThumbnail;
        r.videos.slice(0, 100).forEach((v: any, index: number) => {
          if (v && v.videoId && !foundIds.has(v.videoId)) {
            foundIds.add(v.videoId);
            videoItems.push({
              index: index + 1,
              id: v.videoId,
              title: v.title || `فيديو ${index + 1}`,
              duration: v.timestamp || 'HD',
              thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
              url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
              uploader: v.author?.name || playlistAuthor
            });
          }
        });
      }
    } catch (ytsErr: any) {
      console.warn("yt-search playlist fallback note:", ytsErr?.message);
    }
  }

  // Tier 5: Invidious API instances fallback
  if (videoItems.length === 0) {
    const invidiousInstances = [
      'https://inv.nadeko.net',
      'https://invidious.nerdvpn.de',
      'https://invidious.jing.rocks',
      'https://iv.datura.network'
    ];

    for (const inst of invidiousInstances) {
      try {
        const res = await fetch(`${inst}/api/v1/playlists/${encodeURIComponent(listId)}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          signal: AbortSignal.timeout(4000)
        });
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.videos) && data.videos.length > 0) {
            playlistTitle = data.title || playlistTitle;
            playlistAuthor = data.author || playlistAuthor;
            data.videos.slice(0, 100).forEach((v: any, idx: number) => {
              if (v.videoId && !foundIds.has(v.videoId)) {
                foundIds.add(v.videoId);
                videoItems.push({
                  index: idx + 1,
                  id: v.videoId,
                  title: v.title || `فيديو ${idx + 1}`,
                  duration: v.lengthSeconds ? `${Math.floor(v.lengthSeconds / 60)}:${('0' + (v.lengthSeconds % 60)).slice(-2)}` : 'HD',
                  thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
                  url: `https://www.youtube.com/watch?v=${v.videoId}`,
                  uploader: v.author || playlistAuthor
                });
              }
            });
            break;
          }
        }
      } catch (instErr) {
        // try next
      }
    }
  }

  if (videoItems.length === 0) {
    throw new Error("تعذر جلب قائمة التشغيل. تأكد من أن قائمة التشغيل عامة (Public) أو غير مدرجة (Unlisted) وليست خاصة.");
  }

  return {
    id: listId,
    title: playlistTitle,
    author: playlistAuthor,
    thumbnail: videoItems[0]?.thumbnail || playlistThumbnail,
    videoCount: videoItems.length,
    videos: videoItems
  };
}

export async function searchVideosCore(query: string) {
  if (!query) throw new Error("Query is required");

  const directId = extractVideoId(query);
  if (directId) {
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${directId}&format=json`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        return {
          results: [{
            id: directId,
            title: oembed.title || `فيديو يوتيوب (${directId})`,
            thumbnail: oembed.thumbnail_url || `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
            duration: 'HD',
            url: `https://www.youtube.com/watch?v=${directId}`,
            uploader: oembed.author_name || 'YouTube'
          }]
        };
      }
    } catch (e) {
      console.warn("Direct ID oembed search check error:", e);
    }
  }

  try {
    const yts = (await import('yt-search')).default;
    const r = await yts(query);
    
    const results = (r?.videos || []).slice(0, 15).map((v: any) => ({
      id: v.videoId,
      title: v.title,
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      duration: v.timestamp || 'HD',
      url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
      uploader: v.author?.name || 'YouTube'
    }));

    return { results };
  } catch (e: any) {
    console.error("Search failed, providing fallback:", e);
    return { results: [] };
  }
}

export async function getVideoDetailsCore(url: string) {
  if (!url) throw new Error("رابط الفيديو مطلوب");

  // Handle TikTok URLs
  if (isTikTokUrl(url)) {
    const cacheKey = `tt_${url.trim()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { source: 'tiktok', data: cached.data };
    }

    const ttData = await fetchTikTokMedia(url.trim());
    if (ttData && ttData.formats.length > 0) {
      cache.set(cacheKey, { data: ttData, timestamp: Date.now() });
      return { source: 'tiktok', data: ttData };
    } else {
      throw new Error("تعذر استخراج روابط تحميل فيديو تيك توك، تأكد من صحة الرابط.");
    }
  }

  // Handle Facebook URLs
  if (isFacebookUrl(url)) {
    const cacheKey = `fb_${url.trim()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { source: 'facebook', data: cached.data };
    }

    const fbData = await fetchFacebookMedia(url.trim());
    if (fbData && fbData.formats.length > 0) {
      cache.set(cacheKey, { data: fbData, timestamp: Date.now() });
      return { source: 'facebook', data: fbData };
    } else {
      throw new Error("تعذر استخراج روابط تحميل فيديو فيسبوك، تأكد من أن الفيديو عام (Public).");
    }
  }

  // Handle Instagram URLs
  if (isInstagramUrl(url)) {
    const cacheKey = `ig_${url.trim()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { source: 'instagram', data: cached.data };
    }

    const igData = await fetchInstagramMedia(url.trim());
    if (igData && igData.formats.length > 0) {
      cache.set(cacheKey, { data: igData, timestamp: Date.now() });
      return { source: 'instagram', data: igData };
    } else {
      throw new Error("تعذر استخراج روابط تحميل إنستغرام، تأكد من أن الحساب أو الريلز عام (Public).");
    }
  }

  // Handle Twitter / X URLs
  if (isTwitterUrl(url)) {
    const cacheKey = `tw_${url.trim()}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { source: 'twitter', data: cached.data };
    }

    const twData = await fetchTwitterMedia(url.trim());
    if (twData && twData.formats.length > 0) {
      cache.set(cacheKey, { data: twData, timestamp: Date.now() });
      return { source: 'twitter', data: twData };
    } else {
      throw new Error("تعذر استخراج روابط فيديو منصة X (تويتر)، تأكد من أن التغريدة تحتوي على فيديو.");
    }
  }

  // Handle YouTube Playlist URLs
  if (isPlaylistUrl(url)) {
    const playlistData = await fetchPlaylistCore(url);
    return { source: 'playlist', data: playlistData };
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("رابط يوتيوب، تيك توك، فيسبوك، إنستغرام أو X غير صالح");
  }

  const cached = cache.get(videoId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { source: 'yts', data: cached.data };
  }

  let title = `فيديو يوتيوب (${videoId})`;
  let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  let duration = 'HD';

  // Step A: YouTube Official oEmbed API
  try {
    const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      if (oembed.title) title = oembed.title;
      if (oembed.thumbnail_url) thumbnail = oembed.thumbnail_url;
    }
  } catch (oembedErr) {
    console.warn("oEmbed fetch note:", oembedErr);
  }

  // Step B: yt-search
  try {
    const yts = (await import('yt-search')).default;
    const v = await yts({ videoId });
    if (v) {
      if (v.title && title.includes(videoId)) title = v.title;
      if (v.thumbnail) thumbnail = v.thumbnail;
      if (v.timestamp) duration = v.timestamp;
    }
  } catch (ytsErr: any) {
    console.warn("yt-search video detail note:", ytsErr.message);
  }

  const formats = [
    { quality: 'صوت MP3 عالي الجودة', format: 'mp3', hasAudio: true, hasVideo: false, loaderFormat: 'mp3' },
    { quality: 'صوت M4A أصلي', format: 'm4a', hasAudio: true, hasVideo: false, loaderFormat: 'm4a' },
    { quality: 'فيديو 360p (توفير البيانات)', format: 'mp4', hasAudio: true, hasVideo: true, loaderFormat: '360' },
    { quality: 'فيديو 480p SD', format: 'mp4', hasAudio: true, hasVideo: true, loaderFormat: '480' },
    { quality: 'فيديو 720p HD', format: 'mp4', hasAudio: true, hasVideo: true, loaderFormat: '720' },
    { quality: 'فيديو 1080p Full HD', format: 'mp4', hasAudio: true, hasVideo: true, loaderFormat: '1080' },
  ];

  const formattedData = {
    id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title,
    thumbnail,
    duration,
    formats
  };

  cache.set(videoId, { data: formattedData, timestamp: Date.now() });
  return { source: 'yts', data: formattedData };
}

async function safeFetchJson(url: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: any; rawText: string }> {
  try {
    const res = await fetch(url, options);
    const rawText = await res.text();
    if (!rawText || rawText.trim().startsWith('<') || rawText.trim().startsWith('<!DOCTYPE')) {
      return { ok: false, status: res.status, data: null, rawText };
    }
    try {
      const data = JSON.parse(rawText);
      return { ok: res.ok, status: res.status, data, rawText };
    } catch {
      return { ok: false, status: res.status, data: null, rawText };
    }
  } catch (err: any) {
    return { ok: false, status: 0, data: null, rawText: err.message || '' };
  }
}

export async function initiateDownloadCore(url: string, format: string = 'mp3', title?: string, extraParams?: Record<string, string>) {
  if (!url) throw new Error("رابط الفيديو مطلوب");

  // Direct media URLs (TikTok / Facebook / Instagram / Twitter CDN)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
      let proxyUrl = `/api/proxy-download?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title || 'media')}&format=${encodeURIComponent(format)}`;
      if (extraParams && Object.keys(extraParams).length > 0) {
        proxyUrl += `&${new URLSearchParams(extraParams).toString()}`;
      }
      return {
        success: true,
        ready: true,
        download_url: proxyUrl,
        direct_cdn_url: url,
        direct_url: url
      };
    }
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    throw new Error("رابط يوتيوب غير صالح");
  }

  const cleanYoutubeUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const cleanTitle = title || `YouTube_${videoId}`;

  let directProxyUrl = `/api/proxy-download?url=${encodeURIComponent(cleanYoutubeUrl)}&format=${encodeURIComponent(format)}&title=${encodeURIComponent(cleanTitle)}`;
  if (extraParams && Object.keys(extraParams).length > 0) {
    directProxyUrl += `&${new URLSearchParams(extraParams).toString()}`;
  }

  // Resolve and cache authentic stream to guarantee zero HTML error downloads
  try {
    const { resolveYoutubeStreamUrl } = await import("./youtubeProxy.js");
    const resolved = await resolveYoutubeStreamUrl(videoId, format, cleanTitle);
    const proxyWithStream = `${directProxyUrl}&stream_url=${encodeURIComponent(resolved.url)}`;
    return {
      success: true,
      ready: true,
      download_url: proxyWithStream,
      direct_cdn_url: resolved.url,
      direct_url: proxyWithStream,
      videoId,
      format,
      title: cleanTitle
    };
  } catch (err: any) {
    throw new Error(err?.message || "تعذر استخراج تدفق الفيديو بالجودة المطلوبة. يرجى تجربة خيار جودة آخر (مثل MP3 أو 360p).");
  }
}

export async function fetchProgressCore(progressUrl: string, videoId?: string, format?: string, title?: string) {
  if (!progressUrl) return { success: 1, ready: true, progress: 1000, text: 'Ready' };

  try {
    const { queryConversionProgress } = await import("./youtubeProxy.js");
    const q = await queryConversionProgress(progressUrl, videoId, format);

    if (q.ready && q.downloadUrl) {
      const cleanYoutubeUrl = `https://www.youtube.com/watch?v=${videoId || 'media'}`;
      const cleanTitle = title || `YouTube_${videoId || 'media'}`;
      const proxyDownloadUrl = `/api/proxy-download?url=${encodeURIComponent(cleanYoutubeUrl)}&stream_url=${encodeURIComponent(q.downloadUrl)}&format=${encodeURIComponent(format || 'mp3')}&title=${encodeURIComponent(cleanTitle)}`;

      return {
        success: 1,
        ready: true,
        progress: 1000,
        text: 'Finished',
        download_url: proxyDownloadUrl,
        direct_cdn_url: q.downloadUrl
      };
    }

    if (q.error) {
      return {
        success: 0,
        ready: false,
        error: q.error
      };
    }

    return {
      success: 1,
      ready: false,
      progress: q.progress || 50,
      text: q.text || 'جاري معالجة الفيديو...'
    };
  } catch (err: any) {
    return {
      success: 0,
      ready: false,
      error: err.message || "تعذر متابعة حالة التحويل"
    };
  }
}

