import React from "react";
import type { SearchResultItem } from "../types";

interface SearchResultsProps {
  results: SearchResultItem[];
  onSelect: (url: string) => void;
  isLoading: boolean;
}

export const SearchResults: React.FC<SearchResultsProps> = ({ results, onSelect, isLoading }) => {
  if (results.length === 0) return null;

  return (
    <div className="w-full mb-10">
      <div className="flex items-center justify-between mb-4 px-1">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <i className="fa-solid fa-list-ul text-yellow-400"></i>
          <span>نتائج البحث ({results.length})</span>
        </h3>
        <span className="text-xs text-zinc-500">انقر على أي مقطع لفتحه وتجهيز روابطه</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((item) => (
          <div
            key={item.id}
            onClick={() => onSelect(item.url)}
            className="group bg-[#101014] border border-[#26262e] hover:border-yellow-400/60 rounded-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-yellow-500/10 flex flex-col"
          >
            <div className="relative aspect-video w-full bg-black overflow-hidden">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>

              <div className="absolute bottom-2 left-2 bg-black/80 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-bold text-white border border-[#26262e]">
                {item.duration}
              </div>

              <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-gold-grad text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg">
                <i className="fa-solid fa-arrow-down text-xs"></i>
              </div>
            </div>

            <div className="p-3.5 flex flex-col flex-grow justify-between">
              <div>
                <h4 className="text-sm font-bold text-white line-clamp-2 leading-snug group-hover:text-yellow-300 transition-colors mb-2">
                  {item.title}
                </h4>
                <p className="text-xs text-zinc-500 font-medium flex items-center gap-1.5 mb-2">
                  <i className="fa-solid fa-user-circle text-zinc-600 text-[11px]"></i>
                  <span>{item.author}</span>
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-2 border-t border-[#26262e] mt-auto">
                {item.views > 0 && (
                  <span>{Number(item.views).toLocaleString("ar-EG")} مشاهدة</span>
                )}
                {item.ago && <span>{item.ago}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
