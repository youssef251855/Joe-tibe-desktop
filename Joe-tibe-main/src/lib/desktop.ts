// Desktop (Electron) integration: downloads are done locally by yt-dlp + ffmpeg through the
// app's own server (/api/dl/*), which gives real quality choices, real MP3 and Instagram stories.
import type { QualityOption, VideoDetails } from "../types";
import { apiUrl } from "./apiBase";

export const isDesktopApp = (): boolean => typeof navigator !== "undefined" && /\bElectron\//i.test(navigator.userAgent);

export const isInstagramUrl = (u: string) => /instagram\.com|instagr\.am/i.test(u);

interface DesktopInfo {
  title: string;
  duration: number;
  heights: number[];
  sizes: Record<string, number>;
  audioSize: number;
  id: string;
  thumbnail: string;
  uploader: string;
  uploaderUrl: string;
  views: number;
  extractor: string;
  count: number;
}

const mb = (b?: number) => (b ? `${(b / 1048576).toFixed(b >= 1e8 ? 0 : 1)} MB` : undefined);

const heightLabel = (h: number) =>
  h >= 4320 ? "8K" : h >= 2160 ? "4K" : h >= 1440 ? "2K" : h >= 1080 ? "Full HD" : h >= 720 ? "HD" : "";

async function getJson(path: string, init?: RequestInit, timeoutMs = 70000): Promise<any> {
  const r = await fetch(apiUrl(path), { ...init, signal: AbortSignal.timeout(timeoutMs) });
  const j = await r.json().catch(() => null);
  if (!r.ok || !j?.success) throw new Error(j?.error || `تعذر الاتصال بمحرك التحميل (HTTP ${r.status}).`);
  return j;
}

export async function fetchDesktopInfo(url: string): Promise<DesktopInfo> {
  return (await getJson(`/api/dl/info?url=${encodeURIComponent(url)}`)).data as DesktopInfo;
}

export function buildDesktopQualities(info: Pick<DesktopInfo, "heights" | "sizes" | "audioSize">): QualityOption[] {
  const list: QualityOption[] = [
    { quality: "صوت MP3 (تحويل حقيقي)", format: "mp3", formatCode: "mp3", hasAudio: true, hasVideo: false, sizeEstimate: mb(info.audioSize), directStreamAvailable: true },
    { quality: "صوت M4A (AAC أصلي)", format: "m4a", formatCode: "m4a", hasAudio: true, hasVideo: false, sizeEstimate: mb(info.audioSize), directStreamAvailable: true }
  ];
  if (!info.heights.length) {
    list.push({ quality: "فيديو بأفضل جودة متاحة", format: "mp4", formatCode: "4320", hasAudio: true, hasVideo: true, directStreamAvailable: true });
  } else {
    for (const h of info.heights) {
      const label = heightLabel(h);
      list.push({
        quality: `فيديو ${h}p${label ? ` ${label}` : ""} (صوت مدمج)`,
        format: "mp4",
        formatCode: String(h),
        hasAudio: true,
        hasVideo: true,
        sizeEstimate: mb(info.sizes?.[String(h)]),
        directStreamAvailable: true
      });
    }
  }
  return list;
}

/** Real qualities for a YouTube video (null when the probe fails: keep the default list). */
export async function loadDesktopQualities(videoUrl: string): Promise<QualityOption[] | null> {
  try {
    return buildDesktopQualities(await fetchDesktopInfo(videoUrl));
  } catch {
    return null;
  }
}

/** Full details for Instagram (posts / reels / stories) straight from yt-dlp. */
export async function loadDesktopDetails(url: string): Promise<VideoDetails> {
  const info = await fetchDesktopInfo(url);
  const secs = Math.round(info.duration || 0);
  const duration = secs ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` : "—";
  return {
    id: info.id ? `${info.extractor || "ig"}_${info.id}` : `ig_${Date.now()}`,
    url,
    title: (info.count > 1 ? `ستوريهات ${info.uploader || ""} (${info.count})` : info.title) || "Instagram",
    author: info.uploader || "Instagram",
    authorUrl: info.uploaderUrl || undefined,
    thumbnail: info.thumbnail || "",
    duration,
    durationSeconds: secs,
    views: info.views || 0,
    platform: "instagram",
    qualities: buildDesktopQualities(info)
  };
}

const STAGE_TEXT: Record<string, string> = {
  download: "جاري التحميل",
  merge: "دمج الصوت مع الفيديو",
  convert: "تحويل الصوت",
  process: "معالجة الملف"
};

export async function runDesktopDownload(
  url: string,
  option: QualityOption,
  onProgress?: (percent: number, note: string) => void
): Promise<{ fileName: string; file: string; count: number }> {
  const kind = option.hasVideo ? "video" : "audio";
  const body =
    kind === "video"
      ? { url, kind, height: parseInt(option.formatCode, 10) || 4320 }
      : { url, kind, audioFormat: option.formatCode === "m4a" ? "m4a" : "mp3" };

  const started = await getJson("/api/dl/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  }, 15000);

  const id = String(started.id);
  const deadline = Date.now() + 3 * 60 * 60 * 1000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 700));
    const s = (await getJson(`/api/dl/status?id=${encodeURIComponent(id)}`, undefined, 15000)).data;
    if (s.status === "done") return { fileName: s.fileName || "", file: s.file || "", count: s.count || 1 };
    if (s.status === "error" || s.status === "cancelled") throw new Error(s.error || "فشل التحميل.");
    const extra = [s.speed, s.eta && s.eta !== "NA" ? `متبقي ${s.eta}` : ""].filter((x) => x && x !== "NA").join(" • ");
    onProgress?.(Math.round(s.percent || 0), `${STAGE_TEXT[s.stage] || "جاري العمل"}${extra ? " • " + extra : ""}`);
  }
  throw new Error("استغرق التحميل وقتًا طويلًا جدًا.");
}
