import React, { useState, useRef, useEffect } from 'react';
import type { MusicInfo, DownloadOption } from '../types';

interface VoicePlayerProps {
    musicInfo?: MusicInfo;
    onDownloadVoice?: () => void;
    isDownloading?: boolean;
}

export const VoicePlayer: React.FC<VoicePlayerProps> = ({ musicInfo, onDownloadVoice, isDownloading }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        setIsPlaying(false);
        setCurrentTime(0);
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
    }, [musicInfo?.playUrl]);

    if (!musicInfo || !musicInfo.playUrl) return null;

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().then(() => {
                setIsPlaying(true);
            }).catch((err) => {
                console.warn("Audio playback failed:", err);
            });
        }
    };

    const handleTimeUpdate = () => {
        if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
        }
    };

    const handleLoadedMetadata = () => {
        if (audioRef.current) {
            setDuration(audioRef.current.duration || 0);
        }
    };

    const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = parseFloat(e.target.value);
        setCurrentTime(time);
        if (audioRef.current) {
            audioRef.current.currentTime = time;
        }
    };

    const formatTime = (secs: number) => {
        if (isNaN(secs)) return "0:00";
        const m = Math.floor(secs / 60);
        const s = Math.floor(secs % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white p-4 rounded-2xl shadow-lg border border-gray-700/50 mb-6 transition-all animate-fade-in-up">
            <audio 
                ref={audioRef}
                src={musicInfo.playUrl}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                preload="metadata"
            />

            {/* Top header with badge */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="bg-[#fce116] text-black text-[11px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                        <i className="fa-solid fa-microphone-lines text-xs"></i>
                        فويس التيك توك
                    </span>
                    <span className="text-gray-400 text-xs">الصوت الأصلي</span>
                </div>
                <div className="text-xs text-gray-400 font-mono">
                    {formatTime(currentTime)} / {formatTime(duration || (typeof musicInfo.duration === 'number' ? musicInfo.duration : 0))}
                </div>
            </div>

            {/* Audio Info & Controls */}
            <div className="flex items-center gap-3 mb-3">
                <button
                    type="button"
                    onClick={togglePlay}
                    className="w-12 h-12 rounded-full bg-[#fce116] hover:bg-[#e5cc14] text-black flex items-center justify-center text-lg transition-transform active:scale-95 shadow-md flex-shrink-0"
                    title={isPlaying ? "إيقاف مؤقت" : "تشغيل الفويس"}
                >
                    <i className={`fa-solid ${isPlaying ? 'fa-pause' : 'fa-play pr-0.5'}`}></i>
                </button>

                <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-sm text-white truncate text-right" dir="auto">
                        {musicInfo.title || 'صوت تيك توك'}
                    </h4>
                    <p className="text-xs text-gray-400 truncate text-right" dir="auto">
                        بواسطة: {musicInfo.author || 'صاحب المقطع'}
                    </p>
                </div>

                {onDownloadVoice && (
                    <button
                        type="button"
                        onClick={onDownloadVoice}
                        disabled={isDownloading}
                        className="bg-white/10 hover:bg-white/20 text-white font-bold py-2 px-3.5 rounded-xl text-xs flex items-center gap-1.5 transition-all active:scale-95 border border-white/10 flex-shrink-0"
                    >
                        <i className="fa-solid fa-download text-[#fce116]"></i>
                        <span>تحميل MP3</span>
                    </button>
                )}
            </div>

            {/* Progress Slider */}
            <div className="w-full flex items-center gap-2">
                <input 
                    type="range"
                    min="0"
                    max={duration || 100}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#fce116]"
                />
            </div>
        </div>
    );
};
