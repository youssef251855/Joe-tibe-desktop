import { nfetch } from "./http";
// YouTube access for Cloudflare Workers: plain fetch against InnerTube (no Node APIs, no eval).
// Only formats that already carry a direct `url` are used (no signature deciphering needed).

export interface Env {
  CORS_ORIGIN?: string;
  YT_COOKIE?: string;
  YT_PO_TOKEN?: string;
}

export interface VideoQualityOption {
  quality: string;
  format: string;
  formatCode: string;
  hasAudio: boolean;
  hasVideo: boolean;
  sizeEstimate?: string;
  directStreamAvailable: boolean;
}

export interface DirectVideoInfo {
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
  qualities: VideoQualityOption[];
}

export interface PlaylistItem { id: string; title: string; thumbnail: string; url: string; duration: string; author: string }
export interface PlaylistDetails { playlistId: string; title: string; author: string; itemCount: number; items: PlaylistItem[] }

export interface Resolved {
  url: string;
  mimeType: string;
  title: string;
  height?: number;
  contentLength?: number;
  isAudio: boolean;
}

export class YtError extends Error {
  status: number;
  constructor(message: string, status = 422) { super(message); this.status = status; }
}

// ---------- helpers ----------
export function extractVideoId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

export function extractPlaylistId(input: string): string | null {
  const s = (input || "").trim();
  if (/^(PL|UU|LL|FL|OLAK5uy_|RD)[A-Za-z0-9_-]{10,}$/.test(s)) return s;
  const m = s.match(/[?&]list=([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}

function parseClock(text: string): number {
  const parts = (text || "").split(":").map((n) => parseInt(n, 10));
  if (!parts.length || parts.some((n) => Number.isNaN(n))) return 0;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}
const digits = (t: string) => parseInt((t || "").replace(/[^\d]/g, ""), 10) || 0;
const runsText = (o: any): string => o?.simpleText || (o?.runs || []).map((r: any) => r.text).join("") || "";
const lastThumb = (o: any): string => { const a = o?.thumbnails || []; return a.length ? a[a.length - 1].url : ""; };

async function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  let t: any;
  const timeout = new Promise<never>((_, rej) => { t = setTimeout(() => rej(new Error(msg)), ms); });
  try { return await Promise.race([p, timeout]); } finally { clearTimeout(t); }
}

// ---------- InnerTube clients ----------
interface ClientDef { name: string; id: number; version: string; ua: string; ctx: Record<string, unknown>; embed?: boolean }

const CLIENTS: ClientDef[] = [
  {
    name: "ANDROID_VR", id: 28, version: "1.65.10",
    ua: "com.google.android.apps.youtube.vr.oculus/1.65.10 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip",
    ctx: { clientName: "ANDROID_VR", clientVersion: "1.65.10", deviceMake: "Oculus", deviceModel: "Quest 3", osName: "Android", osVersion: "12L", androidSdkVersion: 32, hl: "en", gl: "US" }
  },
  {
    name: "IOS", id: 5, version: "19.49.7",
    ua: "com.google.ios.youtube/19.49.7 (iPhone16,2; U; CPU iOS 17_5_1 like Mac OS X;)",
    ctx: { clientName: "IOS", clientVersion: "19.49.7", deviceMake: "Apple", deviceModel: "iPhone16,2", osName: "iPhone", osVersion: "17.5.1.21F90", hl: "en", gl: "US" }
  },
  {
    name: "TV_EMBEDDED", id: 85, version: "2.0", embed: true,
    ua: "Mozilla/5.0 (PlayStation; PlayStation 4/12.00) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15",
    ctx: { clientName: "TVHTML5_SIMPLY_EMBEDDED_PLAYER", clientVersion: "2.0", hl: "en", gl: "US" }
  },
  {
    name: "ANDROID", id: 3, version: "20.10.38",
    ua: "com.google.android.youtube/20.10.38 (Linux; U; Android 11) gzip",
    ctx: { clientName: "ANDROID", clientVersion: "20.10.38", osName: "Android", osVersion: "11", androidSdkVersion: 30, hl: "en", gl: "US" }
  }
];

const WEB_CTX = { clientName: "WEB", clientVersion: "2.20250101.00.00", hl: "en", gl: "US" };
const WEB_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

async function innertube(endpoint: string, body: unknown, headers: Record<string, string>, env: Env, timeoutMs = 8000): Promise<any> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Origin: "https://www.youtube.com",
    ...headers
  };
  if (env.YT_COOKIE) h["Cookie"] = env.YT_COOKIE;
  const r = await nfetch(`https://www.youtube.com/youtubei/v1/${endpoint}?prettyPrint=false`, {
    method: "POST",
    headers: h,
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs)
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function webCall(endpoint: string, payload: Record<string, unknown>, env: Env, timeoutMs = 8000): Promise<any> {
  return innertube(endpoint, { context: { client: WEB_CTX }, ...payload }, {
    "User-Agent": WEB_UA, "X-YouTube-Client-Name": "1", "X-YouTube-Client-Version": WEB_CTX.clientVersion
  }, env, timeoutMs);
}

async function playerCall(c: ClientDef, videoId: string, env: Env): Promise<any> {
  const body: any = {
    context: { client: c.ctx, ...(c.embed ? { thirdParty: { embedUrl: "https://www.youtube.com/" } } : {}) },
    videoId, contentCheckOk: true, racyCheckOk: true
  };
  if (env.YT_PO_TOKEN) body.serviceIntegrityDimensions = { poToken: env.YT_PO_TOKEN };
  return innertube("player", body, {
    "User-Agent": c.ua, "X-YouTube-Client-Name": String(c.id), "X-YouTube-Client-Version": c.version
  }, env);
}

/** Try each client until one returns playable, URL-bearing streaming data. */
export async function getPlayer(videoId: string, env: Env, budgetMs = 20000): Promise<{ data: any; client: string }> {
  const deadline = Date.now() + budgetMs;
  let lastReason = "";
  const trail: string[] = [];
  for (const c of CLIENTS) {
    if (deadline - Date.now() < 2500) break;
    try {
      const data = await playerCall(c, videoId, env);
      const status = data?.playabilityStatus?.status;
      if (status === "OK" && data?.streamingData) {
        const all = [...(data.streamingData.formats || []), ...(data.streamingData.adaptiveFormats || [])];
        if (all.some((f: any) => f.url)) return { data, client: c.name };
        lastReason = "الروابط مشفّرة (signatureCipher)";
        trail.push(`${c.name}: ${lastReason}`);
        continue;
      }
      lastReason = data?.playabilityStatus?.reason || status || "unknown";
      trail.push(`${c.name}: ${lastReason}`);
    } catch (e: any) {
      lastReason = e?.message || lastReason;
      trail.push(`${c.name}: ${e?.message}`);
    }
  }
  const botBlocked = /bot|sign in|confirm/i.test(lastReason);
  throw new YtError(
    botBlocked
      ? "يوتيوب طلب «تأكيد أنك لست روبوت» لعنوان IP الخاص بـ Cloudflare. جرّب لاحقًا أو اضبط YT_COOKIE (حساب ثانوي) كسرّ في Cloudflare."
      : `تعذر استخراج ملف الوسائط لهذا الفيديو${lastReason ? " (" + lastReason + ")" : ""}.`
  );
}

// ---------- format selection ----------
function mimeBase(m: string): string { return (m || "").split(";")[0].trim(); }

export function pickFormat(data: any, formatCode: string): Resolved {
  const lc = (formatCode || "").toLowerCase();
  const isAudio = lc.includes("mp3") || lc.includes("m4a") || lc.includes("audio");
  const sd = data.streamingData || {};
  const progressive: any[] = (sd.formats || []).filter((f: any) => f.url);
  const adaptive: any[] = (sd.adaptiveFormats || []).filter((f: any) => f.url);
  const title: string = data.videoDetails?.title || "";

  if (isAudio) {
    const audio = adaptive.filter((f) => mimeBase(f.mimeType).startsWith("audio/"));
    const m4a = audio.filter((f) => mimeBase(f.mimeType) === "audio/mp4").sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    const rest = audio.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
    const f = m4a[0] || rest[0] || progressive[0];
    if (!f) throw new YtError("لا يوجد مسار صوتي متاح لهذا الفيديو.");
    return { url: f.url, mimeType: mimeBase(f.mimeType) || "audio/mp4", title, contentLength: Number(f.contentLength) || undefined, isAudio: true };
  }

  // Video: only progressive MP4 (audio + video together) — a Worker cannot mux separate tracks.
  const vids = progressive.filter((f) => mimeBase(f.mimeType).startsWith("video/")).sort((a, b) => (b.height || 0) - (a.height || 0));
  if (!vids.length) throw new YtError("لا يوجد فيديو بصوت مدمج لهذا المقطع. جرّب الصوت (M4A).");
  const target = parseInt((lc.match(/(\d{3,4})/) || [])[1] || "0", 10);
  let f = vids[0];
  if (target) {
    f = vids.find((v) => (v.height || 0) <= target) || vids[vids.length - 1];
  }
  return { url: f.url, mimeType: mimeBase(f.mimeType) || "video/mp4", title, height: f.height, contentLength: Number(f.contentLength) || undefined, isAudio: false };
}

export async function resolveStream(videoId: string, formatCode: string, env: Env): Promise<Resolved> {
  const { data } = await getPlayer(videoId, env);
  return pickFormat(data, formatCode);
}

// ---------- video details ----------
export async function getDirectVideoDetails(input: string, env: Env): Promise<DirectVideoInfo> {
  const videoId = extractVideoId(input);
  if (!videoId) throw new Error("رابط يوتيوب غير صالح. يرجى التأكد من كتابة الرابط بشكل صحيح.");

  const [player, oembed] = await Promise.all([
    getPlayer(videoId, env, 12000).then((p) => p.data).catch(() => null),
    nfetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, { signal: AbortSignal.timeout(4000) })
      .then((r) => (r.ok ? (r.json() as Promise<any>) : null)).catch(() => null)
  ]);

  const vd = player?.videoDetails || {};
  const title = vd.title || oembed?.title || `فيديو يوتيوب (${videoId})`;
  const author = vd.author || oembed?.author_name || "YouTube Creator";
  const durationSeconds = parseInt(vd.lengthSeconds, 10) || 0;
  const hh = Math.floor(durationSeconds / 3600), mm = Math.floor((durationSeconds % 3600) / 60), ss = durationSeconds % 60;
  const duration = durationSeconds
    ? (hh ? `${hh}:${String(mm).padStart(2, "0")}` : `${mm}`) + `:${String(ss).padStart(2, "0")}`
    : "HD";
  const thumbnail = lastThumb(vd.thumbnail) || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const mb = (bytes?: number) => (bytes ? `${(bytes / 1048576).toFixed(1)} MB` : undefined);

  const qualities: VideoQualityOption[] = [];
  const sd = player?.streamingData;
  if (sd) {
    try { const a = pickFormat(player, "m4a"); qualities.push({ quality: "صوت عالي الجودة (M4A / AAC)", format: "m4a", formatCode: "m4a", hasAudio: true, hasVideo: false, sizeEstimate: mb(a.contentLength), directStreamAvailable: true }); } catch {}
    const heights = new Map<number, any>();
    for (const f of (sd.formats || []).filter((x: any) => x.url && mimeBase(x.mimeType).startsWith("video/"))) heights.set(f.height || 0, f);
    [...heights.keys()].sort((a, b) => b - a).forEach((h) => {
      qualities.push({ quality: `فيديو ${h}p بصوت مدمج`, format: "mp4", formatCode: String(h), hasAudio: true, hasVideo: true, sizeEstimate: mb(Number(heights.get(h).contentLength) || undefined), directStreamAvailable: true });
    });
  }
  if (!qualities.length) {
    // Details page still loads when YouTube blocks stream data; the download step reports the real error.
    qualities.push(
      { quality: "صوت M4A / AAC", format: "m4a", formatCode: "m4a", hasAudio: true, hasVideo: false, directStreamAvailable: true },
      { quality: "فيديو 720p", format: "mp4", formatCode: "720", hasAudio: true, hasVideo: true, directStreamAvailable: true },
      { quality: "فيديو 360p", format: "mp4", formatCode: "360", hasAudio: true, hasVideo: true, directStreamAvailable: true }
    );
  }

  return {
    id: videoId,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    title, author,
    authorUrl: vd.channelId ? `https://www.youtube.com/channel/${vd.channelId}` : undefined,
    thumbnail, duration, durationSeconds,
    views: parseInt(vd.viewCount, 10) || 0,
    qualities
  };
}

// ---------- search ----------
export async function searchVideos(query: string, env: Env) {
  const data = await withTimeout(webCall("search", { query, params: "EgIQAQ%3D%3D" }, env, 7000), 8000, "search timeout");
  const sections = data?.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
  const out: any[] = [];
  for (const s of sections) {
    for (const it of s?.itemSectionRenderer?.contents || []) {
      const v = it.videoRenderer;
      if (!v?.videoId) continue;
      const dur = runsText(v.lengthText);
      out.push({
        id: v.videoId,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        title: runsText(v.title),
        description: runsText(v.descriptionSnippet),
        duration: dur,
        durationSeconds: parseClock(dur),
        thumbnail: lastThumb(v.thumbnail) || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        author: runsText(v.ownerText),
        views: digits(runsText(v.viewCountText)),
        ago: runsText(v.publishedTimeText)
      });
    }
  }
  return out.slice(0, 24);
}

// ---------- playlist ----------
export async function getPlaylist(input: string, env: Env): Promise<PlaylistDetails> {
  const playlistId = extractPlaylistId(input);
  if (!playlistId) throw new Error("رابط قائمة تشغيل يوتيوب غير صالح");

  const first = await webCall("browse", { browseId: "VL" + playlistId }, env, 9000);
  const items: PlaylistItem[] = [];
  const seen = new Set<string>();

  const push = (arr: any[]): string | null => {
    let token: string | null = null;
    for (const e of arr || []) {
      const v = e.playlistVideoRenderer;
      if (v?.videoId && !seen.has(v.videoId) && v.isPlayable !== false) {
        seen.add(v.videoId);
        items.push({
          id: v.videoId, title: runsText(v.title), thumbnail: lastThumb(v.thumbnail),
          url: `https://www.youtube.com/watch?v=${v.videoId}`, duration: runsText(v.lengthText), author: runsText(v.shortBylineText)
        });
      }
      const t = e.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
      if (t) token = t;
    }
    return token;
  };

  const tab = first?.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]
    ?.itemSectionRenderer?.contents?.[0]?.playlistVideoListRenderer?.contents;
  let token = push(tab || []);
  for (let i = 0; token && items.length < 200 && i < 6; i++) {
    const next = await webCall("browse", { continuation: token }, env, 9000).catch(() => null);
    const arr = next?.onResponseReceivedActions?.[0]?.appendContinuationItemsAction?.continuationItems;
    if (!arr) break;
    token = push(arr);
  }
  if (!items.length) throw new Error("تعذر جلب عناصر قائمة التشغيل (قد تكون خاصة).");

  const h = first?.header?.playlistHeaderRenderer;
  const title = runsText(h?.title) || first?.metadata?.playlistMetadataRenderer?.title || "قائمة تشغيل";
  return {
    playlistId,
    title,
    author: runsText(h?.ownerText) || "",
    itemCount: digits(runsText(h?.numVideosText)) || items.length,
    items
  };
}
