// حفظ الملف: في تطبيق Android ينزل مباشرة من يوتيوب/المنصة إلى الجهاز، وفي المتصفح يبقى السلوك القديم.
import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { resolveCached } from "../native/api";
import { extractVideoId } from "../native/youtube";

export const isNativeApp = () => Capacitor.isNativePlatform();

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function cleanName(name: string): string {
  return name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 100) || "JoeTube";
}

function extFromMime(mime: string | undefined, fallback: string): string {
  const m = (mime || "").toLowerCase();
  if (m === "audio/mp4" || m === "audio/m4a") return "m4a";
  if (m === "audio/webm" || m === "video/webm") return "webm";
  if (m === "audio/mpeg") return "mp3";
  if (m.startsWith("video/")) return "mp4";
  return fallback;
}

function browserDownload(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/** يعيد وصفًا لمكان الحفظ (في التطبيق) أو undefined (في المتصفح). */
export async function saveFile(downloadUrl: string, fileName: string, onProgress?: (percent: number) => void): Promise<string | undefined> {
  if (!isNativeApp()) {
    browserDownload(downloadUrl, fileName);
    return undefined;
  }

  const u = new URL(downloadUrl, window.location.href);
  let remote = u.href;
  let headers: Record<string, string> = { "User-Agent": UA };
  let mime: string | undefined;
  let totalHint: number | undefined;

  if (u.pathname === "/api/stream") {
    const idOrUrl = u.searchParams.get("id") || u.searchParams.get("url") || "";
    const format = (u.searchParams.get("format") || "m4a").toLowerCase();
    if (/^https?:\/\//i.test(idOrUrl)) {
      // تيك توك / فيسبوك / إنستغرام / X
      remote = idOrUrl;
      headers = { "User-Agent": UA, Referer: `${new URL(idOrUrl).origin}/` };
    } else {
      const videoId = extractVideoId(idOrUrl) || idOrUrl;
      const r = await resolveCached(videoId, format);
      remote = r.url;
      mime = r.mimeType;
      totalHint = r.contentLength;
      // يوتيوب يخنق الطلبات بلا Range، لذلك نطلب النطاق كاملًا صراحةً.
      headers = { "User-Agent": UA, Accept: "*/*", Range: "bytes=0-" };
    }
  }

  const dot = fileName.lastIndexOf(".");
  const base = cleanName(dot > 0 ? fileName.slice(0, dot) : fileName);
  const ext = extFromMime(mime, dot > 0 ? fileName.slice(dot + 1) : "mp4");
  const relPath = `JoeTube/${base}.${ext}`;

  return chunkedDownload(remote, headers, relPath, totalHint, onProgress);
}

const CHUNK = 5 * 1024 * 1024;

function b64Bytes(b64: string): number {
  const pad = b64.endsWith("==") ? 2 : b64.endsWith("=") ? 1 : 0;
  return Math.floor((b64.length * 3) / 4) - pad;
}

/** تنزيل على دفعات (Range) وكتابة كل دفعة في الملف؛ يتفادى خنق يوتيوب ويعطي أخطاء واضحة. */
async function chunkedDownload(
  remote: string,
  headers: Record<string, string>,
  relPath: string,
  totalHint: number | undefined,
  onProgress?: (percent: number) => void
): Promise<string> {
  await Filesystem.requestPermissions().catch(() => undefined);

  let dir: Directory = Directory.Documents;
  let offset = 0;
  let total = totalHint || 0;
  let first = true;
  const { Range: _ignored, ...baseHeaders } = headers as Record<string, string>;

  for (;;) {
    let r: any;
    try {
      r = await CapacitorHttp.request({
        url: remote,
        method: "GET",
        headers: { ...baseHeaders, Range: `bytes=${offset}-${offset + CHUNK - 1}` },
        responseType: "blob",
        connectTimeout: 20000,
        readTimeout: 60000,
        shouldEncodeUrlParams: false
      });
    } catch (e: any) {
      throw new Error(`فشل الاتصال بمصدر الملف: ${e?.message || e}`);
    }

    if (r.status === 416) break;
    if (r.status !== 200 && r.status !== 206) {
      throw new Error(`رفض المصدر التنزيل (HTTP ${r.status}). أعد المحاولة أو اختر جودة أخرى.`);
    }

    const data: string = typeof r.data === "string" ? r.data : "";
    if (!data) throw new Error("وصلت دفعة فارغة من المصدر.");

    const partial = r.status === 206;
    if (partial) {
      const hk = Object.keys(r.headers || {}).find((k) => k.toLowerCase() === "content-range");
      const m = hk ? String(r.headers[hk]).match(/\/(\d+)$/) : null;
      if (m) total = Number(m[1]);
    }

    try {
      if (first) {
        try {
          await Filesystem.writeFile({ path: relPath, directory: dir, data, recursive: true });
        } catch {
          dir = Directory.External; // بعض إصدارات أندرويد ترفض Documents
          await Filesystem.writeFile({ path: relPath, directory: dir, data, recursive: true });
        }
        first = false;
      } else {
        await Filesystem.appendFile({ path: relPath, directory: dir, data });
      }
    } catch (e: any) {
      throw new Error(`تعذر الكتابة على الجهاز: ${e?.message || e}`);
    }

    const got = b64Bytes(data);
    offset += got;
    if (total > 0) onProgress?.(Math.min(100, Math.round((offset / total) * 100)));

    if (!partial) break; // المصدر أعاد الملف كاملًا
    if (got === 0 || (total > 0 && offset >= total) || (total === 0 && got < CHUNK)) break;
  }

  onProgress?.(100);
  return dir === Directory.Documents ? `Documents/${relPath}` : `Android/data/com.joetube.app/files/${relPath}`;
}
