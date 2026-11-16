"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTimeout = withTimeout;
exports.getInnertube = getInnertube;
exports.extractPlaylistId = extractPlaylistId;
exports.getPlaylistDetails = getPlaylistDetails;
exports.extractVideoId = extractVideoId;
exports.sanitizeFilename = sanitizeFilename;
exports.getCachedStream = getCachedStream;
exports.setCachedStream = setCachedStream;
exports.getDirectVideoDetails = getDirectVideoDetails;
exports.resolveDirectStreamUrl = resolveDirectStreamUrl;
exports.resolveWithExternalApi = resolveWithExternalApi;
exports.pipeDirectGoogleStream = pipeDirectGoogleStream;
const stream_1 = require("stream");
// Ensure global Text is defined for youtubei.js parser in Node environment
if (typeof globalThis.Text === "undefined") {
    globalThis.Text = class Text {
    };
}
// youtubei.js / yt-search / native modules are imported LAZILY (only when a feature
// actually needs them) so a bundling or native-init failure inside any of them can never
// crash the whole serverless function at import time — which otherwise makes EVERY
// /api route (even /api/health) return HTTP 500 on Vercel.
let youtubeiModule = null;
async function loadYoutubei() {
    if (youtubeiModule)
        return youtubeiModule;
    const mod = await import("youtubei.js");
    try {
        if (mod?.Platform?.shim) {
            mod.Platform.shim.eval = async (data) => new Function(data.output)();
        }
    }
    catch (e) {
        console.warn("Platform.shim.eval patch skipped:", e?.message);
    }
    youtubeiModule = mod;
    return mod;
}
async function loadYtSearch() {
    const mod = await import("yt-search");
    return mod?.default || mod;
}
/** Rejects if `p` does not settle within `ms` (so a hanging scrape can never eat the whole function budget). */
function withTimeout(p, ms, msg = "timeout") {
    let timer;
    const timeout = new Promise((_, rej) => {
        timer = setTimeout(() => rej(new Error(msg)), ms);
    });
    return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}
// A residential/rotating proxy (Vercel env: YT_PROXY or HTTPS_PROXY) is the definitive
// fix for YouTube's datacenter-IP bot check: both stream RESOLUTION and stream FETCH go
// through the same proxy IP, so every video works on Vercel. Applied once, globally, to
// Node's undici-based global fetch that youtubei.js and pipeDirectGoogleStream both use.
let proxyApplied = false;
async function applyProxyIfNeeded() {
    if (proxyApplied)
        return;
    proxyApplied = true;
    const proxy = process.env.YT_PROXY || process.env.HTTPS_PROXY || process.env.https_proxy;
    if (!proxy)
        return;
    try {
        const undici = await import("undici");
        if (undici?.ProxyAgent && undici?.setGlobalDispatcher) {
            undici.setGlobalDispatcher(new undici.ProxyAgent(proxy));
            console.log("[yt] global proxy dispatcher enabled for YouTube fetch/stream");
        }
    }
    catch (e) {
        console.warn("[yt] proxy setup skipped:", e?.message);
    }
}
// Multi-client Innertube pool: some clients (ANDROID_VR / TVHTML5) are less likely
// to hit the "Sign in to confirm you're not a bot" check than ANDROID alone.
const CLIENT_NAMES = ["ANDROID_VR", "TVHTML5_SIMPLY_EMBEDDED_PLAYER", "ANDROID", "IOS", "WEB"];
const innertubeClients = new Map();
async function getInnertube(clientName = "ANDROID_VR") {
    if (innertubeClients.has(clientName))
        return innertubeClients.get(clientName);
    try {
        const mod = await loadYoutubei();
        const { Innertube, UniversalCache, ClientType } = mod;
        const cType = ClientType[clientName] || ClientType.ANDROID_VR;
        const createOpts = {
            cache: new UniversalCache(false),
            generate_session_locally: true,
            client_type: cType
        };
        // A valid YouTube session cookie (Vercel env: YT_COOKIE) lets the WEB client fetch
        // full streaming_data even from datacenter IPs that YouTube normally bot-checks.
        if (process.env.YT_COOKIE)
            createOpts.cookie = process.env.YT_COOKIE;
        const client = await Innertube.create(createOpts);
        innertubeClients.set(clientName, client);
        return client;
    }
    catch (err) {
        console.warn(`Innertube init (${clientName}) note:`, err?.message);
        return null;
    }
}
// Local-dev fallback: bundled yt-dlp binary (unavailable on Vercel serverless — skipped there)
async function resolveWithYtDlp(videoId, isAudio, heightCode) {
    let path, os, fs, spawn;
    try {
        path = (await import("path")).default;
        os = (await import("os")).default;
        fs = (await import("fs")).default;
        spawn = (await import("child_process")).spawn;
    }
    catch {
        return null; // native modules unavailable (serverless/Edge)
    }
    const localBin = path.join(process.cwd(), "bin", "yt-dlp" + (os.platform() === "win32" ? ".exe" : ""));
    // Prefer the bundled binary; otherwise fall back to a yt-dlp on PATH (e.g. inside the Render Docker image).
    const bin = fs.existsSync(localBin) ? localBin : (os.platform() === "win32" ? "yt-dlp.exe" : "yt-dlp");
    return new Promise((resolve) => {
        const args = [
            "--no-warnings", "--no-check-certificates", "--no-playlist", "--ignore-errors",
            "--extractor-args", "youtube:player_client=default,android,ios,tv,web_embedded",
            "-f",
            isAudio ? "bestaudio[ext=m4a]/bestaudio/best" : (heightCode ? `b[height<=${heightCode}][ext=mp4]/b[height<=${heightCode}]/b/bv*[height<=${heightCode}]` : "b[ext=mp4]/b/bv*"),
            "--get-url", "--force-ipv4", "--retries", "2",
            `https://www.youtube.com/watch?v=${videoId}`
        ];
        try {
            const proc = spawn(bin, args, { windowsHide: true });
            let out = "";
            proc.stdout.on("data", (d) => { out += d.toString(); });
            const killer = setTimeout(() => { try {
                proc.kill("SIGKILL");
            }
            catch { } }, 40000);
            proc.on("error", () => { clearTimeout(killer); resolve(null); });
            proc.on("close", (code) => {
                clearTimeout(killer);
                const url = out.trim().split("\n").map((s) => s.trim()).filter((s) => s.startsWith("http"))[0];
                if (code === 0 && url)
                    resolve(url);
                else
                    resolve(null);
            });
        }
        catch {
            resolve(null);
        }
    });
}
function extractPlaylistId(input) {
    if (!input)
        return null;
    const m = input.match(/[?&]list=([A-Za-z0-9_-]{6,})/i) ||
        input.match(/playlist\?list=([A-Za-z0-9_-]{6,})/i);
    return m ? m[1] : null;
}
const toText = (v) => {
    if (!v)
        return "";
    if (typeof v === "string")
        return v;
    if (Array.isArray(v))
        return toText(v[0]);
    if (typeof v.text === "string")
        return v.text;
    if (v.text)
        return toText(v.text);
    if (v.name)
        return toText(v.name);
    return "";
};
async function getPlaylistDetails(input) {
    const playlistId = extractPlaylistId(input);
    if (!playlistId)
        throw new Error("رابط قائمة تشغيل يوتيوب غير صالح");
    const yt = await getInnertube("WEB");
    if (!yt)
        throw new Error("تعذر تهيئة عميل يوتيوب");
    const feed = await yt.getPlaylist(playlistId);
    const collect = [];
    const seen = new Set();
    const pushItems = (arr) => {
        for (const it of arr || []) {
            try {
                const id = it.id || it.videoId;
                if (!id || seen.has(id) || id === "DELETED")
                    continue;
                if (it.isDeleted || it.isPrivate)
                    continue;
                seen.add(id);
                const thumbs = it.thumbnails || [];
                const thumbnail = thumbs.length ? thumbs[thumbs.length - 1].url : "";
                collect.push({
                    id,
                    title: toText(it.title),
                    thumbnail,
                    url: `https://www.youtube.com/watch?v=${id}`,
                    duration: toText(it.duration) || (Array.isArray(it.duration) ? toText(it.duration[0]) : ""),
                    author: toText(it.author) || toText(it.channel) || (it.subtitles ? toText(it.subtitles[0]) : "")
                });
            }
            catch { }
        }
    };
    pushItems(feed.items);
    let page = feed;
    try {
        while (collect.length < 200 && page && typeof page.getNextPage === "function") {
            page = await page.getNextPage();
            if (!page?.items)
                break;
            pushItems(page.items);
        }
    }
    catch { }
    const title = toText(feed.header?.title) || toText(feed.metadata?.title) || "قائمة تشغيل";
    const author = toText(feed.metadata?.author) || toText(feed.header?.author) || "";
    const rawCount = toText(feed.metadata?.itemCount) || toText(feed.header?.videoCountText);
    const numeric = parseInt((rawCount || "").replace(/\D/g, ""), 10);
    const itemCount = Number.isFinite(numeric) && numeric > 0 ? numeric : collect.length;
    if (collect.length === 0)
        throw new Error("قائمة التشغيل فارغة أو خاصة ولا يمكن الوصول إليها.");
    return { playlistId, title, author, itemCount, items: collect };
}
function extractVideoId(input) {
    if (!input)
        return null;
    const clean = input.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean))
        return clean;
    const match = clean.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|live\/|watch\?v=|watch\?.+&v=))([a-zA-Z0-9_-]{11})/);
    if (match && match[1])
        return match[1];
    const fallback = clean.match(/(?:v=|(?:\/))([a-zA-Z0-9_-]{11})(?:[?&/#]|$)/);
    if (fallback && fallback[1])
        return fallback[1];
    return null;
}
function sanitizeFilename(filename, defaultExt = "mp3") {
    let ext = defaultExt.replace(/^\./, "").toLowerCase();
    let base = filename;
    const lastDot = filename.lastIndexOf(".");
    if (lastDot > 0 && lastDot > filename.length - 6) {
        ext = filename.slice(lastDot + 1).toLowerCase() || ext;
        base = filename.slice(0, lastDot);
    }
    const cleanBase = base
        .replace(/[\/\\?%*:|"<>]/g, "_")
        .replace(/[\x00-\x1F\x7F]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 80) || "JoeTube_Media";
    const unicodeName = `${cleanBase}.${ext}`;
    const asciiBase = cleanBase.replace(/[^a-zA-Z0-9_\-\s]/g, "").trim().replace(/\s+/g, "_");
    const asciiName = (asciiBase.length >= 2 ? asciiBase.slice(0, 50) : `JoeTube_${ext === "mp3" ? "Audio" : "Video"}`) + `.${ext}`;
    return { asciiName, unicodeName };
}
const streamCache = new Map();
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
function getCachedStream(videoId, format) {
    const key = `${videoId}_${format.toLowerCase()}`;
    const entry = streamCache.get(key);
    if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
        return entry;
    }
    return null;
}
function setCachedStream(videoId, format, url, mimeType, title) {
    const key = `${videoId}_${format.toLowerCase()}`;
    streamCache.set(key, { url, mimeType, title, timestamp: Date.now() });
}
/**
 * Direct YouTube Metadata & Quality Extraction (Without Third-Party Proxies)
 */
async function getDirectVideoDetails(videoUrlOrId) {
    const videoId = extractVideoId(videoUrlOrId);
    if (!videoId) {
        throw new Error("رابط يوتيوب غير صالح. يرجى التأكد من كتابة الرابط بشكل صحيح.");
    }
    // Route detail fetches through the residential proxy too (when YT_PROXY is set), so a
    // datacenter-IP egress never leaks and the bot check is bypassed consistently.
    await applyProxyIfNeeded();
    // 1+2. Fetch yt-search metadata and the official oEmbed backup IN PARALLEL, each with a short
    //      hard timeout. Sequentially these could take ~10s (the default serverless limit), which
    //      made the platform kill the function and return a non-JSON HTTP 500.
    const [searchMeta, oembed] = await Promise.all([
        (async () => {
            const yts = await loadYtSearch();
            return withTimeout(yts({ videoId }), 4000, "yt-search timeout");
        })().catch((err) => {
            console.warn("yt-search detail note:", err?.message);
            return null;
        }),
        fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`, {
            headers: { "User-Agent": "Mozilla/5.0" },
            signal: AbortSignal.timeout(3000)
        })
            .then((r) => (r.ok ? r.json() : null))
            .catch(() => null)
    ]);
    const oembedTitle = oembed?.title || "";
    const oembedAuthor = oembed?.author_name || "";
    const title = searchMeta?.title || oembedTitle || `فيديو يوتيوب (${videoId})`;
    const author = searchMeta?.author?.name || oembedAuthor || "YouTube Creator";
    const thumbnail = searchMeta?.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const duration = searchMeta?.timestamp || "HD";
    const durationSeconds = searchMeta?.seconds || 0;
    const views = searchMeta?.views || 0;
    // Build standard qualities available for direct extraction
    const qualities = [
        {
            quality: "صوت عالي الدقة (MP3 320kbps)",
            format: "mp3",
            formatCode: "mp3",
            hasAudio: true,
            hasVideo: false,
            sizeEstimate: durationSeconds > 0 ? `${((durationSeconds * 320) / (8 * 1024)).toFixed(1)} MB` : "عالي الجودة",
            directStreamAvailable: true
        },
        {
            quality: "صوت أصلي فائق النقاء (M4A / AAC)",
            format: "m4a",
            formatCode: "m4a",
            hasAudio: true,
            hasVideo: false,
            sizeEstimate: durationSeconds > 0 ? `${((durationSeconds * 128) / (8 * 1024)).toFixed(1)} MB` : "صوت نقي",
            directStreamAvailable: true
        },
        {
            quality: "فيديو 1080p Full HD مباشر",
            format: "mp4",
            formatCode: "1080",
            hasAudio: true,
            hasVideo: true,
            sizeEstimate: durationSeconds > 0 ? `${((durationSeconds * 4.5) / 8).toFixed(1)} MB` : "1080p",
            directStreamAvailable: true
        },
        {
            quality: "فيديو 720p HD عالي الجودة",
            format: "mp4",
            formatCode: "720",
            hasAudio: true,
            hasVideo: true,
            sizeEstimate: durationSeconds > 0 ? `${((durationSeconds * 2.2) / 8).toFixed(1)} MB` : "720p",
            directStreamAvailable: true
        },
        {
            quality: "فيديو 480p SD متوازن",
            format: "mp4",
            formatCode: "480",
            hasAudio: true,
            hasVideo: true,
            sizeEstimate: durationSeconds > 0 ? `${((durationSeconds * 1.2) / 8).toFixed(1)} MB` : "480p",
            directStreamAvailable: true
        },
        {
            quality: "فيديو 360p (سريع وموفر للبيانات)",
            format: "mp4",
            formatCode: "360",
            hasAudio: true,
            hasVideo: true,
            sizeEstimate: durationSeconds > 0 ? `${((durationSeconds * 0.7) / 8).toFixed(1)} MB` : "360p",
            directStreamAvailable: true
        }
    ];
    return {
        id: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title,
        author,
        authorUrl: searchMeta?.author?.url,
        thumbnail,
        duration,
        durationSeconds,
        views,
        uploadDate: searchMeta?.ago,
        qualities
    };
}
/**
 * Direct YouTube Stream URL Resolver
 * Strategy: try multiple Innertube clients (no bot-check friendly) with height-based
 * format selection, then fall back to the bundled yt-dlp binary when running locally.
 */
async function resolveDirectStreamUrl(videoId, formatCode = "mp3", budgetMs = Number(process.env.RESOLVE_BUDGET_MS) || 25000) {
    // Overall time budget: every stage below checks it so the function answers (with JSON)
    // before the platform's hard timeout kills it.
    const deadline = Date.now() + budgetMs;
    const timeLeft = () => deadline - Date.now();
    const lc = formatCode.toLowerCase();
    const isAudio = lc.includes("mp3") || lc.includes("m4a") || lc.includes("audio");
    const cleanCode = isAudio ? (lc.includes("m4a") ? "m4a" : "mp3") : formatCode;
    const heightMatch = lc.match(/(\d{3,4})/);
    const heightCode = heightMatch ? parseInt(heightMatch[1], 10) : null;
    // 1. Check in-memory cache first (0ms latency!)
    const cached = getCachedStream(videoId, cleanCode);
    if (cached) {
        return { success: true, direct: true, url: cached.url, mimeType: cached.mimeType, title: cached.title, videoId, format: cleanCode };
    }
    await applyProxyIfNeeded();
    let videoTitle = `YouTube_${videoId}`;
    let lastError = "";
    // 2. Multi-client Innertube extraction. When a session cookie is present, prefer the
    //    WEB client first (it returns full streaming_data with the cookie) to avoid burning
    //    time on mobile clients that YouTube bot-checks without one.
    const clientOrder = process.env.YT_COOKIE
        ? ["WEB", "TVHTML5_SIMPLY_EMBEDDED_PLAYER", ...CLIENT_NAMES.filter((c) => c !== "WEB" && c !== "TVHTML5_SIMPLY_EMBEDDED_PLAYER")]
        : CLIENT_NAMES;
    for (const clientName of clientOrder) {
        if (timeLeft() < 3000) {
            lastError = lastError || "انتهت ميزانية الوقت قبل تجربة كل العملاء";
            break;
        }
        try {
            const yt = await getInnertube(clientName);
            if (!yt)
                continue;
            let info = null;
            const poArgs = process.env.YT_PO_TOKEN ? { po: process.env.YT_PO_TOKEN, poToken: process.env.YT_PO_TOKEN } : undefined;
            try {
                info = await withTimeout(yt.getInfo(videoId, poArgs), Math.min(7000, timeLeft()), "innertube timeout");
            }
            catch {
                info = await withTimeout(yt.getBasicInfo(videoId, poArgs), Math.min(5000, Math.max(timeLeft(), 1000)), "innertube timeout").catch(() => null);
            }
            if (!info?.streaming_data) {
                lastError = "لم يُرجع يوتيوب بيانات تدفق لهذا الفيديو";
                continue;
            }
            if (info.basic_info?.title)
                videoTitle = info.basic_info.title;
            const progressive = info.streaming_data.formats || [];
            const adaptive = info.streaming_data.adaptive_formats || [];
            const candidates = [];
            if (isAudio) {
                const audioOnly = adaptive.filter((a) => (a.mime_type || "").includes("audio"));
                candidates.push(...audioOnly.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0)));
                candidates.push(...progressive.filter((f) => f.has_audio));
            }
            else if (heightCode) {
                const atHeight = (arr) => arr.filter((f) => f.has_video && f.height === heightCode).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                candidates.push(...atHeight(progressive), ...atHeight(adaptive));
                const nearBelow = (arr) => arr.filter((f) => f.has_video && f.height && f.height < heightCode).sort((a, b) => b.height - a.height);
                const nearAbove = (arr) => arr.filter((f) => f.has_video && f.height && f.height > heightCode).sort((a, b) => a.height - b.height);
                candidates.push(...nearBelow(progressive), ...nearBelow(adaptive), ...nearAbove(progressive), ...nearAbove(adaptive));
            }
            else {
                candidates.push(...progressive.filter((f) => f.has_video), ...adaptive.filter((f) => f.has_video));
            }
            for (const fmt of candidates) {
                try {
                    const url = fmt.url || (fmt.decipher ? await fmt.decipher(yt.session.player) : null);
                    if (!url)
                        continue;
                    const mime = isAudio
                        ? (cleanCode === "mp3" ? "audio/mpeg" : ((fmt.mime_type || "audio/mp4").split(";")[0]))
                        : ((fmt.mime_type || "video/mp4").split(";")[0]);
                    setCachedStream(videoId, cleanCode, url, mime, videoTitle);
                    console.log(`[yt] resolved via ${clientName} for ${videoId}/${cleanCode}`);
                    return { success: true, direct: true, url, mimeType: mime, title: videoTitle, videoId, format: cleanCode };
                }
                catch { }
            }
            lastError = "تعذر فك تشفير روابط التدفق";
        }
        catch (err) {
            lastError = err?.message || lastError;
            console.warn(`Innertube ${clientName} note for ${videoId}:`, err?.message);
        }
    }
    // 3. External API fallback (Piped → Invidious public instances). Used mainly on
    //    serverless/datacenter IPs where YouTube bot-checks the Innertube clients.
    try {
        if (timeLeft() < 2000)
            throw new Error("no time left");
        const ext = await resolveWithExternalApi(videoId, isAudio, heightCode, deadline);
        if (ext?.url) {
            setCachedStream(videoId, cleanCode, ext.url, ext.mimeType, videoTitle);
            console.log(`[yt] resolved via external API (${ext.source}) for ${videoId}/${cleanCode}`);
            return { success: true, direct: true, url: ext.url, mimeType: ext.mimeType, title: videoTitle, videoId, format: cleanCode };
        }
    }
    catch { }
    // 4. Local-dev fallback: bundled yt-dlp binary (resolves to null on serverless)
    try {
        if (timeLeft() < 5000)
            throw new Error("no time left");
        const ytDlpUrl = await resolveWithYtDlp(videoId, isAudio, heightCode);
        if (ytDlpUrl) {
            const mime = isAudio ? (cleanCode === "m4a" ? "audio/mp4" : "audio/mpeg") : "video/mp4";
            setCachedStream(videoId, cleanCode, ytDlpUrl, mime, videoTitle);
            console.log(`[yt] resolved via yt-dlp binary for ${videoId}/${cleanCode}`);
            return { success: true, direct: true, url: ytDlpUrl, mimeType: mime, title: videoTitle, videoId, format: cleanCode };
        }
    }
    catch { }
    // 5. All engines failed — return an explicit error instead of redirecting to third-party sites
    return {
        success: false,
        direct: false,
        title: videoTitle,
        videoId,
        format: cleanCode,
        error: "عنوان IP الخاص بخادم النشر محجوب من يوتيوب (تحقّق «لست روبوت»)، هذه ليست مشكلة كود. لتفعيل كل الفيديوهات المحمية: اضبط WORKER_URL على خادم worker (مجلد worker/ على fly.io)، أو YT_PROXY (بروكسي منزلي)، أو شغّل محرّك yt-dlp عبر Render Docker."
    };
}
/**
 * Resolve a YouTube stream via public third-party APIs (Piped first, then Invidious).
 * These proxies fetch from their own (residential/proxied) IPs and hand back direct
 * googlevideo / proxied URLs, so they keep working when YouTube bot-checks the
 * serverless function's datacenter IP. Returns null if every instance fails.
 */
const PIPED_HOSTS = [
    "pipedapi.kavin.rocks",
    "pipedapi.adminforge.de",
    "pipedapi.leptons.xyz",
    "pipedapi.reallyaweso.me",
    "pipedapi.drgns.space"
];
const INVIDIOUS_HOSTS = [
    "inv.nadeko.net",
    "yewtu.be",
    "invidious.nerdvpn.de",
    "iv.ggtyler.dev"
];
const heightFromQuality = (q) => {
    const m = String(q || "").match(/(\d+)p/);
    return m ? parseInt(m[1], 10) : 0;
};
async function fetchJsonWithTimeout(url, ms) {
    const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36", "Accept": "application/json" },
        signal: AbortSignal.timeout(ms)
    });
    if (!res.ok)
        throw new Error(`HTTP ${res.status}`);
    return res.json();
}
async function resolveWithExternalApi(videoId, isAudio, heightCode, deadline = Date.now() + 15000) {
    const target = heightCode || 720;
    const outOfTime = () => Date.now() > deadline - 1500;
    // Optional: self-hosted cobalt instance (env COBALT_API, e.g. https://cobalt.your.host)
    // It resolves via its OWN clean IP + yt-dlp (PO token), so it works even when YouTube
    // blocks our egress IP. Skipped entirely when COBALT_API is not set.
    if (process.env.COBALT_API) {
        try {
            const body = isAudio
                ? { url: `https://www.youtube.com/watch?v=${videoId}`, downloadMode: "audio", audioFormat: "mp3" }
                : { url: `https://www.youtube.com/watch?v=${videoId}`, downloadMode: "auto", videoQuality: String(target), youtubeFormat: "mp4" };
            const headers = { "Accept": "application/json", "Content-Type": "application/json" };
            if (process.env.COBALT_KEY)
                headers["Authorization"] = `Api-Key ${process.env.COBALT_KEY}`;
            const cres = await fetch(process.env.COBALT_API, { method: "POST", headers, body: JSON.stringify(body), signal: AbortSignal.timeout(Math.max(1500, Math.min(9000, deadline - Date.now() - 1500))) });
            if (cres.ok && (cres.headers.get("content-type") || "").includes("application/json")) {
                const cj = await cres.json().catch(() => null);
                if (cj && typeof cj.url === "string" && cj.url.startsWith("http")) {
                    return { url: cj.url, mimeType: isAudio ? "audio/mpeg" : "video/mp4", source: "cobalt" };
                }
            }
        }
        catch { }
    }
    // Piped instances
    for (const host of PIPED_HOSTS) {
        if (outOfTime())
            return null;
        try {
            const data = await fetchJsonWithTimeout(`https://${host}/streams/${videoId}`, 5000);
            if (isAudio) {
                const arr = (data.audioStreams || []).filter((s) => s.url).sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                if (arr[0])
                    return { url: arr[0].url, mimeType: "audio/mp4", source: `piped:${host}` };
            }
            else {
                const vs = (data.videoStreams || []).filter((s) => s.url);
                const mp4 = vs.filter((s) => /mp4/i.test(s.format || "") || s.mimeType?.includes("mp4"));
                const pool = mp4.length ? mp4 : vs;
                pool.sort((a, b) => Math.abs(heightFromQuality(a.quality) - target) - Math.abs(heightFromQuality(b.quality) - target));
                if (pool[0])
                    return { url: pool[0].url, mimeType: "video/mp4", source: `piped:${host}` };
            }
        }
        catch { }
    }
    // Invidious instances
    for (const host of INVIDIOUS_HOSTS) {
        if (outOfTime())
            return null;
        try {
            const data = await fetchJsonWithTimeout(`https://${host}/api/v1/videos/${videoId}?fields=formatStreams,adaptiveFormats`, 6000);
            const all = [...(data.formatStreams || []), ...(data.adaptiveFormats || [])].filter((s) => s.url);
            if (isAudio) {
                const a = all.filter((s) => (s.mimeType || "").startsWith("audio"));
                a.sort((x, y) => (parseInt(y.bitrate) || 0) - (parseInt(x.bitrate) || 0));
                if (a[0])
                    return { url: a[0].url, mimeType: (a[0].mimeType || "audio/mp4").split(";")[0], source: `invidious:${host}` };
            }
            else {
                const v = all.filter((s) => s.quality && /\d+p/.test(s.quality) && (s.container === "mp4" || (s.mimeType || "").includes("mp4")));
                v.sort((x, y) => Math.abs(heightFromQuality(x.quality) - target) - Math.abs(heightFromQuality(y.quality) - target));
                if (v[0])
                    return { url: v[0].url, mimeType: (v[0].mimeType || "video/mp4").split(";")[0], source: `invidious:${host}` };
            }
        }
        catch { }
    }
    return null;
}
/**
 * Direct Stream Pipe Handler for Express Response
 * Streams bytes directly from GoogleVideo CDN to the user with HTTP Range support
 */
async function pipeDirectGoogleStream(reqRange, streamUrl, mimeType, filename, res) {
    await applyProxyIfNeeded();
    const fetchHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Accept-Encoding": "identity"
    };
    if (reqRange) {
        fetchHeaders["Range"] = reqRange;
    }
    const upstreamRes = await fetch(streamUrl, {
        headers: fetchHeaders
    });
    if (!upstreamRes.ok || !upstreamRes.body) {
        res.removeHeader("Content-Disposition");
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        return res.status(upstreamRes.status || 502).json({
            success: false,
            error: "فشل استلام تدفق الوسائط من سيرفر يوتيوب المصدر مباشرة."
        });
    }
    const { asciiName, unicodeName } = sanitizeFilename(filename, mimeType.includes("audio") ? "mp3" : "mp4");
    // Set streaming headers
    res.status(upstreamRes.status);
    res.setHeader("Content-Type", mimeType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Disposition", `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(unicodeName)}`);
    res.setHeader("Cache-Control", "no-cache");
    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) {
        res.setHeader("Content-Length", contentLength);
    }
    const contentRange = upstreamRes.headers.get("content-range");
    if (contentRange) {
        res.setHeader("Content-Range", contentRange);
    }
    // Convert Web ReadableStream to Node Readable and pipe directly to Express response
    const nodeStream = stream_1.Readable.fromWeb(upstreamRes.body);
    nodeStream.on("error", (err) => {
        console.error("Direct stream pipeline error:", err?.message);
        if (!res.headersSent) {
            res.removeHeader("Content-Disposition");
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.status(500).json({ success: false, error: "انقطع تدفق الوسائط أثناء النقل." });
        }
    });
    nodeStream.pipe(res);
}
