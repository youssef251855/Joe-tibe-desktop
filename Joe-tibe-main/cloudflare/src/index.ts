import { extractVideoId, getPlaylist, resolveStream, searchVideos, YtError, type Env } from "./youtube";
import { getUnifiedVideoDetails } from "./platforms";
import { contentDisposition, extForMime, headRemote, pipeGoogleVideo, pipeRemoteMedia } from "./proxy";

const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8" };

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...JSON_HEADERS, "Cache-Control": "no-store" } });
}

function withCors(res: Response, env: Env): Response {
  const h = new Headers(res.headers);
  h.set("Access-Control-Allow-Origin", env.CORS_ORIGIN || "*");
  h.set("Vary", "Origin");
  h.set("Access-Control-Allow-Methods", "GET,POST,HEAD,OPTIONS");
  h.set("Access-Control-Allow-Headers", "Content-Type, Range");
  h.set("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, Content-Disposition");
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers: h });
}

const q = (u: URL, ...names: string[]) => {
  for (const n of names) { const v = u.searchParams.get(n); if (v && v.trim()) return v.trim(); }
  return "";
};

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (req.method === "OPTIONS") return new Response(null, { status: 204 });

  if (path === "/" || path === "/ping") return new Response("Server is alive!", { status: 200 });

  if (path === "/api/health") {
    return json({ status: "healthy", runtime: "Cloudflare Workers", platforms: ["youtube", "tiktok", "facebook", "instagram", "twitter/x"], timestamp: new Date().toISOString() });
  }

  if (path === "/api/providers") {
    return json({
      providers: ["YouTube (InnerTube direct)", "TikTok", "Facebook / Reels", "Instagram / Reels", "X (Twitter)"],
      mode: "Cloudflare Workers",
      supportedFormats: ["M4A / AAC audio", "MP4 progressive video (audio included)", "TikTok / Facebook / Instagram / X MP4"]
    });
  }

  // ---- search ----
  if (path === "/api/search") {
    const query = q(url, "q");
    if (!query) return json({ success: false, error: "كلمة البحث مطلوبة" }, 400);
    try {
      const results = await searchVideos(query, env);
      return json({ success: true, count: results.length, results });
    } catch (e: any) {
      const timedOut = /timeout|abort/i.test(e?.message || "");
      return json({ success: false, error: timedOut ? "استغرق البحث وقتاً أطول من المتوقع. أعد المحاولة." : "فشل البحث في يوتيوب حالياً. أعد المحاولة.", results: [] }, timedOut ? 504 : 500);
    }
  }

  // ---- video details ----
  if (path === "/api/video") {
    const target = q(url, "url", "id");
    if (!target) return json({ success: false, error: "رابط أو معرّف الفيديو مطلوب" }, 400);
    try {
      const data = await getUnifiedVideoDetails(target, env);
      return json({ success: true, data });
    } catch (e: any) {
      return json({ success: false, error: e?.message || "تعذر جلب تفاصيل الفيديو." }, 400);
    }
  }

  // ---- playlist ----
  if (path === "/api/playlist") {
    const target = q(url, "url", "id");
    if (!target) return json({ success: false, error: "رابط قائمة التشغيل مطلوب" }, 400);
    try {
      return json({ success: true, data: await getPlaylist(target, env) });
    } catch (e: any) {
      return json({ success: false, error: e?.message || "تعذر جلب قائمة التشغيل." }, 500);
    }
  }

  // ---- download preparation (validates that the video can be resolved right now) ----
  if (path === "/api/download") {
    const target = q(url, "url", "id");
    const format = (q(url, "format") || "m4a").toLowerCase();
    const title = q(url, "title");
    if (!target) return json({ success: false, error: "رابط الفيديو مطلوب" }, 400);
    const videoId = extractVideoId(target);
    if (!videoId) return json({ success: false, error: "رابط يوتيوب غير صالح" }, 400);
    try {
      const r = await resolveStream(videoId, format, env);
      const dl = `/api/stream?id=${encodeURIComponent(videoId)}&format=${encodeURIComponent(format)}&title=${encodeURIComponent(title || r.title)}`;
      return json({ success: true, ready: true, direct: true, download_url: dl, mimeType: r.mimeType, title: title || r.title, videoId, format, height: r.height });
    } catch (e: any) {
      const status = e instanceof YtError ? e.status : 500;
      return json({ success: false, error: e?.message || "تعذر استخراج ملف الوسائط لهذا الفيديو." }, status);
    }
  }

  // ---- streaming ----
  if (path === "/api/stream" || path === "/api/proxy-download") {
    const idOrUrl = q(url, "id", "url");
    const format = (q(url, "format") || "m4a").toLowerCase();
    const title = q(url, "title");
    if (!idOrUrl) return json({ success: false, error: "معرّف الفيديو مطلوب" }, 400);

    const isFullUrl = /^https?:\/\//i.test(idOrUrl);
    const isYoutube = /youtube\.com|youtu\.be/i.test(idOrUrl);

    // TikTok / Facebook / Instagram / X CDN file
    if (isFullUrl && !isYoutube) {
      try {
        if (req.method === "HEAD") return await headRemote(idOrUrl);
        return await pipeRemoteMedia(req, idOrUrl, format, title || "JoeTube_Media");
      } catch (e: any) {
        return json({ success: false, error: e?.message || "تعذر تدفق الوسائط من المصدر." }, 500);
      }
    }

    const videoId = extractVideoId(idOrUrl) || idOrUrl;
    const isAudio = /mp3|m4a|audio/.test(format);

    // Cheap pre-flight: the real resolution already happened in /api/download.
    if (req.method === "HEAD") {
      const mime = isAudio ? "audio/mp4" : "video/mp4";
      return new Response(null, {
        status: 200,
        headers: { "Content-Type": mime, "Accept-Ranges": "bytes", "Cache-Control": "no-store", "Content-Disposition": contentDisposition(title || `YouTube_${videoId}`, extForMime(mime)) }
      });
    }

    try {
      const r = await resolveStream(videoId, format, env);
      return await pipeGoogleVideo(req, r.url, r.mimeType, title || r.title || `YouTube_${videoId}`, r.contentLength);
    } catch (e: any) {
      const status = e instanceof YtError ? e.status : 500;
      return json({ success: false, error: e?.message || "تعذر تدفق الوسائط مباشرة من المصدر." }, status);
    }
  }

  return json({ success: false, error: "المسار غير موجود" }, 404);
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    try {
      return withCors(await route(req, env), env);
    } catch (e: any) {
      return withCors(json({ success: false, error: e?.message || "خطأ غير متوقع في الخادم" }, 500), env);
    }
  }
};
