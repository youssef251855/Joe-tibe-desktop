import React, { useState } from "react";
import type { QualityOption, VideoDetails } from "../types";

interface DownloadOptionsProps {
  video: VideoDetails;
  onDownloadStart: (opt: QualityOption) => Promise<void>;
  isDownloading: boolean;
  activeOption: QualityOption | null;
}

export const DownloadOptions: React.FC<DownloadOptionsProps> = ({
  video,
  onDownloadStart,
  isDownloading,
  activeOption
}) => {
  const [filter, setFilter] = useState<"all" | "audio" | "video">("all");

  const qualities = Array.isArray(video.qualities) ? video.qualities : [];

  const filteredQualities = qualities.filter((q) => {
    if (filter === "audio") return !q.hasVideo;
    if (filter === "video") return q.hasVideo;
    return true;
  });

  return (
    <div className="w-full bg-[#101014] border border-[#26262e] rounded-2xl p-4 sm:p-6 shadow-xl mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#26262e]">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-cloud-arrow-down text-yellow-400"></i>
            <span>خيارات التحميل المباشر</span>
          </h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            تدفق حقيقي عبر سيرفرلس Express مباشرة بدون وسيط
          </p>
        </div>

        <div className="flex items-center gap-1 bg-[#050506] p-1 rounded-xl border border-[#26262e] self-start sm:self-auto">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filter === "all" ? "bg-gold-grad text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            الكل
          </button>
          <button
            onClick={() => setFilter("audio")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filter === "audio" ? "bg-gold-grad text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            <i className="fa-solid fa-music text-xs"></i>
            <span>صوت MP3</span>
          </button>
          <button
            onClick={() => setFilter("video")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              filter === "video" ? "bg-gold-grad text-black" : "text-zinc-400 hover:text-white"
            }`}
          >
            <i className="fa-solid fa-video text-xs"></i>
            <span>فيديو MP4</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filteredQualities.length === 0 && (
          <div className="col-span-full text-center py-6 text-sm text-zinc-500">
            <i className="fa-solid fa-circle-info ml-2"></i>
            لا توجد صيغ متاحة لهذا المحتوى حالياً.
          </div>
        )}
        {filteredQualities.map((opt) => {
          const isThisActive = isDownloading && activeOption?.formatCode === opt.formatCode;
          const isAudio = !opt.hasVideo;

          return (
            <div
              key={opt.formatCode}
              className={`relative flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                isThisActive
                  ? "bg-yellow-400/10 border-yellow-400/70 shadow-lg shadow-yellow-500/20"
                  : "bg-[#050506] border-[#26262e] hover:border-zinc-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg shrink-0 border ${
                    isAudio
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-yellow-400/10 text-yellow-400 border-yellow-400/20"
                  }`}
                >
                  <i className={`fa-solid ${isAudio ? "fa-music" : "fa-film"}`}></i>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{opt.quality}</span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        opt.format === "mp3"
                          ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                          : opt.format === "m4a"
                          ? "bg-emerald-400/20 text-emerald-300 border border-emerald-400/30"
                          : "bg-yellow-400/20 text-yellow-200 border border-yellow-400/30"
                      }`}
                    >
                      {opt.format}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
                    {opt.sizeEstimate && (
                      <span className="font-medium text-zinc-400">
                        <i className="fa-solid fa-hard-drive text-[10px] ml-1 text-zinc-500"></i>
                        {opt.sizeEstimate}
                      </span>
                    )}
                    <span className="text-yellow-400 font-semibold text-[11px] flex items-center gap-1">
                      <i className="fa-solid fa-check text-[10px]"></i>
                      <span>تدفق مباشر</span>
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onDownloadStart(opt)}
                disabled={isDownloading}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${
                  isThisActive
                    ? "bg-gold-grad text-black animate-pulse"
                    : "bg-[#1c1c22] hover:bg-gold-grad hover:text-black text-zinc-200"
                }`}
              >
                {isThisActive ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i>
                    <span>جاري التحميل...</span>
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-download"></i>
                    <span>تحميل مباشر</span>
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
