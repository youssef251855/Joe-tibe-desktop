import React, { useState, useRef, useEffect } from 'react';
import type { VideoDetails } from '../types';

export interface FloatingMiniPlayerProps {
  videoDetails: VideoDetails | null;
  audioUrl?: string | null;
  onClose: () => void;
}

export const FloatingMiniPlayer: React.FC<FloatingMiniPlayerProps> = ({
  videoDetails,
  audioUrl,
  onClose
}) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(180);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.loop = isLooping;
    }
  }, [isLooping]);

  if (!videoDetails) return null;

  const togglePlay = () => {
    if (!audioRef.current) {
      setIsPlaying(!isPlaying);
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {
        setIsPlaying(!isPlaying);
      });
    }
  };

  const cycleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5, 2.0];
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    setPlaybackSpeed(speeds[nextIdx]);
  };

  const formatSecs = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  // Sound source (if direct stream available or simulated preview)
  const soundSrc = audioUrl || videoDetails.musicInfo?.playUrl || '';

  return (
    <div
      className={`fixed z-40 transition-all duration-300 ${
        isMinimized
          ? 'bottom-20 right-4 w-44'
          : 'bottom-20 left-4 right-4 max-w-md mx-auto'
      }`}
    >
      <div className="bg-gray-900/95 backdrop-blur-md text-white p-3 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-2 animate-fade-in-up">
        {/* Audio Element */}
        {soundSrc && (
          <audio
            ref={audioRef}
            src={soundSrc}
            onTimeUpdate={() => {
              if (audioRef.current) {
                setCurrentTime(audioRef.current.currentTime);
                if (audioRef.current.duration) setDuration(audioRef.current.duration);
              }
            }}
            onEnded={() => setIsPlaying(false)}
          />
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
              <img
                src={videoDetails.thumbnail}
                alt=""
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              {isPlaying && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-0.5">
                  <span className="w-1 bg-[#fce116] h-3 animate-pulse rounded-full"></span>
                  <span className="w-1 bg-[#fce116] h-5 animate-pulse delay-75 rounded-full"></span>
                  <span className="w-1 bg-[#fce116] h-2 animate-pulse delay-150 rounded-full"></span>
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-extrabold text-xs text-white truncate text-right" dir="rtl">
                {videoDetails.title}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-gray-400">
                <span className="text-[#fce116] font-bold">المشغل العائم</span>
                <span>•</span>
                <span>{formatSecs(currentTime)} / {formatSecs(duration)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-gray-300 transition-colors"
              title={isMinimized ? 'تكبير' : 'تصغير'}
            >
              <i className={`fa-solid ${isMinimized ? 'fa-up-right-and-down-left-from-center' : 'fa-minus'} text-xs`}></i>
            </button>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/10 hover:bg-red-500/30 hover:text-red-400 flex items-center justify-center text-gray-300 transition-colors"
              title="إغلاق المشغل"
            >
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>
        </div>

        {/* Controls (hidden if minimized) */}
        {!isMinimized && (
          <div className="space-y-2 pt-1 border-t border-white/10">
            {/* Progress Bar */}
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={currentTime}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setCurrentTime(val);
                  if (audioRef.current) audioRef.current.currentTime = val;
                }}
                className="w-full h-1 bg-white/20 rounded-lg accent-[#fce116] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between text-xs">
              {/* Speed & Loop */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={cycleSpeed}
                  className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-[10px] font-bold text-[#fce116] transition-colors"
                  title="سرعة التشغيل"
                >
                  {playbackSpeed}x
                </button>

                <button
                  onClick={() => setIsLooping(!isLooping)}
                  className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-colors ${
                    isLooping ? 'bg-[#fce116] text-black font-bold' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                  title="تكرار المقطع"
                >
                  <i className="fa-solid fa-repeat"></i>
                </button>
              </div>

              {/* Play / Pause Button */}
              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-[#fce116] hover:bg-[#e5cc14] text-black flex items-center justify-center font-bold text-sm shadow-md transition-transform active:scale-90"
              >
                <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
              </button>

              <div className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold">
                <i className="fa-solid fa-headphones text-emerald-400"></i>
                <span>استماع في الخلفية</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
