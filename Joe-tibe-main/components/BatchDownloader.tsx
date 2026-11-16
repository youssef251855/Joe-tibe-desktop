import React, { useState } from 'react';
import type { BatchItem, DownloadOption, DownloadHistoryItem } from '../types';
import { isHtmlOrTextData } from '../App';

interface BatchDownloaderProps {
    onAddToHistory: (option: DownloadOption, details: any, directUrl?: string) => void;
    initialUrl?: string;
    initialMode?: 'multi' | 'playlist';
}

export const BatchDownloader: React.FC<BatchDownloaderProps> = ({ onAddToHistory, initialUrl, initialMode }) => {
    const [mode, setMode] = useState<'multi' | 'playlist'>(initialMode || 'multi');
    const [rawInput, setRawInput] = useState<string>(initialUrl || '');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<BatchItem[]>([]);
    const [defaultFormat, setDefaultFormat] = useState<'video' | 'audio'>('video');
    const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);
    const [copiedAll, setCopiedAll] = useState<boolean>(false);
    const [playlistMeta, setPlaylistMeta] = useState<{ title: string; count: number; author?: string } | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showAddSingle, setShowAddSingle] = useState<boolean>(false);
    const [singleInputUrl, setSingleInputUrl] = useState<string>('');
    const [isAddingSingle, setIsAddingSingle] = useState<boolean>(false);
    const [singleAddError, setSingleAddError] = useState<string | null>(null);

    // If initialUrl is passed on mount or changes
    React.useEffect(() => {
        if (initialUrl && initialUrl.trim()) {
            setRawInput(initialUrl.trim());
            setMode(initialMode || 'playlist');
            // Auto resolve
            setTimeout(() => {
                resolvePlaylistOrBatch(initialUrl.trim(), initialMode || 'playlist');
            }, 100);
        }
    }, [initialUrl, initialMode]);

    const handlePasteFromClipboard = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text && text.trim()) {
                    setRawInput(prev => prev ? `${prev}\n${text.trim()}` : text.trim());
                }
            }
        } catch (e) {
            console.warn("Clipboard paste error:", e);
        }
    };

    const handleRemoveItem = (id: string) => {
        setItems(prev => prev.filter(it => it.id !== id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    };

    const handleToggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleToggleSelectAll = () => {
        const readyIds = items.filter(it => it.status !== 'error').map(it => it.id);
        if (selectedIds.size >= readyIds.length && readyIds.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(readyIds));
        }
    };

    const handleClearAllItems = () => {
        setItems([]);
        setSelectedIds(new Set());
        setPlaylistMeta(null);
    };

    const handleAddSingleItem = async () => {
        const urlToAdd = singleInputUrl.trim();
        if (!urlToAdd) return;

        setIsAddingSingle(true);
        setSingleAddError(null);

        try {
            const res = await fetch(`/api/video?url=${encodeURIComponent(urlToAdd)}`);
            const resText = await res.text();
            let parsed: any;
            try {
                parsed = JSON.parse(resText);
            } catch {
                throw new Error("استجابة غير صالحة من الخادم");
            }

            if (!res.ok || parsed.error) {
                throw new Error(parsed.error || "تعذر جلب تفاصيل الرابط");
            }

            const { source, data } = parsed;
            const newItemId = `item_${Date.now()}_${Math.random().toString(36).substring(5)}`;
            const formats: DownloadOption[] = (data.formats || []).map((f: any) => ({
                quality: f.quality || 'عالي الجودة',
                format: f.format || 'mp4',
                size: f.size || 'HD',
                icon: f.hasVideo ? 'fa-solid fa-film' : 'fa-solid fa-music',
                url: f.url || urlToAdd,
                directUrl: f.directUrl,
                loaderFormat: f.loaderFormat
            }));

            const newItem: BatchItem = {
                id: newItemId,
                url: urlToAdd,
                title: data.title || 'مقطع وسائط جديد',
                thumbnail: data.thumbnail || '',
                duration: data.duration || 'HD',
                platform: source || 'media',
                formats: formats.length > 0 ? formats : [
                    { quality: 'فيديو MP4', format: 'mp4', size: 'HD', icon: 'fa-solid fa-film', url: urlToAdd }
                ],
                status: 'ready'
            };

            setItems(prev => [newItem, ...prev]);
            setSelectedIds(prev => new Set(prev).add(newItemId));
            setSingleInputUrl('');
            setShowAddSingle(false);
        } catch (e: any) {
            setSingleAddError(e.message || "حدث خطأ أثناء إضافة الرابط");
        } finally {
            setIsAddingSingle(false);
        }
    };

    const resolvePlaylistOrBatch = async (inputStr: string, activeMode: 'multi' | 'playlist') => {
        setError(null);
        setPlaylistMeta(null);
        const trimmed = inputStr.trim();
        if (!trimmed) {
            setError("يرجى إدخال رابط واحد على الأقل أو رابط قائمة تشغيل");
            return;
        }

        // Auto-detect if user entered a playlist link even if in multi mode
        const isPlaylist = activeMode === 'playlist' || 
                           (/[?&]list=([a-zA-Z0-9_-]+)/i.test(trimmed) && !trimmed.includes('\n')) ||
                           (/^(PL|RD|UU|FL|LL|OLAK)[a-zA-Z0-9_-]{10,}$/i.test(trimmed));

        if (isPlaylist && activeMode !== 'playlist') {
            setMode('playlist');
        }

        setIsLoading(true);

        try {
            if (isPlaylist) {
                // Fetch YouTube Playlist
                const res = await fetch(`/api/playlist?url=${encodeURIComponent(trimmed)}`);
                const resText = await res.text();
                let data: any;
                try {
                    data = JSON.parse(resText);
                } catch {
                    throw new Error("تعذر قراءة بيانات قائمة التشغيل، يرجى إعادة المحاولة.");
                }

                if (!res.ok || data.error) {
                    throw new Error(data.error || "تعذر جلب قائمة التشغيل. تأكد من أن القائمة عامة وليست خاصة.");
                }

                setPlaylistMeta({
                    title: data.title,
                    count: data.videoCount || data.videos?.length || 0,
                    author: data.author
                });

                const mappedItems: BatchItem[] = (data.videos || []).map((v: any) => ({
                    id: v.id || `pl_${Math.random()}`,
                    url: v.url,
                    title: v.title,
                    thumbnail: v.thumbnail,
                    duration: v.duration,
                    platform: 'youtube',
                    formats: [
                        { quality: 'فيديو 1080p Full HD', format: 'mp4', size: 'FHD', icon: 'fa-solid fa-film', url: v.url, loaderFormat: '1080' },
                        { quality: 'فيديو 720p HD', format: 'mp4', size: 'HD', icon: 'fa-solid fa-video', url: v.url, loaderFormat: '720' },
                        { quality: 'فيديو 480p SD', format: 'mp4', size: 'SD', icon: 'fa-solid fa-video', url: v.url, loaderFormat: '480' },
                        { quality: 'فيديو 360p منخفض', format: 'mp4', size: 'Low', icon: 'fa-solid fa-video', url: v.url, loaderFormat: '360' },
                        { quality: 'صوت MP3 عالي 320kbps', format: 'mp3', size: 'HQ Audio', icon: 'fa-solid fa-music', url: v.url, loaderFormat: 'mp3' },
                        { quality: 'صوت M4A أصلي', format: 'm4a', size: 'Audio', icon: 'fa-solid fa-headphones', url: v.url, loaderFormat: 'm4a' }
                    ],
                    status: 'ready'
                }));

                setItems(mappedItems);
                setSelectedIds(new Set(mappedItems.map(m => m.id)));
            } else {
                // Multi-link Mode
                const lines = trimmed.split(/[\n,]+/).map(l => l.trim()).filter(Boolean);
                if (lines.length === 0) throw new Error("لا توجد روابط صالحة");

                const res = await fetch('/api/batch', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ urls: lines })
                });

                const resText = await res.text();
                let data: any;
                try {
                    data = JSON.parse(resText);
                } catch {
                    throw new Error("تعذر فحص الروابط حالياً");
                }

                if (!res.ok || data.error) {
                    throw new Error(data.error || "فشل تحليل الروابط");
                }

                const resolvedList: BatchItem[] = (data.items || []).map((it: any, idx: number) => {
                    if (it.success && it.data) {
                        const d = it.data;
                        const formats: DownloadOption[] = (d.formats || []).map((f: any) => ({
                            quality: f.quality || 'عالي الجودة',
                            format: f.format || 'mp4',
                            size: f.size || 'HD',
                            icon: f.hasVideo ? 'fa-solid fa-video' : 'fa-solid fa-music',
                            url: f.url || it.originalUrl,
                            directUrl: f.directUrl,
                            loaderFormat: f.loaderFormat
                        }));

                        return {
                            id: d.id || `item_${idx}_${Date.now()}`,
                            url: it.originalUrl,
                            title: d.title || 'مقطع وسائط',
                            thumbnail: d.thumbnail || '',
                            duration: d.duration || 'HD',
                            platform: d.platform || 'media',
                            formats: formats.length > 0 ? formats : [
                                { quality: 'فيديو MP4', format: 'mp4', size: 'HD', icon: 'fa-solid fa-video', url: it.originalUrl }
                            ],
                            status: 'ready'
                        };
                    } else {
                        return {
                            id: `err_${idx}`,
                            url: it.originalUrl,
                            title: `تعذر جلب الرابط (${it.originalUrl.substring(0, 30)}...)`,
                            thumbnail: 'https://images.unsplash.com/photo-1594322436404-5a0526db4d13?w=300&auto=format&fit=crop&q=80',
                            platform: 'unknown',
                            formats: [],
                            status: 'error',
                            error: it.error || 'رابط غير مدعوم'
                        };
                    }
                });

                setItems(resolvedList);
                setSelectedIds(new Set(resolvedList.filter(it => it.status !== 'error').map(m => m.id)));
            }
        } catch (e: any) {
            setError(e.message || "حدث خطأ أثناء معالجة الطلب");
        } finally {
            setIsLoading(false);
        }
    };

    const handleResolve = () => {
        resolvePlaylistOrBatch(rawInput, mode);
    };

    // Download Single Batch Item
    const downloadSingleItem = async (item: BatchItem, index: number) => {
        if (item.status === 'error') return;
        setDownloadingIndex(index);

        try {
            // Select format based on default preference (audio vs video)
            let chosen = item.selectedFormat;
            if (!chosen) {
                if (defaultFormat === 'audio') {
                    chosen = item.formats.find(f => f.format === 'mp3' || f.format === 'm4a' || !f.icon.includes('video')) || item.formats[0];
                } else {
                    chosen = item.formats.find(f => f.format === 'mp4' || f.icon.includes('video')) || item.formats[0];
                }
            }

            // If direct link is ready, fetch as verified blob first
            let fetchUrl = chosen?.directUrl;
            let formatParam = chosen?.loaderFormat || (chosen?.format?.toLowerCase()?.includes('mp3') ? 'mp3' : (defaultFormat === 'audio' ? 'mp3' : 'mp4'));

            if (!fetchUrl) {
                // If it requires server proxy (YouTube & converted formats)
                const res = await fetch(`/api/download?url=${encodeURIComponent(item.url)}&format=${formatParam}&title=${encodeURIComponent(item.title)}`);
                const resText = await res.text();
                let data: any = null;
                try {
                    data = JSON.parse(resText);
                } catch {
                    console.warn("Invalid JSON response from download API");
                }
                if (data && data.download_url) {
                    fetchUrl = data.download_url;
                }
            }

            if (!fetchUrl) {
                throw new Error("تعذر تجهيز رابط التحميل");
            }

            // Fetch as binary blob to verify it is authentic media and NEVER an HTML document
            const mediaRes = await fetch(fetchUrl);
            if (!mediaRes.ok) throw new Error("فشل سحب ملف الوسائط");

            const cType = (mediaRes.headers.get("content-type") || "").toLowerCase();
            if (cType.includes("text/html") || cType.includes("application/xhtml")) {
                throw new Error("استجاب السيرفر بصفحة غير صالحة بدلاً من ملف الوسائط");
            }

            const buffer = await mediaRes.arrayBuffer();
            const chunk = new Uint8Array(buffer);
            if (isHtmlOrTextData([chunk])) {
                throw new Error("تم حظر استلام صفحة ويب HTML وهمية بنجاح");
            }

            const mime = formatParam.includes('mp3') ? 'audio/mpeg' : 'video/mp4';
            const blob = new Blob([chunk], { type: mime });
            const blobUrl = URL.createObjectURL(blob);
            const safeName = `${item.title.substring(0, 30)}.${formatParam.includes('mp3') ? 'mp3' : 'mp4'}`;

            onAddToHistory(chosen || item.formats[0], { title: item.title, thumbnail: item.thumbnail, url: item.url, platform: item.platform }, blobUrl);
            
            const a = document.createElement('a');
            a.href = blobUrl;
            a.download = safeName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'completed', directDownloadUrl: blobUrl } : it));
        } catch (e: any) {
            console.error("Batch download error:", e);
            setItems(prev => prev.map((it, i) => i === index ? { ...it, status: 'error' } : it));
        } finally {
            setDownloadingIndex(null);
        }
    };

    // Download All items sequentially (or selected items)
    const handleDownloadAll = async () => {
        const validItems = items.filter(it => it.status !== 'error' && (selectedIds.size === 0 || selectedIds.has(it.id)));
        for (let i = 0; i < validItems.length; i++) {
            const actualIndex = items.findIndex(it => it.id === validItems[i].id);
            if (actualIndex !== -1) {
                await downloadSingleItem(validItems[i], actualIndex);
                // Pause 1 second between items to prevent browser download blockage
                await new Promise(r => setTimeout(r, 1200));
            }
        }
    };

    const handleCopyAllLinks = () => {
        const links = items
            .map(it => it.directDownloadUrl || it.formats[0]?.directUrl || it.url)
            .filter(Boolean)
            .join('\n');
        
        if (links && navigator.clipboard) {
            navigator.clipboard.writeText(links);
            setCopiedAll(true);
            setTimeout(() => setCopiedAll(false), 2000);
        }
    };

    return (
        <div className="w-full animate-fade-in-up space-y-4 text-right">
            {/* Header Card */}
            <div className="bg-white rounded-3xl p-5 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5 bg-yellow-100 text-yellow-900 text-[10px] font-black px-2.5 py-1 rounded-full">
                        <i className="fa-solid fa-layer-group"></i>
                        <span>تحميل دفعي غير محدود</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <h3 className="font-bold text-base text-gray-900">التحميل الدفعي وقوائم التشغيل</h3>
                        <div className="w-8 h-8 rounded-xl bg-[#fce116] flex items-center justify-center text-black font-black text-sm">
                            <i className="fa-solid fa-bolt"></i>
                        </div>
                    </div>
                </div>

                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    الصق عدة روابط معاً (تيك توك، إنستغرام، يوتيوب، فيسبوك، أو X) أو رابط قائمة تشغيل لتحميلها كلها دفعة واحدة.
                </p>

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1 rounded-2xl mb-4 text-xs font-bold">
                    <button
                        onClick={() => setMode('multi')}
                        className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${mode === 'multi' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <i className="fa-solid fa-list-check text-xs"></i>
                        <span>روابط متعددة (Multi-URLs)</span>
                    </button>
                    <button
                        onClick={() => setMode('playlist')}
                        className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${mode === 'playlist' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                    >
                        <i className="fa-brands fa-youtube text-red-600 text-xs"></i>
                        <span>قائمة تشغيل (Playlist)</span>
                    </button>
                </div>

                {/* Input Area */}
                <div className="relative mb-3">
                    {mode === 'multi' ? (
                        <textarea
                            value={rawInput}
                            onChange={(e) => setRawInput(e.target.value)}
                            placeholder="ضع الروابط هنا (رابط في كل سطر)...&#10;https://www.tiktok.com/...&#10;https://www.instagram.com/reel/...&#10;https://x.com/...&#10;https://youtube.com/watch?v=..."
                            rows={4}
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#fce116] transition placeholder-gray-400 leading-relaxed font-mono"
                            dir="ltr"
                            disabled={isLoading}
                        />
                    ) : (
                        <input
                            type="text"
                            value={rawInput}
                            onChange={(e) => setRawInput(e.target.value)}
                            placeholder="https://www.youtube.com/playlist?list=..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 px-4 text-xs text-gray-800 outline-none focus:ring-2 focus:ring-[#fce116] transition placeholder-gray-400 font-mono"
                            dir="ltr"
                            disabled={isLoading}
                        />
                    )}

                    <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-gray-500 font-bold">الصيغة الافتراضية للكل:</span>
                            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-[10px] font-bold">
                                <button
                                    onClick={() => setDefaultFormat('video')}
                                    className={`px-2 py-0.5 rounded-md transition ${defaultFormat === 'video' ? 'bg-white text-black shadow-xs font-black' : 'text-gray-500'}`}
                                >
                                    🎬 فيديو MP4
                                </button>
                                <button
                                    onClick={() => setDefaultFormat('audio')}
                                    className={`px-2 py-0.5 rounded-md transition ${defaultFormat === 'audio' ? 'bg-white text-black shadow-xs font-black' : 'text-gray-500'}`}
                                >
                                    🎵 صوت MP3
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={handlePasteFromClipboard}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-bold px-2.5 py-1 rounded-xl transition flex items-center gap-1"
                            >
                                <i className="fa-regular fa-paste"></i>
                                <span>لصق من الحافظة</span>
                            </button>
                            {rawInput && (
                                <button
                                    type="button"
                                    onClick={() => setRawInput('')}
                                    className="text-gray-400 hover:text-gray-600 text-xs px-1.5 py-1"
                                >
                                    مسح
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 mb-3 animate-fade-in text-right">
                        <i className="fa-solid fa-triangle-exclamation ml-1.5"></i>
                        {error}
                    </div>
                )}

                <button
                    onClick={handleResolve}
                    disabled={isLoading || !rawInput.trim()}
                    className="w-full bg-[#fce116] hover:bg-[#e5cc14] text-black font-extrabold py-3 px-4 rounded-2xl text-xs flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-yellow-500/20"
                >
                    {isLoading ? (
                        <>
                            <i className="fa-solid fa-spinner fa-spin"></i>
                            <span>جاري معالجة واستخراج الروابط...</span>
                        </>
                    ) : (
                        <>
                            <i className="fa-solid fa-wand-magic-sparkles"></i>
                            <span>{mode === 'playlist' ? 'استخراج مقاطع قائمة التشغيل' : 'تحليل الروابط دفعة واحدة'}</span>
                        </>
                    )}
                </button>
            </div>

            {/* Playlist Meta Header */}
            {playlistMeta && (
                <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-3xl shadow-sm text-right flex items-center justify-between">
                    <div>
                        <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-full font-bold">قائمة تشغيل يوتيوب</span>
                        <h4 className="font-bold text-sm mt-1">{playlistMeta.title}</h4>
                        <p className="text-xs text-white/80">{playlistMeta.count} مقطع فيديو • {playlistMeta.author}</p>
                    </div>
                    <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl">
                        <i className="fa-brands fa-youtube"></i>
                    </div>
                </div>
            )}

            {/* Resolved Items List & Batch Actions */}
            {items.length > 0 && (
                <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm space-y-3">
                    {/* Top Action Bar */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                                onClick={handleDownloadAll}
                                className="bg-[#fce116] hover:bg-[#e5cc14] text-black text-xs font-black px-3 py-1.5 rounded-xl shadow-xs flex items-center gap-1.5 transition active:scale-95"
                            >
                                <i className="fa-solid fa-download"></i>
                                <span>
                                    {selectedIds.size > 0 && selectedIds.size < items.filter(i => i.status !== 'error').length 
                                        ? `تحميل المحدد (${selectedIds.size})` 
                                        : 'تحميل الكل الآن'}
                                </span>
                            </button>

                            <button
                                onClick={() => setShowAddSingle(!showAddSingle)}
                                className={`text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition ${showAddSingle ? 'bg-yellow-100 text-yellow-900' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                            >
                                <i className={`fa-solid ${showAddSingle ? 'fa-xmark' : 'fa-plus'}`}></i>
                                <span>إضافة مقطع +</span>
                            </button>

                            <button
                                onClick={handleCopyAllLinks}
                                className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition"
                            >
                                <i className="fa-regular fa-copy"></i>
                                <span>{copiedAll ? 'تم النسخ ✅' : 'نسخ الروابط'}</span>
                            </button>

                            <button
                                onClick={handleClearAllItems}
                                className="text-gray-400 hover:text-red-500 hover:bg-red-50 text-xs font-bold px-2 py-1.5 rounded-xl transition"
                                title="تفريغ كل القائمة"
                            >
                                <i className="fa-solid fa-trash-can"></i>
                            </button>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleToggleSelectAll}
                                className="text-[11px] font-bold text-gray-500 hover:text-gray-800 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 transition"
                            >
                                {selectedIds.size === items.filter(i => i.status !== 'error').length ? 'إلغاء تحديد الكل' : 'تحديد الكل'}
                            </button>
                            <span className="text-xs font-bold text-gray-600">
                                ({items.filter(i => i.status !== 'error').length} مقطع)
                            </span>
                        </div>
                    </div>

                    {/* Quick Add Single Item Drawer */}
                    {showAddSingle && (
                        <div className="p-3 bg-yellow-50/70 rounded-2xl border border-yellow-200 space-y-2 animate-fade-in text-right">
                            <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                                <span>إضافة مقطع إضافي إلى القائمة الحالية:</span>
                                <span className="text-[10px] text-gray-500">TikTok, Reels, YouTube, X, Facebook</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={handleAddSingleItem}
                                    disabled={isAddingSingle || !singleInputUrl.trim()}
                                    className="bg-[#fce116] hover:bg-[#e5cc14] text-black text-xs font-extrabold px-3 py-2 rounded-xl transition disabled:opacity-50 shrink-0"
                                >
                                    {isAddingSingle ? <i className="fa-solid fa-spinner fa-spin"></i> : 'إضافة'}
                                </button>
                                <input
                                    type="text"
                                    value={singleInputUrl}
                                    onChange={(e) => setSingleInputUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full bg-white border border-gray-200 rounded-xl py-1.5 px-3 text-xs outline-none focus:border-yellow-400 font-mono"
                                    dir="ltr"
                                />
                            </div>
                            {singleAddError && (
                                <p className="text-[11px] text-red-600 font-bold">{singleAddError}</p>
                            )}
                        </div>
                    )}

                    {/* Items Grid */}
                    <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
                        {items.map((item, index) => {
                            const isSelected = selectedIds.has(item.id);
                            return (
                                <div
                                    key={item.id}
                                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-2.5 ${
                                        item.status === 'completed'
                                            ? 'bg-green-50/60 border-green-200'
                                            : item.status === 'error'
                                            ? 'bg-red-50/60 border-red-200'
                                            : isSelected
                                            ? 'bg-yellow-50/20 border-yellow-300 shadow-2xs'
                                            : 'bg-gray-50 border-gray-100 opacity-70'
                                    }`}
                                >
                                    {/* Action Buttons: Download & Delete */}
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => handleRemoveItem(item.id)}
                                            title="إزالة هذا المقطع من القائمة"
                                            className="text-gray-400 hover:text-red-500 hover:bg-red-50 w-7 h-7 rounded-xl flex items-center justify-center transition-colors"
                                        >
                                            <i className="fa-regular fa-trash-can text-xs"></i>
                                        </button>

                                        {item.status === 'error' ? (
                                            <span className="text-[10px] text-red-500 font-bold bg-red-100 px-2 py-1 rounded-lg">
                                                تعذر التحليل
                                            </span>
                                        ) : item.status === 'completed' ? (
                                            item.directDownloadUrl && item.directDownloadUrl.startsWith('blob:') ? (
                                                <a
                                                    href={item.directDownloadUrl}
                                                    download={`${item.title.substring(0, 30)}.${item.selectedFormat?.format || (defaultFormat === 'audio' ? 'mp3' : 'mp4')}`}
                                                    className="bg-green-600 hover:bg-green-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition"
                                                    title="إعادة حفظ الملف بجهازك"
                                                >
                                                    <i className="fa-solid fa-check"></i>
                                                    <span>مكتمل (حفظ)</span>
                                                </a>
                                            ) : (
                                                <button
                                                    onClick={() => downloadSingleItem(item, index)}
                                                    className="bg-green-600 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs"
                                                >
                                                    <i className="fa-solid fa-check"></i>
                                                    <span>مكتمل</span>
                                                </button>
                                            )
                                        ) : (
                                            <button
                                                onClick={() => downloadSingleItem(item, index)}
                                                disabled={downloadingIndex === index}
                                                className="bg-[#fce116] hover:bg-[#e5cc14] text-black text-[11px] font-bold px-2.5 py-1.5 rounded-xl flex items-center gap-1 shadow-xs transition active:scale-95 disabled:opacity-50"
                                            >
                                                {downloadingIndex === index ? (
                                                    <i className="fa-solid fa-spinner fa-spin"></i>
                                                ) : (
                                                    <i className="fa-solid fa-arrow-down"></i>
                                                )}
                                                <span>
                                                    {item.selectedFormat 
                                                        ? (item.selectedFormat.format === 'mp3' || item.selectedFormat.format === 'm4a' ? 'MP3' : 'MP4') 
                                                        : (defaultFormat === 'audio' ? 'MP3' : 'MP4')}
                                                </span>
                                            </button>
                                        )}
                                    </div>

                                    {/* Title & Info & Custom Quality Selector */}
                                    <div className="flex-grow text-right overflow-hidden">
                                        <h5 className="font-bold text-xs text-gray-900 truncate leading-snug" title={item.title}>
                                            {item.title}
                                        </h5>
                                        <div className="flex items-center justify-end gap-2 text-[10px] text-gray-400 mt-0.5">
                                            {item.duration && <span>{item.duration}</span>}
                                            <span className="capitalize font-medium text-gray-500">• {item.platform}</span>
                                        </div>

                                        {/* Per-Item Custom Quality Selector */}
                                        {item.formats.length > 0 && item.status !== 'completed' && item.status !== 'error' && (
                                            <div className="flex items-center gap-1.5 mt-1.5 justify-end">
                                                <span className="text-[10px] text-gray-400 font-bold">الجودة:</span>
                                                <select
                                                    value={
                                                        item.selectedFormat?.quality ||
                                                        (defaultFormat === 'audio'
                                                            ? (item.formats.find(f => f.format === 'mp3' || f.format === 'm4a' || !f.icon.includes('video'))?.quality || item.formats[0]?.quality)
                                                            : (item.formats.find(f => f.format === 'mp4' || f.icon.includes('video'))?.quality || item.formats[0]?.quality))
                                                    }
                                                    onChange={(e) => {
                                                        const targetFmt = item.formats.find(f => f.quality === e.target.value);
                                                        if (targetFmt) {
                                                            setItems(prev => prev.map((it, idx) => idx === index ? { ...it, selectedFormat: targetFmt } : it));
                                                        }
                                                    }}
                                                    className="text-[10px] font-bold bg-white text-gray-800 border border-gray-200 rounded-lg px-2 py-0.5 outline-none focus:border-yellow-400 cursor-pointer shadow-2xs hover:bg-yellow-50/50 transition-colors"
                                                    dir="rtl"
                                                >
                                                    {item.formats.map((f, fIdx) => (
                                                        <option key={fIdx} value={f.quality}>
                                                            {f.quality} ({f.format.toUpperCase()})
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {/* Thumbnail & Select Checkbox */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        {item.thumbnail && (
                                            <img
                                                src={item.thumbnail}
                                                alt={item.title}
                                                className="w-12 h-12 rounded-xl object-cover border border-gray-200"
                                                referrerPolicy="no-referrer"
                                            />
                                        )}
                                        {item.status !== 'error' && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => handleToggleSelect(item.id)}
                                                className="w-4 h-4 rounded text-yellow-500 accent-yellow-400 focus:ring-yellow-400 cursor-pointer"
                                                title="تضمين في التحميل الجماعي"
                                            />
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};
