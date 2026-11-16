"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTwitterUrl = exports.isInstagramUrl = exports.isFacebookUrl = exports.isTikTokUrl = void 0;
exports.ytExtractVideoId = ytExtractVideoId;
exports.fetchTikTokMedia = fetchTikTokMedia;
exports.fetchFacebookMedia = fetchFacebookMedia;
exports.fetchInstagramMedia = fetchInstagramMedia;
exports.fetchTwitterMedia = fetchTwitterMedia;
exports.getUnifiedVideoDetails = getUnifiedVideoDetails;
const youtubeDirect_1 = require("./youtubeDirect");
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
function ytExtractVideoId(input) {
    if (!input)
        return null;
    const clean = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean))
        return clean;
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/);
    if (match && match[1])
        return match[1];
    return null;
}
const isTikTokUrl = (u) => /tiktok\.com|douyin\.com|vm\.tiktok\.com|vt\.tiktok\.com/i.test(u);
exports.isTikTokUrl = isTikTokUrl;
const isFacebookUrl = (u) => /facebook\.com|fb\.watch|fb\.com/i.test(u);
exports.isFacebookUrl = isFacebookUrl;
const isInstagramUrl = (u) => /instagram\.com|instagr\.am/i.test(u);
exports.isInstagramUrl = isInstagramUrl;
const isTwitterUrl = (u) => /twitter\.com|x\.com|t\.co/i.test(u);
exports.isTwitterUrl = isTwitterUrl;
const FB_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
async function resolveFacebookUrl(input) {
    const u = (input || "").trim();
    const numeric = u.match(/(?:reel|videos|watch)\/(\d{6,})/i) || u.match(/[?&]v=(\d{6,})/i);
    if (numeric && numeric[1]) {
        return `https://www.facebook.com/watch/?v=${numeric[1]}`;
    }
    const needsExpanding = /facebook\.com\/share\/|fb\.watch/i.test(u);
    if (needsExpanding) {
        try {
            const res = await fetch(u, {
                method: "GET",
                redirect: "follow",
                headers: { "User-Agent": FB_UA, Accept: "text/html" },
                signal: AbortSignal.timeout(12000)
            });
            const finalUrl = res.url || "";
            const fid = finalUrl.match(/(?:reel|videos|watch)\/(\d{6,})/i) ||
                finalUrl.match(/[?&]v=(\d{6,})/i) ||
                finalUrl.match(/\/(\d{10,})(?:[/?&]|$)/);
            if (fid && fid[1]) {
                return `https://www.facebook.com/watch/?v=${fid[1]}`;
            }
            if (finalUrl && /facebook\.com/i.test(finalUrl))
                return finalUrl;
        }
        catch (e) {
            console.warn("FB shortlink expand note:", e?.message);
        }
    }
    return u;
}
async function fetchTikTokMedia(url) {
    let title = 'فيديو تيك توك بدون علامة مائية';
    let thumbnail = 'https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=600&auto=format&fit=crop&q=80';
    let duration = 'HD';
    let musicInfo = null;
    const formats = [];
    const parseTikwm = (data) => {
        if (!data)
            return;
        if (data.title)
            title = data.title;
        if (data.cover)
            thumbnail = data.cover;
        if (data.duration)
            duration = `${data.duration} ثانية`;
        if (data.author?.nickname)
            musicInfo = musicInfo || {};
        const audioUrl = data.music || data.music_info?.play;
        if (audioUrl) {
            musicInfo = {
                title: data.music_info?.title || 'صوت تيك توك الأصلي',
                author: data.music_info?.author || data.author?.nickname || 'TikTok',
                playUrl: audioUrl,
                cover: data.music_info?.cover || thumbnail,
                duration: data.music_info?.duration || data.duration
            };
            formats.push({ quality: 'فويس / صوت التيك توك الأصلي MP3', format: 'mp3', hasAudio: true, hasVideo: false, url: audioUrl, directUrl: audioUrl });
            formats.push({ quality: 'فويس التيك توك M4A / AAC نقية', format: 'm4a', hasAudio: true, hasVideo: false, url: audioUrl, directUrl: audioUrl });
        }
        if (data.hdplay)
            formats.push({ quality: 'فيديو HD عالي الجودة (بدون علامة مائية)', format: 'mp4', hasAudio: true, hasVideo: true, url: data.hdplay, directUrl: data.hdplay });
        if (data.play)
            formats.push({ quality: 'فيديو MP4 سريع (بدون علامة مائية)', format: 'mp4', hasAudio: true, hasVideo: true, url: data.play, directUrl: data.play });
        if (data.wmplay)
            formats.push({ quality: 'فيديو MP4 (مع العلامة المائية)', format: 'mp4', hasAudio: true, hasVideo: true, url: data.wmplay, directUrl: data.wmplay });
    };
    // Tier 1: TikWM POST
    try {
        const res = await fetch('https://www.tikwm.com/api/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            body: new URLSearchParams({ url: url.trim(), hd: '1' }),
            signal: AbortSignal.timeout(12000)
        });
        const json = await res.json();
        if (json.code === 0 && json.data)
            parseTikwm(json.data);
    }
    catch (e) {
        console.warn('TikWM POST note:', e?.message);
    }
    // Tier 2: TikWM GET
    if (formats.length === 0) {
        try {
            const res = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url.trim())}&hd=1`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(12000)
            });
            const json = await res.json();
            if (json.code === 0 && json.data)
                parseTikwm(json.data);
        }
        catch (e) {
            console.warn('TikWM GET note:', e?.message);
        }
    }
    return { id: `tiktok_${Date.now()}`, url, title, thumbnail, duration, formats, platform: 'tiktok', musicInfo };
}
async function fetchFacebookMedia(url) {
    let title = 'فيديو فيسبوك / ريلز';
    let thumbnail = 'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=600&auto=format&fit=crop&q=80';
    let duration = 'HD';
    const formats = [];
    // Normalize share codes / reels / short-links to a canonical watch URL first
    const canonical = await resolveFacebookUrl(url);
    if (canonical !== url)
        console.log(`FB canonical: ${url} -> ${canonical}`);
    // Engine 1: siputzx
    try {
        const res = await fetch(`https://api.siputzx.my.id/api/d/facebook?url=${encodeURIComponent(canonical)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(15000)
        });
        if (res.ok) {
            const json = await res.json();
            if (json.status && json.data) {
                if (json.data.title && json.data.title !== 'Facebook Video')
                    title = json.data.title;
                if (json.data.thumbnail)
                    thumbnail = json.data.thumbnail;
                if (json.data.duration)
                    duration = json.data.duration;
                if (Array.isArray(json.data.downloads)) {
                    for (const dl of json.data.downloads) {
                        if (dl.url) {
                            const isHd = (dl.quality || '').toLowerCase().includes('hd') || (dl.quality || '').includes('720');
                            formats.push({ quality: isHd ? 'فيديو 720p HD عالي الجودة' : 'فيديو 360p SD (توفير البيانات)', format: 'mp4', hasAudio: true, hasVideo: true, url: dl.url, directUrl: dl.url });
                        }
                    }
                }
            }
        }
    }
    catch (e) {
        console.warn('Siputzx FB note:', e?.message);
    }
    // Engine 2: tioo fallback
    if (formats.length === 0) {
        try {
            const res = await fetch(`https://backend1.tioo.eu.org/api/downloader/fbdown?url=${encodeURIComponent(canonical)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(15000)
            });
            if (res.ok) {
                const json = await res.json();
                if (json.status) {
                    if (json.HD)
                        formats.push({ quality: 'فيديو 720p HD عالي الجودة', format: 'mp4', hasAudio: true, hasVideo: true, url: json.HD, directUrl: json.HD });
                    if (json.Normal_video)
                        formats.push({ quality: 'فيديو 360p SD عادي', format: 'mp4', hasAudio: true, hasVideo: true, url: json.Normal_video, directUrl: json.Normal_video });
                }
            }
        }
        catch (e) {
            console.warn('Tioo FB note:', e?.message);
        }
    }
    // Engine 3: scrape the canonical watch/reel page directly for browser-playable sources
    if (formats.length === 0) {
        try {
            const res = await fetch(canonical, {
                headers: {
                    'User-Agent': FB_UA,
                    Accept: 'text/html,application/xhtml+xml',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                redirect: 'follow',
                signal: AbortSignal.timeout(15000)
            });
            const html = await res.text();
            const pageTitle = html.match(/<title[^>]*>([^<]{3,150})<\/title>/i)?.[1] ||
                html.match(/"og:title" content="([^"]{3,150})"/i)?.[1];
            if (pageTitle)
                title = pageTitle.replace(/\s*[\u2013\u2014|-]\s*Facebook.*$/i, '').trim();
            const ogImg = html.match(/"og:image" content="(https:[^"]+)"/i)?.[1];
            if (ogImg)
                thumbnail = ogImg;
            const seen = new Set();
            const srcMatches = html.matchAll(/"browser_video_source":\s*"(https:[^"]+)"|"playable\-quality\-url":\s*"(https:[^"]+)"/g);
            for (const m of srcMatches) {
                const raw = (m[1] || m[2] || '').replace(/\\u0026/g, '&').replace(/\\\//g, '/');
                if (!raw.startsWith('https') || seen.has(raw))
                    continue;
                seen.add(raw);
                const isHd = /quality=HD|_hd\.|1080|720/.test(raw);
                formats.push({
                    quality: isHd ? 'فيديو 720p HD عالي الجودة' : 'فيديو 360p SD (توفير البيانات)',
                    format: 'mp4', hasAudio: true, hasVideo: true, url: raw, directUrl: raw
                });
            }
        }
        catch (e) {
            console.warn('FB page scrape note:', e?.message);
        }
    }
    if (formats.length > 0) {
        formats.push({ quality: 'صوت الفيديو M4A', format: 'm4a', hasAudio: true, hasVideo: false, url: formats[0].directUrl, directUrl: formats[0].directUrl });
    }
    return { id: `fb_${Date.now()}`, url, title, thumbnail, duration, formats, platform: 'facebook' };
}
async function fetchInstagramMedia(url) {
    let title = 'فيديو / ريلز إنستغرام';
    let thumbnail = 'https://images.unsplash.com/photo-1611262588024-d12430b98920?w=600&auto=format&fit=crop&q=80';
    let duration = 'HD';
    const formats = [];
    // Engine 1: siputzx
    try {
        const res = await fetch(`https://api.siputzx.my.id/api/d/ig?url=${encodeURIComponent(url)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(15000)
        });
        if (res.ok) {
            const json = await res.json();
            if (json.status && json.data) {
                if (Array.isArray(json.data)) {
                    json.data.forEach((item, idx) => {
                        if (item.url) {
                            const isVideo = item.url.includes('.mp4') || !item.url.includes('.jpg');
                            formats.push({ quality: isVideo ? `فيديو ريلز HD (مقطع ${idx + 1})` : `صورة عالية الدقة (${idx + 1})`, format: isVideo ? 'mp4' : 'jpg', hasAudio: isVideo, hasVideo: isVideo, url: item.url, directUrl: item.url });
                            if (item.thumbnail)
                                thumbnail = item.thumbnail;
                        }
                    });
                }
                else if (json.data.url) {
                    formats.push({ quality: 'فيديو ريلز إنستغرام HD', format: 'mp4', hasAudio: true, hasVideo: true, url: json.data.url, directUrl: json.data.url });
                }
            }
        }
    }
    catch (e) {
        console.warn('Instagram siputzx note:', e?.message);
    }
    // Engine 2: tioo fallback
    if (formats.length === 0) {
        try {
            const res = await fetch(`https://backend1.tioo.eu.org/api/downloader/igdown?url=${encodeURIComponent(url)}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                signal: AbortSignal.timeout(15000)
            });
            if (res.ok) {
                const json = await res.json();
                if (json.status && json.data) {
                    const items = Array.isArray(json.data) ? json.data : [json.data];
                    items.forEach((item, idx) => {
                        const dlUrl = item.url || item.download_url || item;
                        if (typeof dlUrl === 'string' && dlUrl.startsWith('http')) {
                            const isMp4 = dlUrl.includes('.mp4') || dlUrl.includes('video');
                            formats.push({ quality: isMp4 ? `فيديو إنستغرام MP4 HD (${idx + 1})` : `صورة إنستغرام HD (${idx + 1})`, format: isMp4 ? 'mp4' : 'jpg', hasAudio: isMp4, hasVideo: isMp4, url: dlUrl, directUrl: dlUrl });
                        }
                    });
                }
            }
        }
        catch (e) {
            console.warn('Instagram tioo note:', e?.message);
        }
    }
    const videoFormat = formats.find((f) => f.hasVideo && f.directUrl);
    if (videoFormat) {
        formats.push({ quality: 'صوت وفويس الريلز M4A', format: 'm4a', hasAudio: true, hasVideo: false, url: videoFormat.directUrl, directUrl: videoFormat.directUrl });
    }
    return { id: `ig_${Date.now()}`, url, title, thumbnail, duration, formats, platform: 'instagram' };
}
async function fetchTwitterMedia(url) {
    let title = 'فيديو منصة X (تويتر)';
    let thumbnail = 'https://images.unsplash.com/photo-1611605698335-8b1569810432?w=600&auto=format&fit=crop&q=80';
    let duration = 'HD';
    const formats = [];
    try {
        const res = await fetch(`https://api.siputzx.my.id/api/d/twitter?url=${encodeURIComponent(url)}`, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(15000)
        });
        if (res.ok) {
            const json = await res.json();
            if (json.status && json.data) {
                if (json.data.title)
                    title = json.data.title;
                if (json.data.thumbnail)
                    thumbnail = json.data.thumbnail;
                if (Array.isArray(json.data.videos)) {
                    json.data.videos.forEach((v) => {
                        if (v.url)
                            formats.push({ quality: v.quality ? `فيديو X بجودة ${v.quality}` : 'فيديو MP4 عالي الدقة', format: 'mp4', hasAudio: true, hasVideo: true, url: v.url, directUrl: v.url });
                    });
                }
                else if (json.data.url) {
                    formats.push({ quality: 'فيديو X (تويتر) عالي الجودة HD', format: 'mp4', hasAudio: true, hasVideo: true, url: json.data.url, directUrl: json.data.url });
                }
            }
        }
    }
    catch (e) {
        console.warn('Twitter siputzx note:', e?.message);
    }
    if (formats.length > 0) {
        formats.push({ quality: 'صوت الفيديو M4A', format: 'm4a', hasAudio: true, hasVideo: false, url: formats[0].directUrl, directUrl: formats[0].directUrl });
    }
    return { id: `tw_${Date.now()}`, url, title, thumbnail, duration, formats, platform: 'twitter' };
}
function platformAuthor(platform, data) {
    if (platform === 'tiktok' && data.musicInfo?.author)
        return data.musicInfo.author;
    if (platform === 'tiktok')
        return 'TikTok';
    if (platform === 'facebook')
        return 'Facebook';
    if (platform === 'instagram')
        return 'Instagram';
    if (platform === 'twitter')
        return 'X (Twitter)';
    return 'JoeTube';
}
function toQualities(data) {
    return (data.formats || []).map((f) => ({
        quality: f.quality,
        format: f.format,
        formatCode: (f.directUrl ? f.format : f.loaderFormat) || f.format,
        hasAudio: !!f.hasAudio,
        hasVideo: !!f.hasVideo,
        directStreamAvailable: true,
        directUrl: f.directUrl || f.url || undefined
    }));
}
async function getUnifiedVideoDetails(rawUrl) {
    const url = (rawUrl || '').trim();
    if (!url)
        throw new Error('رابط الفيديو مطلوب');
    const platform = (0, exports.isTikTokUrl)(url)
        ? 'tiktok'
        : (0, exports.isFacebookUrl)(url)
            ? 'facebook'
            : (0, exports.isInstagramUrl)(url)
                ? 'instagram'
                : (0, exports.isTwitterUrl)(url)
                    ? 'twitter'
                    : ytExtractVideoId(url)
                        ? 'youtube'
                        : null;
    if (!platform) {
        throw new Error('رابط غير صالح. المدعوم: يوتيوب، تيك توك، فيسبوك، إنستغرام، X (تويتر).');
    }
    // YouTube: rich direct extraction (GoogleVideo CDN streaming, no directUrl needed)
    if (platform === 'youtube') {
        const info = await (0, youtubeDirect_1.getDirectVideoDetails)(url);
        return { ...info, platform: 'youtube' };
    }
    const cacheKey = `${platform}_${url}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    let data;
    if (platform === 'tiktok')
        data = await fetchTikTokMedia(url);
    else if (platform === 'facebook')
        data = await fetchFacebookMedia(url);
    else if (platform === 'instagram')
        data = await fetchInstagramMedia(url);
    else
        data = await fetchTwitterMedia(url);
    if (!data.formats || data.formats.length === 0) {
        throw new Error('تعذر استخراج روابط التحميل. تأكد من أن المحتوى عام (Public) وأن الرابط صحيح.');
    }
    const unified = {
        id: data.id,
        url: data.url,
        title: data.title,
        author: platformAuthor(platform, data),
        thumbnail: data.thumbnail,
        duration: data.duration,
        durationSeconds: 0,
        views: 0,
        platform,
        qualities: toQualities(data)
    };
    cache.set(cacheKey, { data: unified, timestamp: Date.now() });
    return unified;
}
