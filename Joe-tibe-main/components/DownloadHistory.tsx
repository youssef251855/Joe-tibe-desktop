import React, { useState } from 'react';
import type { DownloadHistoryItem } from '../types';

interface DownloadHistoryProps {
    history: DownloadHistoryItem[];
    onClearHistory: () => void;
    onDeleteHistoryItem: (id: string) => void;
    onSelectUrl: (url: string) => void;
}

export const DownloadHistory: React.FC<DownloadHistoryProps> = ({
    history,
    onClearHistory,
    onDeleteHistoryItem,
    onSelectUrl,
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const filtered = history.filter(item => 
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.platform.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCopy = (item: DownloadHistoryItem) => {
        navigator.clipboard.writeText(item.url);
        setCopiedId(item.id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleShare = async (item: DownloadHistoryItem) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: item.title,
                    text: `تحميل بواسطة Joe tube: ${item.title}`,
                    url: item.url,
                });
            } catch (err) {
                console.warn('Share cancelled or not allowed', err);
            }
        } else {
            handleCopy(item);
        }
    };

    const formatDate = (timestamp: number) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString('ar-EG', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="w-full animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-yellow-100 flex items-center justify-center text-[#d4b800] text-sm">
                        <i className="fa-solid fa-clock-rotate-left"></i>
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-gray-900">سجل التنزيلات</h3>
                        <p className="text-[11px] text-gray-500">سجل الروابط والملفات المحفوظة محلياً</p>
                    </div>
                </div>

                {history.length > 0 && (
                    <button
                        onClick={onClearHistory}
                        className="text-xs text-red-500 hover:text-red-700 font-bold px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 transition flex items-center gap-1"
                    >
                        <i className="fa-solid fa-trash-can text-[10px]"></i>
                        <span>مسح الكل</span>
                    </button>
                )}
            </div>

            {history.length > 0 && (
                <div className="relative mb-3">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="ابحث في سجل تنزيلاتك..."
                        className="w-full bg-gray-100 rounded-xl py-2 pr-9 pl-3 text-xs outline-none focus:ring-1 focus:ring-[#fce116]"
                    />
                    <i className="fa-solid fa-magnifying-glass absolute right-3 top-2.5 text-gray-400 text-xs"></i>
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="bg-gray-50 rounded-2xl p-8 text-center border border-dashed border-gray-200">
                    <div className="w-14 h-14 rounded-full bg-yellow-100 text-[#d4b800] flex items-center justify-center text-2xl mx-auto mb-3">
                        <i className="fa-solid fa-inbox"></i>
                    </div>
                    <p className="text-sm font-bold text-gray-700">لا توجد تنزيلات سابقة</p>
                    <p className="text-xs text-gray-400 mt-1">عندما تقوم بتنزيل أي فيديو أو فويس سيتم حفظه هنا للوصول السريع بدون إعادة البحث.</p>
                </div>
            ) : (
                <div className="space-y-2.5">
                    {filtered.map(item => (
                        <div
                            key={item.id}
                            className="bg-white rounded-2xl p-3 border border-gray-100 shadow-sm hover:shadow-md transition flex items-center justify-between gap-3"
                        >
                            <div 
                                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                                onClick={() => onSelectUrl(item.url)}
                            >
                                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
                                    {item.thumbnail ? (
                                        <img 
                                            src={item.thumbnail} 
                                            alt={item.title} 
                                            className="w-full h-full object-cover" 
                                            referrerPolicy="no-referrer" 
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <i className="fa-solid fa-play"></i>
                                        </div>
                                    )}
                                    <span className="absolute bottom-0.5 right-0.5 bg-black/75 text-white text-[9px] font-bold px-1 rounded">
                                        {item.format}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0 text-right">
                                    <h4 className="font-bold text-xs text-gray-900 truncate" title={item.title}>
                                        {item.title}
                                    </h4>
                                    <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-500">
                                        <span className="bg-yellow-100 text-yellow-800 font-bold px-1.5 py-0.5 rounded">
                                            {item.quality}
                                        </span>
                                        <span>{formatDate(item.downloadedAt)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                                <button
                                    onClick={() => onSelectUrl(item.url)}
                                    className="w-7 h-7 rounded-lg bg-yellow-100 text-yellow-800 hover:bg-[#fce116] flex items-center justify-center text-xs transition"
                                    title="إعادة التنزيل"
                                >
                                    <i className="fa-solid fa-rotate-right"></i>
                                </button>
                                <button
                                    onClick={() => handleShare(item)}
                                    className="w-7 h-7 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center text-xs transition"
                                    title="مشاركة"
                                >
                                    {copiedId === item.id ? (
                                        <i className="fa-solid fa-check text-green-600"></i>
                                    ) : (
                                        <i className="fa-solid fa-share-nodes"></i>
                                    )}
                                </button>
                                <button
                                    onClick={() => onDeleteHistoryItem(item.id)}
                                    className="w-7 h-7 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center text-xs transition"
                                    title="حذف"
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
