import React, { useState } from "react";
import type { VideoDetails } from "../types";

interface VideoPreviewCardProps {
  video: VideoDetails;
}

export const VideoPreviewCard: React.FC<VideoPreviewCardProps> = ({ video }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const isYouTube = !video.platform || video.platform === "youtube";

  return (
    <div className="w-full bg-[#101014] border border-[#26262e] rounded-2xl overflow-hidden shadow-xl mb-6">
      <div className="relative aspect-video w-full bg-black">
        {isPlaying ? (
          <iframe
            src={`https://www.youtube.com/embed/${video.id}?autoplay=1`}
            title={video.title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <>
            <img
              src={video.thumbnail}
              alt={video.title}
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent flex items-center justify-center">
              {isYouTube ? (
                <button
                  onClick={() => setIsPlaying(true)}
                  className="w-16 h-16 rounded-full bg-gold-grad text-black flex items-center justify-center shadow-2xl shadow-yellow-500/30 transition-transform hover:scale-110 active:scale-95"
                  title="معاينة الفيديو"
                >
                  <i className="fa-solid fa-play text-2xl mr-1"></i>
                </button>
              ) : (
                <a
                  href={video.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-3 rounded-full bg-gold-grad text-black flex items-center gap-2 font-bold shadow-2xl shadow-yellow-500/30 transition-transform hover:scale-110"
                  title="فتح المصدر الأصلي"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                  <span>فتح المصدر</span>
                </a>
              )}
            </div>

            <div className="absolute bottom-3 left-3 bg-black/80 backdrop-blur-md px-2.5 py-1 rounded-md text-xs font-bold text-white flex items-center gap-1.5 border border-[#26262e]">
              <i className="fa-regular fa-clock text-yellow-400"></i>
              <span>{video.duration}</span>
            </div>

            <div className="absolute top-3 right-3 bg-gold-grad px-2.5 py-1 rounded-md text-xs font-black text-black flex items-center gap-1.5 shadow-md">
              <i className="fa-solid fa-bolt"></i>
              <span>{isYouTube ? "مباشر بدون وسيط" : (video.platform || "منصة")}</span>
            </div>
          </>
        )}
      </div>

      <div className="p-4 sm:p-5">
        <h2 className="text-lg md:text-xl font-bold text-white leading-snug mb-2 line-clamp-2">
          {video.title}
        </h2>

        <div className="flex flex-wrap items-center gap-4 text-xs md:text-sm text-zinc-400">
          <div className="flex items-center gap-1.5 font-semibold text-zinc-200">
            <i className="fa-solid fa-circle-user text-yellow-400"></i>
            <span>{video.author}</span>
          </div>

          {video.views > 0 && (
            <div className="flex items-center gap-1.5">
              <i className="fa-regular fa-eye"></i>
              <span>{Number(video.views).toLocaleString("ar-EG")} مشاهدة</span>
            </div>
          )}

          {video.uploadDate && (
            <div className="flex items-center gap-1.5 text-zinc-500">
              <i className="fa-regular fa-calendar"></i>
              <span>{video.uploadDate}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
