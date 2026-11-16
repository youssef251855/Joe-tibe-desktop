"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
const express_1 = __importDefault(require("express"));
const youtubeDirect_1 = require("./youtubeDirect");
const mediaProxy_1 = require("./mediaProxy");
const platforms_1 = require("./platforms");
exports.app = (0, express_1.default)();
exports.app.use(express_1.default.json());
// CORS — lets a separately-hosted frontend (e.g. Vercel) call this API when the backend
// runs on Render. Exposes Range/Content-Range so streaming + resume keep working cross-origin.
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
exports.app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", CORS_ORIGIN);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,HEAD,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");
    res.setHeader("Access-Control-Expose-Headers", "Content-Range, Content-Length, Accept-Ranges, Content-Disposition");
    if (req.method === "OPTIONS")
        return res.status(204).end();
    next();
});
// Set universal headers to prevent browser/proxy caching for all API endpoints
exports.app.use("/api", (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
});
// 0. Keep-alive ping for external uptime monitors (e.g. UptimeRobot) so the free Render
//    service doesn't spin down. Point UptimeRobot at: https://<your-render-url>/ping
exports.app.get("/ping", (req, res) => {
    res.status(200).send("Server is alive!");
});
// 1. Serverless Health Check
exports.app.get("/api/health", (req, res) => {
    return res.json({
        status: "healthy",
        runtime: "Serverless Express Gateway",
        architecture: "Multi-Platform Extraction (YouTube Direct + Secure CDN Proxy for TikTok/Facebook/Instagram/X)",
        platforms: ["youtube", "tiktok", "facebook", "instagram", "twitter/x"],
        timestamp: new Date().toISOString()
    });
});
// 2. Providers Information
exports.app.get("/api/providers", (req, res) => {
    return res.json({
        providers: [
            "YouTube Direct (GoogleVideo CDN)",
            "TikTok (no-watermark HD + audio)",
            "Facebook / Facebook Reels",
            "Instagram / Instagram Reels",
            "X (Twitter)"
        ],
        mode: "Serverless (Vercel) — No Persistent VPS",
        supportedFormats: [
            "MP3 320kbps High Quality Audio",
            "M4A Original Pure AAC Audio",
            "1080p / 720p / 480p / 360p MP4 Video",
            "TikTok / Facebook / Instagram MP4 (no watermark)"
        ],
        features: [
            "Pure Node.js & Express Serverless Handler",
            "Native HTTP Range streaming (206 Partial Content)",
            "SSRF-protected secure media proxy for social CDNs",
            "Instant pre-flight verification preventing HTML error downloads",
            "Arabic UTF-8 filename preservation"
        ]
    });
});
// 3. Search YouTube Videos Directly
exports.app.get("/api/search", async (req, res) => {
    const query = (req.query.q || "").trim();
    if (!query) {
        return res.status(400).json({ success: false, error: "كلمة البحث مطلوبة" });
    }
    try {
        const ytsMod = await import("yt-search");
        const yts = ytsMod?.default || ytsMod;
        // Hard timeout: a hanging scrape (YouTube blocking the datacenter IP) must answer with JSON,
        // not get killed by the platform and surface as a non-JSON HTTP 500 in the browser.
        const searchResult = await (0, youtubeDirect_1.withTimeout)(yts(query), 7000, "search timeout");
        const results = (searchResult.videos || []).slice(0, 24).map((v) => ({
            id: v.videoId,
            url: `https://www.youtube.com/watch?v=${v.videoId}`,
            title: v.title,
            description: v.description,
            duration: v.timestamp,
            durationSeconds: v.seconds,
            thumbnail: v.thumbnail,
            author: v.author?.name || "",
            views: v.views,
            ago: v.ago
        }));
        return res.json({ success: true, count: results.length, results });
    }
    catch (err) {
        console.error("Direct search error:", err?.message);
        const timedOut = /timeout/i.test(err?.message || "");
        return res.status(timedOut ? 504 : 500).json({
            success: false,
            error: timedOut
                ? "استغرق البحث وقتاً أطول من المتوقع. يرجى إعادة المحاولة بعد قليل."
                : "فشل البحث في يوتيوب حالياً. يرجى إعادة المحاولة.",
            results: []
        });
    }
});
// 4. Multi-Platform Details & Qualities Endpoint (YouTube, TikTok, Facebook, Instagram, X)
exports.app.get("/api/video", async (req, res) => {
    const urlOrId = (req.query.url || req.query.id || "").trim();
    if (!urlOrId) {
        return res.status(400).json({ success: false, error: "رابط أو معرّف الفيديو مطلوب" });
    }
    try {
        const data = await (0, youtubeDirect_1.withTimeout)((0, platforms_1.getUnifiedVideoDetails)(urlOrId), 25000, "video details timeout");
        return res.json({ success: true, data });
    }
    catch (err) {
        console.error("Video details error:", err?.message);
        const timedOut = /timeout/i.test(err?.message || "");
        return res.status(timedOut ? 504 : 400).json({
            success: false,
            error: timedOut ? "استغرق جلب التفاصيل وقتاً أطول من المتوقع. حاول مرة أخرى." : (err.message || "تعذر جلب تفاصيل الفيديو.")
        });
    }
});
// 4b. YouTube Playlist Extraction Endpoint
exports.app.get("/api/playlist", async (req, res) => {
    const url = (req.query.url || req.query.id || "").trim();
    if (!url) {
        return res.status(400).json({ success: false, error: "رابط قائمة التشغيل مطلوب" });
    }
    try {
        const data = await (0, youtubeDirect_1.getPlaylistDetails)(url);
        return res.json({ success: true, data });
    }
    catch (err) {
        console.error("Playlist error:", err?.message);
        return res.status(500).json({ success: false, error: err?.message || "تعذر جلب قائمة التشغيل." });
    }
});
// 5. Download Preparation Endpoint (Resolves direct stream & caches for 0ms download)
exports.app.get("/api/download", async (req, res) => {
    const urlOrId = (req.query.url || req.query.id || "").trim();
    const format = (req.query.format || "mp3").toLowerCase();
    const customTitle = (req.query.title || "").trim();
    if (!urlOrId) {
        return res.status(400).json({ success: false, error: "رابط الفيديو مطلوب" });
    }
    const videoId = (0, youtubeDirect_1.extractVideoId)(urlOrId);
    if (!videoId) {
        return res.status(400).json({ success: false, error: "رابط يوتيوب غير صالح" });
    }
    try {
        // With a worker configured, spend less time on the (likely IP-blocked) local attempt so the
        // delegation below is reached well before the serverless timeout.
        const hasWorker = !!(process.env.WORKER_URL || "").trim();
        const resolved = await (0, youtubeDirect_1.resolveDirectStreamUrl)(videoId, format, hasWorker ? 12000 : 25000);
        if (!resolved.url) {
            // Delegation fallback: when a residential extractor worker is configured (WORKER_URL,
            // e.g. this same backend tunneled from a home PC via Cloudflare), hand the ENTIRE
            // download+stream to it so bot-checked videos resolve AND fetch bytes from the worker's
            // clean IP — Vercel's datacenter IP is what YouTube blocks. The client uses this absolute
            // URL directly (apiUrl leaves http(s) URLs untouched); the worker already sends CORS + Range.
            const wu = (process.env.WORKER_URL || "").replace(/\/+$/, "");
            if (wu) {
                const wk = process.env.WORKER_KEY || "";
                const keyQs = wk ? `&key=${encodeURIComponent(wk)}` : "";
                const workerUrl = `${wu}/api/stream?id=${encodeURIComponent(videoId)}&format=${encodeURIComponent(format)}&title=${encodeURIComponent(customTitle || resolved.title || "")}${keyQs}`;
                return res.json({
                    success: true,
                    ready: true,
                    direct: true,
                    viaWorker: true,
                    download_url: workerUrl,
                    title: customTitle || resolved.title,
                    videoId,
                    format
                });
            }
            return res.status(422).json({
                success: false,
                error: resolved.error ||
                    "تعذر استخراج ملف الوسائط لهذا الفيديو، يرجى اختيار جودة أخرى (MP3 / 360p)."
            });
        }
        const streamDownloadUrl = `/api/stream?id=${encodeURIComponent(videoId)}&format=${encodeURIComponent(format)}&title=${encodeURIComponent(customTitle || resolved.title)}`;
        return res.json({
            success: true,
            ready: true,
            direct: true,
            download_url: streamDownloadUrl,
            direct_cdn_url: resolved.url,
            mimeType: resolved.mimeType,
            title: customTitle || resolved.title,
            videoId,
            format
        });
    }
    catch (err) {
        console.error("Download preparation error:", err?.message);
        return res.status(500).json({
            success: false,
            error: err.message || "تعذر استخراج ملف الوسائط لهذا الفيديو، يرجى اختيار جودة أخرى."
        });
    }
});
// 6. Direct Media Streaming Endpoint
//    - YouTube: streams straight from the GoogleVideo CDN (no third-party proxy)
//    - TikTok / Facebook / Instagram / X: proxies the resolved direct-CDN media URL securely
exports.app.all("/api/stream", async (req, res) => {
    const urlOrId = (req.query.id || req.query.url || "").trim();
    const format = (req.query.format || "mp3").toLowerCase();
    const title = (req.query.title || "").trim();
    if (!urlOrId) {
        res.setHeader("Content-Disposition", "inline");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(400).json({ success: false, error: "معرّف الفيديو مطلوب" });
    }
    // Remote (non-YouTube) direct-CDN media (TikTok / Facebook / Instagram / X)
    const isYoutube = /youtube\.com|youtu\.be/i.test(urlOrId);
    const isFullUrl = /^https?:\/\//i.test(urlOrId);
    if (isFullUrl && !isYoutube) {
        const cleanTitle = title || "JoeTube_Media";
        try {
            (0, mediaProxy_1.assertPublicMediaUrl)(urlOrId);
            if (req.method === "HEAD") {
                const head = await (0, mediaProxy_1.safeFetch)(urlOrId, { method: "HEAD", signal: AbortSignal.timeout(8000) }).catch(() => null);
                const ct = (head?.headers.get("content-type") || "video/mp4").split(";")[0];
                res.setHeader("Content-Type", ct);
                res.setHeader("Accept-Ranges", "bytes");
                res.setHeader("X-Content-Type-Options", "nosniff");
                res.setHeader("Cache-Control", "no-cache");
                return res.status(head?.ok ? 200 : 502).end();
            }
            await (0, mediaProxy_1.pipeRemoteMedia)(req.headers.range, urlOrId, format, cleanTitle, res);
        }
        catch (err) {
            console.error("Remote media proxy error:", err?.message);
            if (!res.headersSent) {
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                return res.status(500).json({ success: false, error: err.message || "تعذر تدفق الوسائط من المصدر." });
            }
        }
        return;
    }
    const videoId = (0, youtubeDirect_1.extractVideoId)(urlOrId) || urlOrId;
    const isAudio = format.includes("mp3") || format.includes("m4a") || format.includes("audio");
    const ext = isAudio ? (format.includes("m4a") ? "m4a" : "mp3") : "mp4";
    const defaultMime = ext === "mp3" ? "audio/mpeg" : (ext === "m4a" ? "audio/mp4" : "video/mp4");
    const cleanTitle = title || `YouTube_${videoId}`;
    // Instant 0ms pre-flight check for HEAD requests
    if (req.method === "HEAD") {
        const { asciiName, unicodeName } = (0, youtubeDirect_1.sanitizeFilename)(cleanTitle, ext);
        res.setHeader("Content-Type", defaultMime);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader("Content-Disposition", `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(unicodeName)}`);
        res.setHeader("Cache-Control", "no-cache");
        return res.status(200).end();
    }
    try {
        const resolved = await (0, youtubeDirect_1.resolveDirectStreamUrl)(videoId, format);
        if (!resolved.url) {
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            return res.status(422).json({
                success: false,
                error: resolved.error ||
                    "تعذر استخراج تدفق الوسائط لهذا الفيديو من يوتيوب. جرّب جودة أخرى مثل MP3 أو 360p."
            });
        }
        await (0, youtubeDirect_1.pipeDirectGoogleStream)(req.headers.range, resolved.url, resolved.mimeType || defaultMime, cleanTitle, res);
    }
    catch (err) {
        console.error("Direct streaming error:", err?.message);
        if (!res.headersSent) {
            res.removeHeader("Content-Disposition");
            res.setHeader("Content-Disposition", "inline");
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            return res.status(500).json({
                success: false,
                error: err.message || "تعذر تدفق الوسائط مباشرة من المصدر."
            });
        }
    }
});
// Backward-compatibility alias for /api/proxy-download -> delegates to /api/stream,
// preserving the original URL so both YouTube IDs and remote TikTok/Facebook/Instagram CDN links work.
exports.app.all("/api/proxy-download", (req, res) => {
    const urlOrId = (req.query.url || req.query.id || "").trim();
    const format = (req.query.format || "mp3").toLowerCase();
    const title = (req.query.title || "").trim();
    req.url = `/api/stream?id=${encodeURIComponent(urlOrId)}&format=${encodeURIComponent(format)}&title=${encodeURIComponent(title)}`;
    return exports.app.handle(req, res);
});
exports.default = exports.app;
