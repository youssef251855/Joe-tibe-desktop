import React, { useState } from "react";
import type { PlaylistDetails } from "../types";
import { apiUrl } from "../lib/apiBase";
import { saveFile } from "../lib/downloader";

interface PlaylistPanelProps {
  playlist: PlaylistDetails;
  onOpenVideo: (url: string) => void;
  onClose: () => void;
}

const MAX_BULK = 30;

export const PlaylistPanel: React.FC<PlaylistPanelProps> = ({ playlist, onOpenVideo, onClose }) => {
  const [format, setFormat] = useState<"mp3" | "720p">("mp3");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const triggerDownload = (downloadUrl: string, fileName: string) => saveFile(downloadUrl, fileName);

  const downloadAll = async () => {
    const items = playlist.items.slice(0, MAX_BULK);
    setBusy(true);
    setProgress({ done: 0, total: items.length });
    const ext = format === "mp3" ? "mp3" : "mp4";
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      try {
        const q = new URLSearchParams({ url: it.url, format, title: it.title || "video" }).toString();
        const r = await fetch(apiUrl(`/api/download?${q}`), { signal: AbortSignal.timeout(30000) });
        const j = await r.json().catch(() => null);
        if (r.ok && j?.download_url) {
          await triggerDownload(apiUrl(j.download_url), `${(it.title || "video").substring(0, 50)}.${ext}`);
        }
      } catch {
        // skip failed item
      }
      setProgress({ done: i + 1, total: items.length });
      await new Promise((res) => setTimeout(res, 900));
    }
    setBusy(false);
  };

  return (
    <div className="w-full bg-[#101014] border border-[#26262e] rounded-2xl p-4 sm:p-6 mb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#26262e]">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-list-ul text-yellow-400"></i>
            <span className="truncate">{playlist.title}</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-1">
            {playlist.items.length} من {playlist.itemCount} فيديو {playlist.author ? `• ${playlist.author}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#050506] p-1 rounded-xl border border-[#26262e]">
            <button
              onClick={() => setFormat("mp3")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                format === "mp3" ? "bg-gold-grad text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              <i className="fa-solid fa-music ml-1"></i> MP3
            </button>
            <button
              onClick={() => setFormat("720p")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                format === "720p" ? "bg-gold-grad text-black" : "text-zinc-400 hover:text-white"
              }`}
            >
              <i className="fa-solid fa-video ml-1"></i> MP4
            </button>
          </div>

          <button
            onClick={downloadAll}
            disabled={busy}
            className="flex items-center gap-2 bg-gold-grad hover:brightness-105 text-black text-xs font-black px-4 py-2.5 rounded-xl shadow-lg shadow-yellow-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {busy ? (
              <>
                <i className="fa-solid fa-circle-notch fa-spin"></i>
                <span>{progress.done}/{progress.total}</span>
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-down"></i>
                <span>تنزيل الكل</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="grid place-items-center w-9 h-9 rounded-lg bg-[#050506] border border-[#26262e] text-zinc-400 hover:text-white transition-colors"
            title="إغلاق"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>

      {busy && (
        <div className="w-full h-1.5 rounded-full bg-[#050506] border border-[#26262e] mb-4 overflow-hidden">
          <div
            className="h-full bg-gold-grad transition-all"
            style={{ width: `${Math.round((progress.done / Math.max(1, progress.total)) * 100)}%` }}
          ></div>
        </div>
      )}

      <p className="text-[11px] text-zinc-500 mb-3">
        <i className="fa-solid fa-circle-info ml-1"></i>
        التنزيل الجماعي محدود بـ {MAX_BULK} عنصراً لحماية المتصفح؛ قد يطلب المتصفح السماح بالتنزيلات المتعددة.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
        {playlist.items.map((it, idx) => (
          <div
            key={it.id}
            className="flex items-center gap-3 p-2.5 rounded-xl bg-[#050506] border border-[#26262e] hover:border-zinc-600 transition-all"
          >
            <span className="text-[11px] text-zinc-600 font-bold w-6 shrink-0 text-center">{idx + 1}</span>
            <button onClick={() => onOpenVideo(it.url)} className="relative w-24 aspect-video rounded-lg overflow-hidden bg-black shrink-0">
              {it.thumbnail ? (
                <img src={it.thumbnail} alt={it.title} className="w-full h-full object-cover" loading="lazy" />
              ) : null}
              {it.duration && (
                <span className="absolute bottom-1 left-1 bg-black/80 px-1.5 rounded text-[10px] font-bold text-white">
                  {it.duration}
                </span>
              )}
            </button>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug">{it.title}</h4>
              <p className="text-[11px] text-zinc-500 truncate mt-0.5">{it.author}</p>
            </div>
            <button
              onClick={() => onOpenVideo(it.url)}
              className="shrink-0 grid place-items-center w-9 h-9 rounded-lg bg-[#1c1c22] hover:bg-gold-grad hover:text-black text-zinc-300 transition-colors"
              title="فتح وتجهيز الروابط"
            >
              <i className="fa-solid fa-download text-sm"></i>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
