// Streaming helpers for Cloudflare Workers (pass-through of the upstream body, Range supported).

const BLOCKED_HOSTS = new Set(["localhost", "metadata.google.internal", "169.254.169.254", "metadata"]);

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map((n) => parseInt(n, 10));
  if (p.length !== 4 || p.some((n) => Number.isNaN(n))) return false;
  const [a, b] = p;
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 192 && b === 168) || (a === 172 && b >= 16 && b <= 31) || (a === 100 && b >= 64 && b <= 127);
}
function isPrivateIPv6(ip: string): boolean {
  const l = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (l === "::1" || l.startsWith("fc") || l.startsWith("fd") || l.startsWith("fe80")) return true;
  const v4 = l.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return v4 ? isPrivateIPv4(v4[1]) : false;
}

export function assertPublicMediaUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new Error("رابط الوسائط غير صالح."); }
  if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("يُسمح فقط بروابط HTTP/HTTPS.");
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(h) || h.endsWith(".localhost") || h.endsWith(".internal")) throw new Error("النطاق غير مسموح به.");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h) && isPrivateIPv4(h)) throw new Error("عنوان غير مسموح به.");
  if (h.includes(":") && isPrivateIPv6(h)) throw new Error("عنوان غير مسموح به.");
  return u;
}

/** fetch that re-validates every redirect hop (SSRF guard). */
async function safeFetch(url: string, init: RequestInit, maxRedirects = 5): Promise<Response> {
  let current = url;
  for (let i = 0; i <= maxRedirects; i++) {
    const parsed = assertPublicMediaUrl(current);
    const r = await fetch(parsed.toString(), { ...init, redirect: "manual" });
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location");
      if (!loc) return r;
      current = new URL(loc, parsed).toString();
      continue;
    }
    return r;
  }
  throw new Error("عدد التحويلات (redirects) أكبر من المسموح.");
}

export function sanitizeFilename(title: string, ext: string): { ascii: string; unicode: string } {
  const base = (title || "JoeTube").replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "JoeTube";
  const ascii = base.replace(/[^\x20-\x7e]/g, "").replace(/\s+/g, " ").trim() || "JoeTube_Media";
  return { ascii: `${ascii}.${ext}`, unicode: `${base}.${ext}` };
}

export function contentDisposition(title: string, ext: string, inline = false): string {
  const { ascii, unicode } = sanitizeFilename(title, ext);
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(unicode)}`;
}

export function extForMime(mime: string, fallback = "mp4"): string {
  const m = mime.toLowerCase();
  if (m === "audio/mp4" || m === "audio/m4a") return "m4a";
  if (m === "audio/webm") return "webm";
  if (m === "audio/mpeg") return "mp3";
  if (m.startsWith("image/")) return "jpg";
  if (m === "video/webm") return "webm";
  return fallback;
}

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function jsonErr(status: number, error: string): Response {
  return new Response(JSON.stringify({ success: false, error }), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

/** Stream a googlevideo URL. YouTube throttles un-ranged requests, so we always ask for a range upstream. */
export async function pipeGoogleVideo(req: Request, streamUrl: string, mime: string, title: string, totalHint?: number): Promise<Response> {
  const clientRange = req.headers.get("Range");
  const upstream = await fetch(streamUrl, {
    headers: { "User-Agent": UA, Accept: "*/*", Range: clientRange || "bytes=0-" },
    signal: req.signal
  });
  if (!upstream.ok || !upstream.body) {
    return jsonErr(upstream.status === 403 ? 403 : 502, `رفض يوتيوب تدفق الملف (كود ${upstream.status}). أعد المحاولة أو اختر صيغة أخرى.`);
  }

  const headers = new Headers();
  headers.set("Content-Type", mime);
  headers.set("Accept-Ranges", "bytes");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Disposition", contentDisposition(title, extForMime(mime), !!clientRange));

  const cr = upstream.headers.get("Content-Range");
  const cl = upstream.headers.get("Content-Length");
  if (clientRange) {
    if (cr) headers.set("Content-Range", cr);
    if (cl) headers.set("Content-Length", cl);
    return new Response(upstream.body, { status: upstream.status, headers });
  }
  // No client Range: upstream answered 206 for "bytes=0-" — present it as a normal 200 download.
  const total = cr ? Number((cr.match(/\/(\d+)$/) || [])[1]) : Number(cl) || totalHint;
  if (total) headers.set("Content-Length", String(total));
  return new Response(upstream.body, { status: 200, headers });
}

/** Proxy a TikTok / Facebook / Instagram / X CDN file. */
export async function pipeRemoteMedia(req: Request, remoteUrl: string, format: string, title: string): Promise<Response> {
  const parsed = assertPublicMediaUrl(remoteUrl);
  const range = req.headers.get("Range");
  const headers: Record<string, string> = { "User-Agent": UA, Accept: "*/*", Referer: `${parsed.protocol}//${parsed.hostname}/` };
  if (range) headers["Range"] = range;

  let upstream: Response;
  try {
    upstream = await safeFetch(parsed.toString(), { headers, signal: req.signal });
  } catch (e: any) {
    return jsonErr(403, e?.message || "مصدر الوسائط غير مسموح به لأسباب أمنية.");
  }
  if (!upstream.ok || !upstream.body) return jsonErr(upstream.status || 502, `تعذر جلب الوسائط من المصدر (كود ${upstream.status}).`);

  let ct = (upstream.headers.get("content-type") || "").split(";")[0].trim();
  if (!ct || ct === "application/octet-stream") {
    const f = format.toLowerCase();
    ct = f.includes("mp3") ? "audio/mpeg" : f.includes("m4a") ? "audio/mp4" : f.includes("jpg") ? "image/jpeg" : "video/mp4";
  }
  if (ct.includes("text/html") || ct.includes("application/json")) {
    return jsonErr(502, "المصدر رجّع صفحة ويب بدلاً من ملف وسائط. قد يكون المحتوى خاصاً أو انتهت صلاحية الرابط.");
  }

  const out = new Headers();
  out.set("Content-Type", ct);
  out.set("Accept-Ranges", "bytes");
  out.set("X-Content-Type-Options", "nosniff");
  out.set("Cache-Control", "no-store");
  out.set("Content-Disposition", contentDisposition(title || "JoeTube_Media", extForMime(ct), !!range || upstream.status === 206));
  const cl = upstream.headers.get("content-length");
  if (cl && !upstream.headers.get("content-encoding")) out.set("Content-Length", cl);
  const cr = upstream.headers.get("content-range");
  if (cr) out.set("Content-Range", cr);
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export async function headRemote(remoteUrl: string): Promise<Response> {
  assertPublicMediaUrl(remoteUrl);
  const r = await safeFetch(remoteUrl, { method: "HEAD", headers: { "User-Agent": UA } }).catch(() => null);
  const ct = (r?.headers.get("content-type") || "video/mp4").split(";")[0];
  return new Response(null, { status: r?.ok ? 200 : 502, headers: { "Content-Type": ct, "Accept-Ranges": "bytes", "Cache-Control": "no-store" } });
}
