import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { UrlInputForm } from './components/UrlInputForm';
import { VideoPreviewCard } from './components/VideoPreviewCard';
import { VoicePlayer } from './components/VoicePlayer';
import { DownloadOptions } from './components/DownloadOptions';
import { SearchResults } from './components/SearchResults';
import { Loader } from './components/Loader';
import { QuickLinks } from './components/QuickLinks';
import { BottomNav, type TabType } from './components/BottomNav';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { DownloadHistory } from './components/DownloadHistory';
import { RatingFeedbackModal } from './components/RatingFeedbackModal';
import { SnapTubeVsJoeTube } from './components/SnapTubeVsJoeTube';
import { BatchDownloader } from './components/BatchDownloader';
import { MediaToolsStudio } from './components/MediaToolsStudio';
import { FloatingMiniPlayer } from './components/FloatingMiniPlayer';
import type { VideoDetails, DownloadOption, DownloadHistoryItem } from './types';

export const isMediaInput = (str: string): boolean => {
    if (!str) return false;
    const clean = str.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) return true;
    return clean.includes('youtube.com') ||
           clean.includes('youtu.be') ||
           clean.includes('facebook.com') ||
           clean.includes('fb.watch') ||
           clean.includes('fb.com') ||
           clean.includes('tiktok.com') ||
           clean.includes('douyin.com') ||
           clean.includes('instagram.com') ||
           clean.includes('instagr.am') ||
           clean.includes('twitter.com') ||
           clean.includes('x.com') ||
           clean.includes('t.co') ||
           clean.startsWith('http');
};

export const formatDuration = (secondsStr: string | number): string => {
    const seconds = typeof secondsStr === 'number' ? secondsStr : parseInt(secondsStr, 10);
    if (isNaN(seconds)) return '00:00';
    const h = Math.floor(seconds / 3600).toString(),
          m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0'),
          s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return h !== '0' ? `${h}:${m}:${s}` : `${m}:${s}`;
};

/**
 * Ironclad Binary Validator: Inspects incoming stream chunks.
 * Rejects any HTML document, web page, or error JSON, ensuring 0% fake index.html downloads.
 */
export function isHtmlOrTextData(chunks: Uint8Array[]): boolean {
    if (!chunks || chunks.length === 0) return true;
    const firstChunk = chunks[0];
    if (!firstChunk || firstChunk.length === 0) return true;

    const sampleLen = Math.min(300, firstChunk.length);
    const text = new TextDecoder().decode(firstChunk.slice(0, sampleLen)).toLowerCase().trim();

    return (
        text.startsWith('<!doctype') ||
        text.startsWith('<html') ||
        text.startsWith('<?xml') ||
        text.includes('<html') ||
        text.includes('<head') ||
        text.includes('<body') ||
        text.includes('<!doc') ||
        text.includes('{"error"') ||
        text.includes('{"message"') ||
        text.includes('<title>') ||
        text.includes('redirecting')
    );
}

const App: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabType>('home');
    const [url, setUrl] = useState<string>('');
    const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
    const [downloadOptions, setDownloadOptions] = useState<DownloadOption[]>([]);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState<boolean>(false);
    const [downloadProgress, setDownloadProgress] = useState<string>('');
    const [selectedOption, setSelectedOption] = useState<DownloadOption | null>(null);
    const [showOptions, setShowOptions] = useState<boolean>(false);
    const [readyDownloadUrl, setReadyDownloadUrl] = useState<{ url: string; title: string; quality: string } | null>(null);
    const [history, setHistory] = useState<DownloadHistoryItem[]>([]);
    const [batchInitialUrl, setBatchInitialUrl] = useState<string>('');
    const [batchInitialMode, setBatchInitialMode] = useState<'multi' | 'playlist'>('playlist');

    // Instant download toast notification state
    const [downloadToast, setDownloadToast] = useState<{
        message: string;
        subtitle?: string;
        type: 'loading' | 'success' | 'error';
    } | null>(null);

    // Auto-dismiss download toast after 5s when finished
    useEffect(() => {
        if (downloadToast && downloadToast.type !== 'loading') {
            const timer = setTimeout(() => setDownloadToast(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [downloadToast]);

    const [isToolsOpen, setIsToolsOpen] = useState<boolean>(false);
    const [showMiniPlayer, setShowMiniPlayer] = useState<boolean>(false);

    // Load download history from localStorage
    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('joetube_download_history');
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
        } catch (e) {
            console.error('Failed to load download history:', e);
        }
    }, []);

    // Helper to save item to history
    const addToHistory = useCallback((option: DownloadOption, details: VideoDetails | null, directDownloadUrl?: string) => {
        if (!details) return;
        const newItem: DownloadHistoryItem = {
            id: 'dl-' + Date.now(),
            title: details.title || 'ملف تم تنزيله',
            thumbnail: details.thumbnail || '',
            url: details.url || url,
            platform: details.platform || 'media',
            format: option.format || 'MP4',
            quality: option.quality || 'HD',
            downloadedAt: Date.now(),
            directUrl: directDownloadUrl || option.directUrl || option.url
        };

        setHistory(prev => {
            const updated = [newItem, ...prev.filter(i => i.url !== newItem.url)].slice(0, 50);
            localStorage.setItem('joetube_download_history', JSON.stringify(updated));
            return updated;
        });
    }, [url]);

    const handleClearHistory = () => {
        localStorage.removeItem('joetube_download_history');
        setHistory([]);
    };

    const handleDeleteHistoryItem = (id: string) => {
        setHistory(prev => {
            const updated = prev.filter(i => i.id !== id);
            localStorage.setItem('joetube_download_history', JSON.stringify(updated));
            return updated;
        });
    };

    const handleFetchVideo = useCallback(async (inputUrl?: string) => {
        const urlToUse = (inputUrl || url).trim();
        if (!urlToUse) return;

        // If user entered a YouTube Playlist URL on Home tab, switch to Batch Playlist tab
        const isPlaylist = (/[?&]list=([a-zA-Z0-9_-]+)/i.test(urlToUse) && !urlToUse.includes('v=')) ||
                           /youtube\.com\/playlist\?list=/i.test(urlToUse) ||
                           /^((?:PL|RD|OLAK)[a-zA-Z0-9_-]{10,})$/i.test(urlToUse);

        if (isPlaylist) {
            setIsLoading(false);
            setError(null);
            setBatchInitialUrl(urlToUse);
            setBatchInitialMode('playlist');
            setActiveTab('batch');
            return;
        }

        const isDirectMedia = isMediaInput(urlToUse);

        setIsLoading(true);
        setError(null);
        setVideoDetails(null);
        setDownloadOptions([]);
        setSearchResults([]);
        setShowOptions(false);
        setReadyDownloadUrl(null);

        try {
            if (isDirectMedia) {
                // Fetch video details directly
                const res = await fetch(`/api/video?url=${encodeURIComponent(urlToUse)}`);
                const resText = await res.text();
                let parsed: any;
                try {
                    parsed = JSON.parse(resText);
                } catch {
                    throw new Error('استجابة غير متوقعة من الخادم، يرجى إعادة المحاولة.');
                }

                if (!res.ok || parsed.error) {
                    throw new Error(parsed.error || 'تعذر جلب تفاصيل الفيديو');
                }
                const { source, data } = parsed;
                
                let details: VideoDetails;
                let options: DownloadOption[] = [];

                if (source === 'tiktok') {
                    details = {
                        id: data.id,
                        url: data.url || urlToUse,
                        title: data.title || 'فيديو تيك توك بدون علامة مائية',
                        thumbnail: data.thumbnail,
                        duration: data.duration || 'HD',
                        platform: 'tiktok',
                        musicInfo: data.musicInfo
                    };

                    data.formats.forEach((f: any) => {
                        options.push({
                            quality: f.quality,
                            format: f.format.toUpperCase(),
                            size: f.hasVideo ? 'فيديو بدون علامة' : 'فويس أصلي',
                            icon: f.hasVideo ? 'fa-solid fa-video' : 'fa-solid fa-music',
                            url: f.directUrl || f.url || '',
                            directUrl: f.directUrl || f.url || '',
                        });
                    });
                } else if (source === 'facebook') {
                    details = {
                        id: data.id,
                        url: data.url || urlToUse,
                        title: data.title || 'فيديو فيسبوك ريلز',
                        thumbnail: data.thumbnail,
                        duration: data.duration || 'HD',
                        platform: 'facebook'
                    };

                    data.formats.forEach((f: any) => {
                        options.push({
                            quality: f.quality,
                            format: f.format.toUpperCase(),
                            size: f.hasVideo ? 'فيديو' : 'صوت',
                            icon: f.hasVideo ? 'fa-solid fa-video' : 'fa-solid fa-music',
                            url: f.directUrl || f.url || '',
                            directUrl: f.directUrl || f.url || '',
                        });
                    });
                } else if (source === 'yts') {
                    details = {
                        id: data.id,
                        url: data.url || `https://www.youtube.com/watch?v=${data.id}`,
                        title: data.title,
                        thumbnail: data.thumbnail,
                        duration: data.duration,
                        platform: 'youtube'
                    };

                    data.formats.forEach((f: any) => {
                        options.push({
                            quality: f.quality,
                            format: f.format.toUpperCase(),
                            size: f.hasVideo ? 'فيديو' : 'صوت',
                            icon: f.hasVideo ? 'fa-solid fa-video' : 'fa-solid fa-music',
                            url: '',
                            loaderFormat: f.loaderFormat
                        });
                    });
                } else {
                    details = {
                        id: data.id,
                        url: data.url,
                        title: data.title,
                        thumbnail: data.thumbnail,
                        duration: typeof data.duration === 'number' ? formatDuration(data.duration) : data.duration,
                    };
                    options = data.formats || [];
                }

                // Deduplicate Options
                const uniqueOptions = options.reduce((acc: DownloadOption[], current) => {
                    const dup = acc.find(item => item.quality === current.quality && item.icon === current.icon);
                    if (!dup) acc.push(current);
                    return acc;
                }, []);

                setVideoDetails(details);
                setDownloadOptions(uniqueOptions);
                setShowOptions(true);
            } else {
                // Search YouTube
                const res = await fetch(`/api/search?q=${encodeURIComponent(urlToUse)}`);
                const resText = await res.text();
                let data: any;
                try {
                    data = JSON.parse(resText);
                } catch {
                    throw new Error('تعذر البحث عن الفيديوهات حالياً');
                }

                if (!res.ok || data.error) {
                    throw new Error(data.error || 'تعذر البحث عن الفيديوهات');
                }

                if (!data.results || data.results.length === 0) {
                    setError('لم يتم العثور على نتائج بحث. جرب كلمات بحث أخرى أو ضع رابط الفيديو مباشرة.');
                } else {
                    setSearchResults(data.results);
                }
            }
        } catch (finalError: any) {
            console.error("Fetch failed:", finalError);
            setError(finalError instanceof Error ? finalError.message : 'نعتذر، حدث خطأ أثناء جلب البيانات. حاول مرة أخرى.');
        } finally {
            setIsLoading(false);
        }
    }, [url]);

    const handleDownload = useCallback(async (option: DownloadOption, customParams?: Record<string, string>) => {
        setSelectedOption(option);
        setIsDownloading(true);
        setError(null);

        const isMp3 = option.format.toUpperCase() === 'MP3' || option.quality.includes('صوت') || option.quality.includes('MP3');
        const videoTitle = videoDetails?.title || 'JoeTube_download';
        const targetVideoUrl = videoDetails?.url || (videoDetails?.id ? `https://www.youtube.com/watch?v=${videoDetails.id}` : url);
        const formatParam = option.loaderFormat || (isMp3 ? 'mp3' : 'mp4');
        const safeFileName = `${videoTitle}.${isMp3 ? 'mp3' : 'mp4'}`;

        setDownloadToast({
            message: `جاري بدء تنزيل (${option.quality})...`,
            subtitle: videoTitle,
            type: 'loading'
        });

        // Trigger native browser download directly
        const triggerDownload = (downloadUrl: string, fileName: string) => {
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = fileName;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };

        try {
            // Case 1: Direct link available (TikTok, Facebook, Instagram direct CDN)
            if (option.directUrl && !targetVideoUrl.includes('youtube.com') && !targetVideoUrl.includes('youtu.be')) {
                const proxyDirectLink = `/api/proxy-download?url=${encodeURIComponent(option.directUrl)}&title=${encodeURIComponent(videoTitle)}&format=${encodeURIComponent(option.format.toLowerCase())}`;
                
                // Pre-flight check to verify direct CDN URL validity before triggering download
                const headRes = await fetch(proxyDirectLink, { method: 'HEAD', signal: AbortSignal.timeout(6000) }).catch(() => null);
                if (headRes && !headRes.ok) {
                    throw new Error('انتهت صلاحية رابط الوسائط المباشر، يرجى إعادة فحص الرابط.');
                }
                const headType = (headRes?.headers.get('content-type') || '').toLowerCase();
                if (headType.includes('text/html') || headType.includes('application/json')) {
                    throw new Error('استجاب المصدر بصفحة ويب بدلاً من ملف الوسائط.');
                }

                triggerDownload(proxyDirectLink, safeFileName);
                addToHistory(option, videoDetails, proxyDirectLink);
                setReadyDownloadUrl({
                    url: proxyDirectLink,
                    title: videoTitle,
                    quality: option.quality
                });
                setDownloadToast({
                    message: `تم بدء تنزيل "${videoTitle}" بنجاح! 🚀`,
                    subtitle: `الصيغة: ${option.format} • بدأ التحميل المباشر لجهازك`,
                    type: 'success'
                });
                return;
            }

            // Case 2: YouTube / Converted Media Download
            // Step A: Real server-side preparation & stream verification
            const queryObj: Record<string, string> = {
                url: targetVideoUrl,
                format: formatParam,
                title: customParams?.title || videoTitle,
                ...(customParams || {})
            };
            const queryStr = new URLSearchParams(queryObj).toString();
            const res = await fetch(`/api/download?${queryStr}`, { signal: AbortSignal.timeout(30000) });
            
            if (!res.ok) {
                const errData = await res.json().catch(() => null);
                throw new Error(errData?.error || 'تعذر استخراج ملف الوسائط لهذا الفيديو، يرجى اختيار جودة أخرى مثل MP3 أو 360p.');
            }

            const data = await res.json().catch(() => null);
            if (!data || !data.download_url) {
                throw new Error('لم يتم استلام رابط تنزيل صالح من الخادم.');
            }

            const finalDownloadUrl = data.download_url;

            // Step B: Ironclad pre-flight stream check to verify media validity and block HTML error files
            const headRes = await fetch(finalDownloadUrl, { method: 'HEAD', signal: AbortSignal.timeout(8000) }).catch(() => null);
            if (!headRes || !headRes.ok) {
                throw new Error('تعذر تأكيد جاهزية تدفق الفيديو من السيرفر. يرجى تجربة جودة أخرى (مثل MP3 أو 360p).');
            }

            const cType = (headRes.headers.get('content-type') || '').toLowerCase();
            if (cType.includes('text/html') || cType.includes('application/xhtml') || cType.includes('application/json')) {
                throw new Error('استجاب السيرفر بصفحة ويب بدلاً من ملف الوسائط، تم إلغاء التحميل لحماية ملفاتك.');
            }

            // Step C: Trigger browser download only after 100% verified media stream
            triggerDownload(finalDownloadUrl, safeFileName);
            addToHistory(option, videoDetails, finalDownloadUrl);
            setReadyDownloadUrl({
                url: finalDownloadUrl,
                title: videoTitle,
                quality: option.quality
            });
            setDownloadToast({
                message: `تم بدء تنزيل "${videoTitle}" بنجاح! 🚀`,
                subtitle: `الجودة: ${option.quality} • بدأ التحميل المباشر لجهازك`,
                type: 'success'
            });
        } catch (e: any) {
            console.error("Download error:", e);
            setDownloadToast({
                message: 'تعذر تنزيل هذا الخيار',
                subtitle: e.message || 'يرجى اختيار جودة أخرى أو التأكد من أن الرابط متاح',
                type: 'error'
            });
        } finally {
            setTimeout(() => {
                setIsDownloading(false);
                setSelectedOption(null);
            }, 1200);
        }
    }, [url, videoDetails, addToHistory]);


    const handleQuickLinkClick = (_name: string) => {
        setActiveTab('home');
        const input = document.querySelector('input');
        if (input) input.focus();
    };

    const handleSelectSearchResult = (selectedUrl: string) => {
        setActiveTab('home');
        setUrl(selectedUrl);
        handleFetchVideo(selectedUrl);
    };

    const handleDownloadVoice = useCallback(() => {
        const voiceOption = downloadOptions.find(opt => opt.format === 'MP3' && (opt.icon.includes('music') || opt.size.includes('فويس')));
        if (voiceOption) {
            handleDownload(voiceOption);
        } else if (videoDetails?.musicInfo?.playUrl) {
            handleDownload({
                quality: 'فويس التيك توك الأصلي MP3',
                format: 'MP3',
                size: 'فويس أصلي',
                icon: 'fa-solid fa-music',
                url: videoDetails.musicInfo.playUrl,
                directUrl: videoDetails.musicInfo.playUrl
            });
        }
    }, [downloadOptions, videoDetails, handleDownload]);

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 flex flex-col pb-20">
            <OfflineIndicator />

            <main className="flex-grow flex flex-col items-center w-full max-w-md mx-auto bg-white min-h-screen shadow-2xl relative">
                <Header />
                
                <PWAInstallBanner />

                {/* Main View: Home Tab */}
                {activeTab === 'home' && (
                    <>
                        <div className="w-full px-4 -mt-6 z-10">
                            <div className="bg-white p-2 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100">
                                 <UrlInputForm
                                    url={url}
                                    setUrl={setUrl}
                                    onSubmit={() => handleFetchVideo()}
                                    isLoading={isLoading}
                                />
                            </div>
                            {error && (
                                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mt-4 text-center text-xs font-bold border border-red-100 animate-fade-in-up">
                                    <i className="fa-solid fa-triangle-exclamation ml-1"></i>
                                    {error}
                                </div>
                            )}
                        </div>

                        <div className="w-full px-4 mt-2 mb-24 flex-grow">
                            {isLoading && <Loader />}
                            
                            {!videoDetails && searchResults.length === 0 && !isLoading && !error && (
                                <QuickLinks onLinkClick={handleQuickLinkClick} />
                            )}

                            {searchResults.length > 0 && !isLoading && !videoDetails && (
                                <SearchResults results={searchResults} onSelect={handleSelectSearchResult} />
                            )}

                            {videoDetails && !isLoading && (
                                <div className="animate-fade-in-up mt-6">
                                    <VideoPreviewCard 
                                        {...videoDetails} 
                                        onOpenTools={() => setIsToolsOpen(true)}
                                    />

                                    {/* TikTok Voice Player & Fast Downloader */}
                                    {videoDetails.musicInfo?.playUrl && (
                                        <VoicePlayer 
                                            musicInfo={videoDetails.musicInfo}
                                            onDownloadVoice={handleDownloadVoice}
                                            isDownloading={isDownloading}
                                        />
                                    )}

                                    {/* Quick Tools & Floating Mini Player Bar */}
                                    <div className="flex gap-2 mb-3">
                                        <button
                                            onClick={() => setShowMiniPlayer(!showMiniPlayer)}
                                            className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                        >
                                            <i className="fa-solid fa-headphones text-amber-600"></i>
                                            <span>{showMiniPlayer ? 'إخفاء المشغل العائم' : 'مشغل عائم في الخلفية 🎧'}</span>
                                        </button>

                                        <button
                                            onClick={() => setIsToolsOpen(true)}
                                            className="flex-1 py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                                        >
                                            <i className="fa-solid fa-wand-magic-sparkles text-amber-600"></i>
                                            <span>15 أداة وسائط ⚡</span>
                                        </button>
                                    </div>

                                    {/* Direct Download Action Button if ready */}
                                    {readyDownloadUrl && (
                                        <div className="mb-4 p-4 bg-yellow-50 border-2 border-[#fce116] rounded-2xl animate-fade-in-up text-center">
                                            <p className="text-xs font-bold text-gray-700 mb-2">
                                                <i className="fa-solid fa-circle-check text-green-500 ml-1"></i>
                                                تم تجهيز رابط التنزيل ({readyDownloadUrl.quality})
                                            </p>
                                            <a
                                                href={readyDownloadUrl.url}
                                                download={`${readyDownloadUrl.title}.${readyDownloadUrl.quality.includes('MP3') || readyDownloadUrl.quality.includes('صوت') ? 'mp3' : 'mp4'}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="w-full inline-flex items-center justify-center gap-2 bg-[#fce116] hover:bg-[#e5cc14] text-black font-bold py-3 px-4 rounded-xl shadow-md transition-all active:scale-95"
                                            >
                                                <i className="fa-solid fa-arrow-down"></i>
                                                <span>انقر هنا لإعادة التنزيل فوراً ⚡</span>
                                            </a>
                                        </div>
                                    )}
                                    
                                    {!showOptions && (
                                        <button
                                            onClick={() => setShowOptions(true)}
                                            className="w-full mt-2 bg-[#fce116] hover:bg-[#e5cc14] text-black text-lg font-bold py-3.5 rounded-xl shadow-lg shadow-yellow-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <i className="fa-solid fa-download"></i>
                                            <span>تحميل بجودات متعددة</span>
                                        </button>
                                    )}

                                    {showOptions && (
                                        <div className="mt-4">
                                            <DownloadOptions 
                                                options={downloadOptions}
                                                onSelect={handleDownload}
                                                isDownloading={isDownloading}
                                                selectedOption={selectedOption}
                                                downloadProgress={downloadProgress}
                                            />
                                            <button 
                                                onClick={() => setShowOptions(false)}
                                                className="w-full text-center text-gray-400 text-sm mt-4 hover:text-gray-600"
                                            >
                                                إلغاء
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* Batch Downloader & Playlist Tab */}
                {activeTab === 'batch' && (
                    <div className="w-full px-4 mb-24 flex-grow mt-2">
                        <BatchDownloader 
                            onAddToHistory={addToHistory} 
                            initialUrl={batchInitialUrl}
                            initialMode={batchInitialMode}
                        />
                    </div>
                )}

                {/* Tools Tab (10 Features Studio) */}
                {activeTab === 'tools' && (
                    <div className="w-full px-4 mb-24 flex-grow mt-4 animate-fade-in text-right" dir="rtl">
                        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-[#fce116] p-4 rounded-3xl text-black shadow-md mb-4 flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-extrabold text-base">استوديو أدوات الوسائط المتقدمة</h3>
                                    <span className="bg-black text-[#fce116] text-[10px] font-black px-2 py-0.5 rounded-full">Coming Soon</span>
                                </div>
                                <p className="text-xs font-semibold opacity-90 mt-0.5">15 ميزة احترافية جديدة قادمة قريباً • Coming Soon</p>
                            </div>
                            <span className="w-10 h-10 rounded-2xl bg-black/10 flex items-center justify-center text-lg">
                                <i className="fa-solid fa-wand-magic-sparkles"></i>
                            </span>
                        </div>

                        {/* List of 15 Features with Coming Soon Labels */}
                        <div className="grid grid-cols-2 gap-2.5 mb-4">
                            {[
                                { id: 'trimmer', title: '1. قص واقتطاع ✂️', desc: 'قص مقاطع معينة بدقة' },
                                { id: 'equalizer', title: '2. معادل الصوت 🎚️', desc: 'مضخم بيز و200% صوت' },
                                { id: 'thumbnail', title: '3. صورة الغلاف 4K 🖼️', desc: 'تحميل البوستر الرسمي' },
                                { id: 'subtitles', title: '4. الترجمة SRT 📝', desc: 'استخراج الكلمات المتزامنة' },
                                { id: 'converter', title: '5. محول الصيغ 🔄', desc: 'WAV, M4A, FLAC, OGG' },
                                { id: 'ringtone', title: '6. رنة هاتف 30s 📱', desc: 'نغمات منبه مع تلاشي' },
                                { id: 'datasaver', title: '7. توفير الباقة 📊', desc: 'حاسبة توفير الميغابايت' },
                                { id: 'queue', title: '8. قائمة الانتظار ⏳', desc: 'مقياس سرعة وسحب دفعي' },
                                { id: 'id3', title: '9. بيانات الأغنية 🏷️', desc: 'محرر أسماء الفنان والألبوم' },
                                { id: 'qr', title: '10. مسح كود QR 📲', desc: 'نقل فوري للهاتف' },
                                { id: 'gif', title: '11. صانع GIF 🎞️', desc: 'تحويل الفيديو لصورة متحركة' },
                                { id: 'podcast', title: '12. وضع البودكاست 🎙️', desc: 'توضيح الكلام وتسريعه' },
                                { id: 'chapters', title: '13. تقسيم الفصول 💿', desc: 'تحميل أغاني الألبومات' },
                                { id: 'script', title: '14. النصوص والوسوم 📜', desc: 'نسخ الهاشتاغات والوصف' },
                                { id: 'diagnostics', title: '15. فحص الرابط 🔍', desc: 'كشف قيود العمر والبث' }
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setIsToolsOpen(true)}
                                    className="p-3 bg-white rounded-2xl border border-gray-100 shadow-xs hover:border-amber-300 hover:bg-amber-50/50 transition-all text-right cursor-pointer group flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-1 mb-1">
                                            <div className="font-extrabold text-xs text-gray-900 group-hover:text-amber-800">{f.title}</div>
                                        </div>
                                        <div className="text-[10px] text-gray-500 mt-0.5">{f.desc}</div>
                                    </div>
                                    <div className="mt-2 pt-1 border-t border-gray-50 flex items-center justify-between">
                                        <span className="text-[9px] bg-amber-100 text-amber-800 font-black px-1.5 py-0.5 rounded-md">
                                            قريباً • Coming Soon
                                        </span>
                                        <i className="fa-solid fa-arrow-left text-[9px] text-gray-400 group-hover:text-amber-600 transition-transform group-hover:-translate-x-0.5"></i>
                                    </div>
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => setIsToolsOpen(true)}
                            className="w-full bg-[#fce116] hover:bg-[#e5cc14] text-black font-extrabold py-3.5 px-4 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm cursor-pointer"
                        >
                            <i className="fa-solid fa-play"></i>
                            <span>فتح استوديو الأدوات التفاعلي الكامل</span>
                        </button>
                    </div>
                )}

                {/* History Tab */}
                {activeTab === 'history' && (
                    <div className="w-full px-4 mb-24 flex-grow mt-2">
                        <DownloadHistory 
                            history={history}
                            onClearHistory={handleClearHistory}
                            onDeleteHistoryItem={handleDeleteHistoryItem}
                            onSelectUrl={(selectedUrl) => {
                                setActiveTab('home');
                                setUrl(selectedUrl);
                                handleFetchVideo(selectedUrl);
                            }}
                        />
                    </div>
                )}

                {/* Comparison Tab */}
                {activeTab === 'compare' && (
                    <div className="w-full px-4 mb-24 flex-grow mt-2">
                        <SnapTubeVsJoeTube />
                    </div>
                )}

                {/* Reviews & Rating Tab */}
                {activeTab === 'reviews' && (
                    <div className="w-full px-4 mb-24 flex-grow mt-2">
                        <RatingFeedbackModal />
                    </div>
                )}
                
                <BottomNav 
                    activeTab={activeTab}
                    onChangeTab={setActiveTab}
                    historyCount={history.length}
                />

                {/* Instant Download Toast Notification Banner */}
                {downloadToast && (
                    <div 
                        role="status"
                        aria-live="polite"
                        className={`fixed bottom-20 left-4 right-4 max-w-md mx-auto z-50 p-4 rounded-2xl shadow-2xl flex items-center justify-between transition-all duration-300 animate-fade-in-up border ${
                            downloadToast.type === 'error'
                                ? 'bg-red-950/95 border-red-500/50 text-white'
                                : downloadToast.type === 'success'
                                ? 'bg-gray-900/95 border-green-500/50 text-white'
                                : 'bg-gray-900/95 border-[#fce116]/50 text-white'
                        } backdrop-blur-md`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                downloadToast.type === 'error' 
                                    ? 'bg-red-500/20 text-red-400' 
                                    : downloadToast.type === 'success' 
                                    ? 'bg-green-500/20 text-green-400' 
                                    : 'bg-yellow-400/20 text-[#fce116]'
                            }`}>
                                {downloadToast.type === 'loading' && <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>}
                                {downloadToast.type === 'success' && <i className="fa-solid fa-circle-check text-lg"></i>}
                                {downloadToast.type === 'error' && <i className="fa-solid fa-triangle-exclamation text-lg"></i>}
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-sm leading-tight text-white">{downloadToast.message}</p>
                                {downloadToast.subtitle && (
                                    <p className="text-xs text-gray-300 mt-1 line-clamp-1">{downloadToast.subtitle}</p>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={() => setDownloadToast(null)} 
                            className="text-gray-400 hover:text-white p-1 rounded-lg ml-2 transition-colors"
                            aria-label="إغلاق التنبيه"
                        >
                            <i className="fa-solid fa-xmark text-sm"></i>
                        </button>
                    </div>
                )}

                {/* 15 Advanced Media Tools Studio Modal */}
                <MediaToolsStudio
                    isOpen={isToolsOpen}
                    onClose={() => setIsToolsOpen(false)}
                    videoDetails={videoDetails}
                    videoUrl={videoDetails?.url || url}
                    onDownloadOption={handleDownload}
                />

                {/* Floating Mini Player & Audio Visualizer */}
                {showMiniPlayer && videoDetails && (
                    <FloatingMiniPlayer
                        videoDetails={videoDetails}
                        onClose={() => setShowMiniPlayer(false)}
                    />
                )}
            </main>
        </div>
    );
};

export default App;
