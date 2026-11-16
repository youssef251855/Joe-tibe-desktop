"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertPublicMediaUrl = assertPublicMediaUrl;
exports.isSafeRemoteUrl = isSafeRemoteUrl;
exports.safeFetch = safeFetch;
exports.pipeRemoteMedia = pipeRemoteMedia;
const stream_1 = require("stream");
const promises_1 = require("dns/promises");
const youtubeDirect_1 = require("./youtubeDirect");
const BLOCKED_HOSTNAMES = new Set([
    "localhost",
    "metadata.google.internal",
    "169.254.169.254",
    "metadata"
]);
function isPrivateIPv4(ip) {
    const parts = ip.split(".").map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p)))
        return false;
    const [a, b] = parts;
    if (a === 10 || a === 127)
        return true;
    if (a === 0)
        return true;
    if (a === 169 && b === 254)
        return true;
    if (a === 192 && b === 168)
        return true;
    if (a === 172 && b >= 16 && b <= 31)
        return true;
    if (a === 100 && b >= 64 && b <= 127)
        return true; // CGNAT
    return false;
}
function isPrivateIPv6(ip) {
    // URL.hostname returns IPv6 literals wrapped in brackets ("[::1]") — strip them first
    const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
    if (lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80"))
        return true;
    const v4 = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (v4)
        return isPrivateIPv4(v4[1]);
    return false;
}
function assertPublicMediaUrl(rawUrl) {
    let parsed;
    try {
        parsed = new URL(rawUrl);
    }
    catch {
        throw new Error("رابط الوسائط غير صالح.");
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("يُسمح فقط بروابط HTTP/HTTPS.");
    }
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (BLOCKED_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".internal")) {
        throw new Error("النطاق غير مسموح به.");
    }
    // Literal IP check
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        if (isPrivateIPv4(hostname))
            throw new Error("عنوان غير مسموح به.");
    }
    else if (hostname.includes(":")) {
        if (isPrivateIPv6(hostname))
            throw new Error("عنوان غير مسموح به.");
    }
    return parsed;
}
async function isSafeRemoteUrl(parsed) {
    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname))
        return !isPrivateIPv4(hostname);
    if (hostname.includes(":"))
        return !isPrivateIPv6(hostname);
    try {
        // Check EVERY resolved address (a host can have several A/AAAA records)
        const addrs = await (0, promises_1.lookup)(hostname, { all: true });
        if (!addrs || addrs.length === 0)
            return false;
        return addrs.every(({ address, family }) => family === 6 ? !isPrivateIPv6(address) : !isPrivateIPv4(address));
    }
    catch {
        // Fail CLOSED: if we cannot verify where the host points, do not fetch it.
        return false;
    }
}
/**
 * fetch() that validates the URL (and every redirect hop) before connecting, so a public
 * URL cannot 30x-redirect the server into a private/internal address (SSRF).
 */
async function safeFetch(url, init = {}, maxRedirects = 5) {
    let current = url;
    for (let i = 0; i <= maxRedirects; i++) {
        const parsed = assertPublicMediaUrl(current);
        if (!(await isSafeRemoteUrl(parsed))) {
            throw new Error("مصدر الوسائط غير مسموح به لأسباب أمنية.");
        }
        const r = await fetch(parsed.toString(), { ...init, redirect: "manual" });
        if (r.status >= 300 && r.status < 400) {
            const loc = r.headers.get("location");
            if (!loc)
                return r;
            current = new URL(loc, parsed).toString();
            continue;
        }
        return r;
    }
    throw new Error("عدد التحويلات (redirects) أكبر من المسموح.");
}
function guessMimeFromUrl(url, format) {
    const ext = format.toLowerCase();
    if (ext.includes("mp3") || url.includes(".mp3"))
        return "audio/mpeg";
    if (ext.includes("m4a") || url.includes(".m4a"))
        return "audio/mp4";
    if (ext.includes("jpg") || ext.includes("jpeg") || url.includes(".jpg"))
        return "image/jpeg";
    if (ext.includes("png") || url.includes(".png"))
        return "image/png";
    return "video/mp4";
}
async function pipeRemoteMedia(reqRange, remoteUrl, format, filename, res) {
    const parsed = assertPublicMediaUrl(remoteUrl);
    const fetchHeaders = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
        Accept: "*/*",
        "Accept-Encoding": "identity",
        Referer: `${parsed.protocol}//${parsed.hostname}/`
    };
    if (reqRange)
        fetchHeaders["Range"] = reqRange;
    let upstream;
    try {
        upstream = await safeFetch(parsed.toString(), { headers: fetchHeaders, signal: AbortSignal.timeout(20000) });
    }
    catch (e) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(403).json({ success: false, error: e?.message || "مصدر الوسائط غير مسموح به لأسباب أمنية." });
        return;
    }
    if (!upstream.ok || !upstream.body) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(upstream.status || 502).json({
            success: false,
            error: `تعذر جلب الوسائط من المصدر (كود ${upstream.status}).`
        });
        return;
    }
    const contentType = (upstream.headers.get("content-type") || guessMimeFromUrl(parsed.pathname, format)).split(";")[0];
    // Guard against HTML error/login pages masquerading as media
    if (contentType.includes("text/html") || contentType.includes("application/json")) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        res.status(502).json({
            success: false,
            error: "المصدر رجّع صفحة ويب بدلاً من ملف وسائط. قد يكون المحتوى خاصاً أو انتهت صلاحية الرابط."
        });
        return;
    }
    const isAudio = contentType.startsWith("audio");
    const isImage = contentType.startsWith("image");
    const ext = isImage ? "jpg" : isAudio ? (contentType.includes("mp4") ? "m4a" : "mp3") : "mp4";
    const { asciiName, unicodeName } = (0, youtubeDirect_1.sanitizeFilename)(filename, ext);
    res.status(upstream.status);
    res.setHeader("Content-Type", contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Disposition", `${reqRange || upstream.status === 206 ? "inline" : "attachment"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(unicodeName)}`);
    res.setHeader("Cache-Control", "no-cache");
    const contentLength = upstream.headers.get("content-length");
    if (contentLength)
        res.setHeader("Content-Length", contentLength);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange)
        res.setHeader("Content-Range", contentRange);
    const nodeStream = stream_1.Readable.fromWeb(upstream.body);
    nodeStream.on("error", (err) => {
        console.error("Remote media pipeline error:", err?.message);
        if (!res.headersSent) {
            res.status(500).json({ success: false, error: "انقطع تدفق الوسائط أثناء النقل." });
        }
    });
    nodeStream.pipe(res);
}
