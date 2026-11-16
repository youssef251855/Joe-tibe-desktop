import React from "react";
import type { HistoryItem } from "../types";

interface DownloadHistoryProps {
  history: HistoryItem[];
  onClear: () => void;
  onRemove: (id: string) => void;
}

export const DownloadHistory: React.FC<DownloadHistoryProps> = ({ history, onClear, onRemove }) => {
  if (history.length === 0) return null;

  return (
    <div id="history" className="w-full bg-[#101014] border border-[#26262e] rounded-2xl p-4 sm:p-6 mb-12">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <i className="fa-solid fa-clock-rotate-left text-yellow-400"></i>
          <span>سجل التحميلات الأخيرة ({history.length})</span>
        </h3>

        <button
          onClick={onClear}
          className="text-xs text-zinc-500 hover:text-yellow-400 transition-colors flex items-center gap-1 font-semibold"
        >
          <i className="fa-solid fa-trash-can text-[11px]"></i>
          <span>مسح السجل</span>
        </button>
      </div>

      <div className="space-y-2.5">
        {history.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between p-3 rounded-xl bg-[#050506] border border-[#26262e] hover:border-zinc-600 transition-all gap-3"
          >
            <div className="flex items-center gap-3 overflow-hidden">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-14 h-10 object-cover rounded-lg shrink-0"
              />
              <div className="overflow-hidden">
                <h4 className="text-sm font-bold text-white truncate">{item.title}</h4>
                <div className="flex items-center gap-2 text-xs text-zinc-500 mt-0.5">
                  <span className="text-yellow-400 font-semibold">{item.quality}</span>
                  <span>•</span>
                  <span>{new Date(item.downloadedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <a
                href={item.downloadUrl}
                download
                className="p-2 rounded-lg bg-gold-grad hover:brightness-105 text-black text-xs font-bold transition-colors flex items-center gap-1.5"
                title="إعادة التنزيل"
              >
                <i className="fa-solid fa-download"></i>
                <span className="hidden sm:inline">تحميل</span>
              </a>

              <button
                onClick={() => onRemove(item.id)}
                className="p-2 rounded-lg text-zinc-500 hover:text-yellow-400 hover:bg-[#141419] transition-colors"
                title="حذف من السجل"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
