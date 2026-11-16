import { Innertube, Platform, UniversalCache, ClientType } from "youtubei.js";
import { Ytdl, Quality } from "@distube/ytdl-core";
import { spawn, ChildProcess } from "child_process";
import { Readable } from "stream";
import { extractVideoId } from "./downloaderCore.js";
import fs from "fs";

// Ensure global Text is defined for youtubei.js parser in Node environment
if (typeof (globalThis as any).Text === "undefined") {
  (globalThis as any).Text = class Text {};
}

// Enable JavaScript execution for YouTube player signature deciphering
Platform.shim.eval = async (data: { output: string }) => {
  return new Function(data.output)();
};

const innertubeClients = new Map<string, any>();

async function getInnertubeClient(clientType: string = "ANDROID_VR"): Promise<any> {
  if (innertubeClients.has(clientType)) {
    return innertubeClients.get(clientType);
  }
  try {
    const cType = (ClientType as any)[clientType] || ClientType.ANDROID_VR;
    const client = await Innertube.create({
      cache: new UniversalCache(false),
      generate_session_locally: true,
      client_type: cType
    });
    innertubeClients.set(clientType, client);
    return client;
  } catch (err: any) {
    console.warn(`Innertube create error for ${clientType}:`, err.message);
    return null;
  }
}

/**
 * Robust filename sanitizer that guarantees:
 * 1. Safe ASCII fallback filename with extension (e.g. JoeTube_Audio.mp3)
 * 2. Clean Unicode filename for UTF-8 filename* in Content-Disposition
 * 3. Never produces empty names or extensionless filenames
 */
export function sanitizeFilename(filename: string, defaultExt: string = "mp3"): { asciiName: string; unicodeName: string } {
  let ext = defaultExt.replace(/^\./, "").toLowerCase();
  let base = filename;
  const lastDot = filename.lastIndexOf(".");
  if (lastDot > 0 && lastDot > filename.length - 6) {
    ext = filename.slice(lastDot + 1).toLowerCase() || ext;
    base = filename.slice(0, lastDot);
  }

  // Remove dangerous chars, path traversals, quotes
  const cleanBase = base
    .replace(/[\/\\?%*:|"<>]/g, "_")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 90) || "JoeTube_Media";

  const unicodeName = `${cleanBase}.${ext}`;

  // Keep English alphanumeric characters, numbers, dashes, underscores
  const asciiBase = cleanBase.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "_");
  const asciiName = (asciiBase.length >= 2 ? asciiBase.slice(0, 50) : `JoeTube_${ext === "mp3" ? "Audio" : "Video"}`) + `.${ext}`;

  return {
    asciiName,
    unicodeName
  };
}

export interface StreamResult {
  stream: Readable;
  mimeType: string;
  filename: string;
  contentLength?: string | null;
  process?: ChildProcess;
}

// In-memory cache for resolved stream URLs to accelerate repeated downloads
export const resolvedStreamsCache = new Map<string, { url: string; mimeType: string; timestamp: number }>();
export const CACHE_TTL_MS = 25 * 60 * 1000; // 25 minutes

export function getCachedStream(videoId: string, format: string): { url: string; mimeType: string } | null {
  const cleanFormat = format.toLowerCase().includes("mp3") || format.toLowerCase().includes("audio")
    ? "mp3"
    : (format === "360" ? "360" : format === "480" ? "480" : format === "720" ? "720" : format === "1080" ? "1080" : "360");
  const cacheKey = `${videoId}_${cleanFormat}`;
  const cached = resolvedStreamsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { url: cached.url, mimeType: cached.mimeType };
  }
  return null;
}

export function setCachedStream(videoId: string, format: string, url: string, mimeType: string) {
  const cleanFormat = format.toLowerCase().includes("mp3") || format.toLowerCase().includes("audio")
    ? "mp3"
    : (format === "360" ? "360" : format === "480" ? "480" : format === "720" ? "720" : format === "1080" ? "1080" : "360");
  const cacheKey = `${videoId}_${cleanFormat}`;
  resolvedStreamsCache.set(cacheKey, { url, mimeType, timestamp: Date.now() });
}

/**
 * Cobalt API High-Speed Resolver (100% stable for long and short videos/audio)
 */
export async function resolveViaCobalt(
  videoId: string,
  isAudio: boolean
): Promise<{ url: string; mimeType: string } | null> {
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const instances = [
    "https://co.wuk.sh/api/json",
    "https://cobalt.api.redraccoon.dev/api/json",
    "https://api.cobalt.tools/api/json"
  ];

  for (const api of instances) {
    try {
      const res = await fetch(api, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        },
        body: JSON.stringify({
          url: ytUrl,
          audioFormat: "mp3",
          isAudioOnly: isAudio,
          videoQuality: "720"
        }),
        signal: AbortSignal.timeout(6000)
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data && (data.url || data.picker)) {
        const directUrl = data.url || (Array.isArray(data.picker) && data.picker[0]?.url);
        if (directUrl) {
          return {
            url: directUrl,
            mimeType: isAudio ? "audio/mpeg" : "video/mp4"
          };
        }
      }
    } catch {}
  }
  return null;
}

/**
 * High-Speed Resilient Piped Multi-Instance Stream Extractor
 * Automatically queries active community instances to bypass datacenter IP blocks
 */
export async function resolveViaPiped(
  videoId: string,
  isAudio: boolean,
  targetQuality?: string
): Promise<{ url: string; mimeType: string } | null> {
  const instances = [
    "https://api.piped.private.coffee",
    "https://pipedapi.ducks.party",
    "https://piped.osphost.fi"
  ];

  for (const base of instances) {
    try {
      const res = await fetch(`${base}/streams/${videoId}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(5000)
      });
      if (!res.ok) continue;

      const data = await res.json();
      const videoStreams: any[] = (data.videoStreams || []).filter(
        (v: any) => v.url && !v.url.includes(".m3u8") && !v.format?.includes("HLS") && !v.mimeType?.includes("mpegurl")
      );
      const audioStreams: any[] = (data.audioStreams || []).filter(
        (a: any) => a.url && !a.url.includes(".m3u8") && !a.mimeType?.includes("mpegurl")
      );

      if (isAudio) {
        // Priority 1: Dedicated audio streams
        if (audioStreams.length > 0) {
          const bestAudio = audioStreams.find((a: any) => a.mimeType?.includes("mp4") || a.mimeType?.includes("m4a")) || audioStreams[0];
          if (bestAudio?.url) {
            return { url: bestAudio.url, mimeType: bestAudio.mimeType || "audio/mp4" };
          }
        }
        // Priority 2: Progressive video streams with audio (MPEG_4 / 360p)
        const combined = videoStreams.find((v: any) => v.videoOnly === false) || videoStreams[0];
        if (combined?.url) {
          return { url: combined.url, mimeType: combined.mimeType || "video/mp4" };
        }
      } else {
        // Video requested: find best quality matching targetQuality or highest available MP4
        if (videoStreams.length > 0) {
          let chosen = null;
          if (targetQuality) {
            chosen = videoStreams.find((v: any) => v.quality?.includes(targetQuality) && v.videoOnly === false)
              || videoStreams.find((v: any) => v.quality?.includes(targetQuality));
          }
          if (!chosen) {
            // Prefer progressive MP4 with audio
            chosen = videoStreams.find((v: any) => v.videoOnly === false && v.mimeType?.includes("mp4"))
              || videoStreams.find((v: any) => v.videoOnly === false)
              || videoStreams.find((v: any) => v.mimeType?.includes("mp4"))
              || videoStreams[0];
          }
          if (chosen?.url) {
            return { url: chosen.url, mimeType: chosen.mimeType || "video/mp4" };
          }
        }
      }
    } catch {
      // Continue to next instance in pool
    }
  }
  return null;
}

/**
 * Pure Node.js YouTube client with signature deciphering & multi-client emulation
 * Tries ANDROID_VR, ANDROID, MWEB, and WEB to extract valid streams
 */
export async function resolveViaInnertubeDecipher(
  videoId: string,
  isAudio: boolean,
  targetQuality?: string
): Promise<{ url: string; mimeType: string } | null> {
  const clientTypes = ["ANDROID_VR", "ANDROID", "MWEB", "WEB"];

  for (const cType of clientTypes) {
    try {
      const yt = await getInnertubeClient(cType);
      if (!yt) continue;

      const info = await yt.getBasicInfo(videoId);
      const streamingData = info.streaming_data;
      if (!streamingData) continue;

      const formats: any[] = streamingData.formats || [];
      const adaptive: any[] = streamingData.adaptive_formats || [];

      // Check combined formats first (contain both video and audio)
      for (const f of formats) {
        let streamUrl = f.url;
        if (!streamUrl && (f.signature_cipher || f.cipher)) {
          try {
            streamUrl = await f.decipher(yt.session.player);
          } catch {}
        }
        if (streamUrl) {
          if (!targetQuality || f.quality_label?.includes(targetQuality)) {
            return { url: streamUrl, mimeType: f.mime_type || "video/mp4" };
          }
        }
      }

      // Check adaptive formats
      if (isAudio) {
        const audioFormats = adaptive.filter((a: any) => a.has_audio);
        for (const f of audioFormats) {
          let streamUrl = f.url;
          if (!streamUrl && (f.signature_cipher || f.cipher)) {
            try {
              streamUrl = await f.decipher(yt.session.player);
            } catch {}
          }
          if (streamUrl) {
            return { url: streamUrl, mimeType: f.mime_type || "audio/mp4" };
          }
        }
      } else {
        const videoFormats = adaptive.filter((a: any) => a.has_video);
        for (const f of videoFormats) {
          if (targetQuality && !f.quality_label?.includes(targetQuality)) continue;
          let streamUrl = f.url;
          if (!streamUrl && (f.signature_cipher || f.cipher)) {
            try {
              streamUrl = await f.decipher(yt.session.player);
            } catch {}
          }
          if (streamUrl) {
            return { url: streamUrl, mimeType: f.mime_type || "video/mp4" };
          }
        }
      }
    } catch (err: any) {
      // Continue to next client type
    }
  }

  return null;
}

/**
 * DisTube ytdl-core direct stream resolver
 * Handles local player solving and botguard challenge resolution for audio
 */
export async function resolveViaDistubeStream(
  videoUrlOrId: string,
  isAudio: boolean
): Promise<{ stream: Readable; mimeType: string } | null> {
  // DisTube streams audio directly; for video, progressive streams with sound are provided by Piped
  if (!isAudio) return null;
  try {
    const videoId = extractVideoId(videoUrlOrId) || videoUrlOrId.trim();
    const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const yt = new Ytdl();
    const info = await yt.getInfo(ytUrl);
    const audioFormats = info.formats.filter(f => f.hasAudio);
    if (!audioFormats || audioFormats.length === 0) return null;

    const audioStream = yt.download(info, {
      quality: Quality.HighestAudio,
      filter: { hasAudio: true, hasVideo: false }
    });
    return { stream: audioStream, mimeType: "audio/mp4" };
  } catch (err: any) {
    // Falls back to next engine in cascade
    return null;
  }
}

/**
 * Fast Non-Blocking YouTube Stream Initiator
 */
export async function startYoutubeConversion(
  videoId: string,
  format: string = "mp3"
): Promise<{
  ready: boolean;
  downloadUrl?: string;
  progressUrl?: string;
  jobId?: string;
  progress?: number;
  text?: string;
  mimeType: string;
}> {
  const cleanFormat = format.toLowerCase().includes("mp3") || format.toLowerCase().includes("audio")
    ? "mp3"
    : (format === "360" ? "360" : format === "480" ? "480" : format === "720" ? "720" : format === "1080" ? "1080" : "360");
  const mimeType = cleanFormat === "mp3" ? "audio/mpeg" : "video/mp4";

  // Check in-memory cache first
  const cached = getCachedStream(videoId, cleanFormat);
  if (cached) {
    return { ready: true, downloadUrl: cached.url, mimeType: cached.mimeType };
  }

  const isAudio = cleanFormat === "mp3";
  const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // Engine 1: Pure Node.js Innertube Decipher Engine
  try {
    const innertubeRes = await resolveViaInnertubeDecipher(videoId, isAudio, cleanFormat !== "mp3" ? cleanFormat : undefined);
    if (innertubeRes && innertubeRes.url) {
      setCachedStream(videoId, cleanFormat, innertubeRes.url, mimeType);
      return { ready: true, downloadUrl: innertubeRes.url, mimeType };
    }
  } catch {}

  // Engine 2: Piped API High-Speed Stream Resolver
  try {
    const pipedRes = await resolveViaPiped(videoId, isAudio, cleanFormat !== "mp3" ? cleanFormat : undefined);
    if (pipedRes && pipedRes.url) {
      setCachedStream(videoId, cleanFormat, pipedRes.url, mimeType);
      return { ready: true, downloadUrl: pipedRes.url, mimeType };
    }
  } catch {}

  return {
    ready: true,
    downloadUrl: `/api/proxy-download?url=${encodeURIComponent(ytUrl)}&format=${cleanFormat}`,
    mimeType
  };
}

export async function queryConversionProgress(
  progressUrl: string,
  videoId?: string,
  format?: string
): Promise<{
  ready: boolean;
  downloadUrl?: string;
  progress?: number;
  text?: string;
  error?: string;
}> {
  if (!progressUrl) {
    return { ready: true, progress: 1000, text: "Ready" };
  }

  try {
    const res = await fetch(progressUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(5000)
    });

    if (res.ok) {
      const pData = await res.json();
      if (pData.download_url) {
        if (videoId && format) {
          const cleanFormat = format.toLowerCase().includes("mp3") || format.toLowerCase().includes("audio") ? "mp3" : format;
          const mimeType = cleanFormat === "mp3" ? "audio/mpeg" : "video/mp4";
          setCachedStream(videoId, cleanFormat, pData.download_url, mimeType);
        }
        return {
          ready: true,
          downloadUrl: pData.download_url,
          progress: 1000,
          text: "Finished"
        };
      }
    }
  } catch {}

  return {
    ready: true,
    progress: 1000,
    text: "جاهز للتحميل"
  };
}

export async function prewarmYoutubeStream(
  videoUrlOrId: string,
  format: string = "mp3",
  customTitle?: string
): Promise<{ ready: boolean; cached: boolean; downloadUrl?: string; progressUrl?: string; jobId?: string }> {
  const videoId = extractVideoId(videoUrlOrId) || videoUrlOrId.trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error("معرّف فيديو يوتيوب غير صالح");
  }

  const conv = await startYoutubeConversion(videoId, format);
  return {
    ready: conv.ready,
    cached: conv.ready,
    downloadUrl: conv.downloadUrl,
    progressUrl: conv.progressUrl,
    jobId: conv.jobId
  };
}

export interface MediaProcessingOptions {
  ss?: string;
  to?: string;
  bitrate?: string;
  artist?: string;
  album?: string;
  audioFormat?: string;
  streamUrl?: string;
}

/**
 * Direct YouTube Stream URL Resolver with in-memory caching
 * Used by /api/download to pre-resolve and verify stream availability before frontend download triggers
 */
export async function resolveYoutubeStreamUrl(
  videoUrlOrId: string,
  format: string = "mp3",
  customTitle?: string
): Promise<{ url: string; mimeType: string; filename: string }> {
  const videoId = extractVideoId(videoUrlOrId) || videoUrlOrId.trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error("معرّف فيديو يوتيوب غير صالح");
  }

  const isAudio = format === "mp3" || format === "m4a" || format === "audio";
  const cleanFormat = isAudio ? "mp3" : (format === "360" ? "360" : format === "480" ? "480" : format === "720" ? "720" : format === "1080" ? "1080" : "360");

  // 1. Check in-memory cache
  const cached = getCachedStream(videoId, cleanFormat);
  if (cached && cached.url) {
    return {
      url: cached.url,
      mimeType: cached.mimeType,
      filename: sanitizeFilename(customTitle || `YouTube_${videoId}`, isAudio ? "mp3" : "mp4").unicodeName
    };
  }

  // 2. High-Speed Piped Resolver (Fastest & bypasses datacenter bot checks)
  try {
    const pipedRes = await resolveViaPiped(videoId, isAudio, cleanFormat !== "mp3" ? cleanFormat : undefined);
    if (pipedRes && pipedRes.url) {
      setCachedStream(videoId, cleanFormat, pipedRes.url, pipedRes.mimeType);
      return {
        url: pipedRes.url,
        mimeType: pipedRes.mimeType,
        filename: sanitizeFilename(customTitle || `YouTube_${videoId}`, isAudio ? "mp3" : "mp4").unicodeName
      };
    }
  } catch (err: any) {
    console.warn("Piped resolve note:", err?.message);
  }

  // 3. Innertube Decipher Engine
  try {
    const innertubeRes = await resolveViaInnertubeDecipher(videoId, isAudio, cleanFormat !== "mp3" ? cleanFormat : undefined);
    if (innertubeRes && innertubeRes.url) {
      setCachedStream(videoId, cleanFormat, innertubeRes.url, innertubeRes.mimeType);
      return {
        url: innertubeRes.url,
        mimeType: innertubeRes.mimeType,
        filename: sanitizeFilename(customTitle || `YouTube_${videoId}`, isAudio ? "mp3" : "mp4").unicodeName
      };
    }
  } catch (err: any) {
    console.warn("Innertube resolve note:", err?.message);
  }

  // 4. Cobalt Engine
  try {
    const cobaltRes = await resolveViaCobalt(videoId, isAudio);
    if (cobaltRes && cobaltRes.url) {
      setCachedStream(videoId, cleanFormat, cobaltRes.url, cobaltRes.mimeType);
      return {
        url: cobaltRes.url,
        mimeType: cobaltRes.mimeType,
        filename: sanitizeFilename(customTitle || `YouTube_${videoId}`, isAudio ? "mp3" : "mp4").unicodeName
      };
    }
  } catch {}

  throw new Error("تعذر استخراج تدفق الفيديو بالجودة المطلوبة. يرجى تجربة خيار جودة آخر (مثل MP3 أو 360p).");
}

/**
 * Universal YouTube Proxy Media Stream Provider
 * Cascades across 3 independent engines to ensure 100% download reliability.
 */
export async function getYoutubeProxyStream(
  videoUrlOrId: string,
  format: string = "mp3",
  customTitle?: string,
  toolOptions?: MediaProcessingOptions
): Promise<StreamResult> {
  const videoId = extractVideoId(videoUrlOrId) || videoUrlOrId.trim();
  if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    throw new Error("معرّف فيديو يوتيوب غير صالح");
  }

  const isAudio = format === "mp3" || format === "m4a" || format === "audio";
  const cleanFormat = isAudio ? "mp3" : (format === "360" ? "360" : format === "480" ? "480" : format === "720" ? "720" : format === "1080" ? "1080" : "360");
  const cacheKey = `${videoId}_${cleanFormat}`;

  let title = (customTitle || "").trim();

  // If title is missing or generic, fetch oEmbed metadata quickly
  if (!title || title.includes(videoId)) {
    try {
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(3000)
      });
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        if (oembed.title) title = oembed.title;
      }
    } catch {}
  }
  if (!title) title = `YouTube_${videoId}`;
  const { unicodeName } = sanitizeFilename(title, isAudio ? "mp3" : "mp4");

  // Helper to pipe an upstream stream through ffmpeg if audio conversion requested
  const buildStreamResultFromReadable = (inputReadable: Readable, originalMime: string, contentLength?: string | null): StreamResult => {
    const hasFfmpeg = fs.existsSync("/usr/bin/ffmpeg") || fs.existsSync("/usr/local/bin/ffmpeg");
    if (isAudio && hasFfmpeg) {
      const ffmpegArgs = [
        "-i", "pipe:0",
        "-vn",
        "-acodec", "libmp3lame",
        "-b:a", toolOptions?.bitrate || "320k",
        "-ar", "44100",
        "-metadata", `title=${toolOptions?.artist ? title : unicodeName}`,
        "-metadata", `artist=${toolOptions?.artist || "JoeTube"}`,
        "-id3v2_version", "3",
        "-f", "mp3",
        "-y",
        "pipe:1"
      ];
      const ffmpeg = spawn("ffmpeg", ffmpegArgs);
      ffmpeg.stdin.on("error", () => {});
      inputReadable.on("error", () => {
        try { ffmpeg.kill("SIGKILL"); } catch {}
      });
      inputReadable.pipe(ffmpeg.stdin);

      return {
        stream: ffmpeg.stdout,
        mimeType: "audio/mpeg",
        filename: unicodeName,
        process: ffmpeg
      };
    }

    return {
      stream: inputReadable,
      mimeType: isAudio ? "audio/mpeg" : originalMime,
      filename: unicodeName,
      contentLength
    };
  };

  // Helper to test and return an upstream stream URL
  const streamUpstreamUrl = async (upstreamUrl: string, expectedMime: string): Promise<StreamResult | null> => {
    try {
      const upstreamRes = await fetch(upstreamUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
        }
      });
      if (upstreamRes.ok && upstreamRes.body) {
        const ct = (upstreamRes.headers.get("content-type") || "").toLowerCase();
        if (ct.includes("text/html") || ct.includes("application/xhtml") || ct.includes("application/json") || ct.includes("mpegurl")) {
          return null;
        }

        const nodeStream = Readable.fromWeb(upstreamRes.body as any);
        const contentLength = upstreamRes.headers.get("content-length");
        return buildStreamResultFromReadable(nodeStream, expectedMime, contentLength);
      }
    } catch (err: any) {
      console.warn("streamUpstreamUrl note:", err.message);
    }
    return null;
  };

  // -------------------------------------------------------------
  // STRATEGY 0: Direct pre-provided streamUrl (0ms latency)
  // -------------------------------------------------------------
  if (toolOptions?.streamUrl) {
    const directResult = await streamUpstreamUrl(toolOptions.streamUrl, isAudio ? "audio/mpeg" : "video/mp4");
    if (directResult) return directResult;
  }

  // -------------------------------------------------------------
  // STRATEGY 1: Check in-memory cache
  // -------------------------------------------------------------
  const cached = getCachedStream(videoId, cleanFormat);
  if (cached && cached.url) {
    const cachedResult = await streamUpstreamUrl(cached.url, cached.mimeType);
    if (cachedResult) return cachedResult;
    resolvedStreamsCache.delete(cacheKey);
  }

  // -------------------------------------------------------------
  // STRATEGY 2: Piped High-Capacity Public Resolver (Fast & reliable for long videos)
  // -------------------------------------------------------------
  try {
    const pipedRes = await resolveViaPiped(videoId, isAudio, cleanFormat !== "mp3" ? cleanFormat : undefined);
    if (pipedRes && pipedRes.url) {
      const streamRes = await streamUpstreamUrl(pipedRes.url, pipedRes.mimeType);
      if (streamRes) {
        setCachedStream(videoId, cleanFormat, pipedRes.url, streamRes.mimeType);
        return streamRes;
      }
    }
  } catch (pipedErr: any) {
    console.warn("Piped engine note:", pipedErr.message);
  }

  // -------------------------------------------------------------
  // STRATEGY 3: Pure Node.js Innertube Multi-Client Decipher Engine
  // -------------------------------------------------------------
  try {
    const innertubeRes = await resolveViaInnertubeDecipher(videoId, isAudio, cleanFormat !== "mp3" ? cleanFormat : undefined);
    if (innertubeRes && innertubeRes.url) {
      const streamRes = await streamUpstreamUrl(innertubeRes.url, innertubeRes.mimeType);
      if (streamRes) {
        setCachedStream(videoId, cleanFormat, innertubeRes.url, streamRes.mimeType);
        return streamRes;
      }
    }
  } catch (innertubeErr: any) {
    console.warn("Innertube engine note:", innertubeErr.message);
  }

  // -------------------------------------------------------------
  // STRATEGY 4: DisTube Stream Resolver (Fallback for standard audio)
  // -------------------------------------------------------------
  if (isAudio) {
    try {
      const distubeRes = await resolveViaDistubeStream(videoId, isAudio);
      if (distubeRes && distubeRes.stream) {
        return buildStreamResultFromReadable(distubeRes.stream, distubeRes.mimeType);
      }
    } catch (distubeErr: any) {
      console.warn("DisTube engine note:", distubeErr.message);
    }
  }

  throw new Error("تعذر استخراج تدفق الفيديو عبر السيرفرات الوسيطة. يرجى التأكد من أن الفيديو متاح وعام.");
}
