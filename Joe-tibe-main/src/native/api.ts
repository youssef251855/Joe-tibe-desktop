// نفس مسارات /api/* التي كان يقدّمها الخادم، لكنها تعمل الآن داخل التطبيق نفسه.
import { extractVideoId, getPlaylist, resolveStream, searchVideos, YtError, type Env, type Resolved } from "./youtube";
import { getUnifiedVideoDetails } from "./platforms";

const env: Env = {};

export interface ApiResult {
  status: number;
  body?: unknown;
  headers?: Record<string, string>;
}

// تُستدعى /api/download أولًا ثم يبدأ التنزيل؛ نحفظ النتيجة دقائق قليلة لتفادي طلب ثانٍ ليوتيوب.
const resolvedCache = new Map<string, { r: Resolved; t: number }>();
const RESOLVE_TTL = 4 * 60 * 1000;

export async function resolveCached(videoId: string, format: string): Promise<Resolved> {
  const key = `${videoId}|${format}`;
  const hit = resolvedCache.get(key);
  if (hit && Date.now() - hit.t < RESOLVE_TTL) return hit.r;
  const r = await resolveStream(videoId, format, env);
  resolvedCache.set(key, { r, t: Date.now() });
  return r;
}

const pick = (p: URLSearchParams, ...names: string[]) => {
  for (const n of names) {
    const v = p.get(n);
    if (v && v.trim()) return v.trim();
  }
  return "";
};

export async function handleApi(pathname: string, p: URLSearchParams, method: string): Promise<ApiResult> {
  const path = pathname.replace(/\/+$/, "") || "/";

  if (path === "/ping") return { status: 200, body: "Server is alive!" };

  if (path === "/api/health") {
    return { status: 200, body: { status: "healthy", runtime: "on-device", timestamp: new Date().toISOString() } };
  }

  if (path === "/api/search") {
    const query = pick(p, "q");
    if (!query) return { status: 400, body: { success: false, error: "كلمة البحث مطلوبة" } };
    try {
      const results = await searchVideos(query, env);
      return { status: 200, body: { success: true, count: results.length, results } };
    } catch (e: any) {
      const timedOut = /timeout|abort/i.test(e?.message || "");
      return {
        status: timedOut ? 504 : 500,
        body: { success: false, error: timedOut ? "استغرق البحث وقتاً أطول من المتوقع. أعد المحاولة." : "فشل البحث في يوتيوب حالياً. أعد المحاولة.", results: [] }
      };
    }
  }

  if (path === "/api/video") {
    const target = pick(p, "url", "id");
    if (!target) return { status: 400, body: { success: false, error: "رابط أو معرّف الفيديو مطلوب" } };
    try {
      return { status: 200, body: { success: true, data: await getUnifiedVideoDetails(target, env) } };
    } catch (e: any) {
      return { status: 400, body: { success: false, error: e?.message || "تعذر جلب تفاصيل الفيديو." } };
    }
  }

  if (path === "/api/playlist") {
    const target = pick(p, "url", "id");
    if (!target) return { status: 400, body: { success: false, error: "رابط قائمة التشغيل مطلوب" } };
    try {
      return { status: 200, body: { success: true, data: await getPlaylist(target, env) } };
    } catch (e: any) {
      return { status: 500, body: { success: false, error: e?.message || "تعذر جلب قائمة التشغيل." } };
    }
  }

  if (path === "/api/download") {
    const target = pick(p, "url", "id");
    const format = (pick(p, "format") || "m4a").toLowerCase();
    const title = pick(p, "title");
    if (!target) return { status: 400, body: { success: false, error: "رابط الفيديو مطلوب" } };
    const videoId = extractVideoId(target);
    if (!videoId) return { status: 400, body: { success: false, error: "رابط يوتيوب غير صالح" } };
    try {
      const r = await resolveCached(videoId, format);
      const dl = `/api/stream?id=${encodeURIComponent(videoId)}&format=${encodeURIComponent(format)}&title=${encodeURIComponent(title || r.title)}`;
      return { status: 200, body: { success: true, ready: true, direct: true, download_url: dl, mimeType: r.mimeType, title: title || r.title, videoId, format, height: r.height } };
    } catch (e: any) {
      return { status: e instanceof YtError ? e.status : 500, body: { success: false, error: e?.message || "تعذر استخراج ملف الوسائط لهذا الفيديو." } };
    }
  }

  // الفحص المسبق (HEAD) فقط؛ التنزيل الفعلي يتم عبر downloader.ts مباشرة من خوادم يوتيوب إلى جهازك.
  if (path === "/api/stream" || path === "/api/proxy-download") {
    if (method === "HEAD") {
      const isAudio = /mp3|m4a|audio/.test((pick(p, "format") || "").toLowerCase());
      return { status: 200, headers: { "Content-Type": isAudio ? "audio/mp4" : "video/mp4" } };
    }
    return { status: 400, body: { success: false, error: "التنزيل يتم داخل التطبيق مباشرة." } };
  }

  return { status: 404, body: { success: false, error: "المسار غير موجود" } };
}
