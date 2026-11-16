import React from 'react';
import type { VideoDetails } from '../types';

interface VideoPreviewCardProps extends VideoDetails {
    onOpenTools?: () => void;
}

export const VideoPreviewCard: React.FC<VideoPreviewCardProps> = ({ title, thumbnail, duration, platform, onOpenTools }) => {
    return (
        <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 mb-4">
            <div className="relative">
                <img src={thumbnail} alt={title} className="w-full aspect-video object-cover" referrerPolicy="no-referrer" />
                <div className="absolute bottom-2 left-2 bg-black/80 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                    {duration}
                </div>
                {platform === 'instagram' && (
                    <div className="absolute top-2 right-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 shadow-md">
                        <i className="fa-brands fa-instagram"></i>
                        <span>إنستغرام ريلز / منشور</span>
                    </div>
                )}
                {platform === 'twitter' && (
                    <div className="absolute top-2 right-2 bg-black text-white text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 shadow-md border border-white/20">
                        <i className="fa-brands fa-x-twitter"></i>
                        <span>منصة X (تويتر)</span>
                    </div>
                )}
                {platform === 'tiktok' && (
                    <div className="absolute top-2 right-2 bg-black text-white text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 shadow-md border border-white/20">
                        <i className="fa-brands fa-tiktok text-[#25F4EE]"></i>
                        <span>تيك توك (بدون علامة مائية)</span>
                    </div>
                )}
                {platform === 'facebook' && (
                    <div className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 shadow-md">
                        <i className="fa-brands fa-facebook"></i>
                        <span>فيسبوك ريلز</span>
                    </div>
                )}
                {platform === 'youtube' && (
                    <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1.5 shadow-md">
                        <i className="fa-brands fa-youtube"></i>
                        <span>يوتيوب</span>
                    </div>
                )}
            </div>
            <div className="p-4">
                <h3 className="text-gray-800 font-bold text-base leading-snug line-clamp-2 text-right" dir="rtl">
                    {title}
                </h3>

                {onOpenTools && (
                    <button
                        onClick={onOpenTools}
                        className="mt-3 w-full bg-gradient-to-r from-amber-50 to-yellow-50 hover:from-amber-100 hover:to-yellow-100 border border-amber-300/80 rounded-xl py-2 px-3 flex items-center justify-between text-xs font-bold text-amber-950 transition-all shadow-xs cursor-pointer active:scale-98"
                    >
                        <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-400/30 flex items-center justify-center text-amber-700">
                                <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
                            </span>
                            <span>استوديو الأدوات المتقدمة (10 ميزات)</span>
                        </div>
                        <span className="text-[10px] bg-amber-200 text-amber-900 font-black px-2 py-0.5 rounded-full">
                            قص • معادل • رنات • 4K
                        </span>
                    </button>
                )}
            </div>
        </div>
    );
};