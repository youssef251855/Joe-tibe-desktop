import React, { useState, useEffect, useCallback } from "react";
import { Header } from "./components/Header";
import { Sidebar } from "./components/Sidebar";
import { UrlInputForm } from "./components/UrlInputForm";
import { VideoPreviewCard } from "./components/VideoPreviewCard";
import { DownloadOptions } from "./components/DownloadOptions";
import { SearchResults } from "./components/SearchResults";
import { DownloadHistory } from "./components/DownloadHistory";
import { PlaylistPanel } from "./components/PlaylistPanel";
import type { VideoDetails, QualityOption, SearchResultItem, HistoryItem, PlaylistDetails } from "./types";
import { apiUrl } from "./lib/apiBase";
import { saveFile } from "./lib/downloader";
import { isDesktopApp, isInstagramUrl, loadDesktopDetails, loadDesktopQualities, runDesktopDownload } from "./lib/desktop";

const LOCAL_STORAGE_HISTORY_KEY = "joetube_download_history_v3";

const PLATFORM_CARDS = [
  { name: "YouTube", sub: "فيديوهات طويلة", icon: "fa-brands fa-youtube", color: "text-red-500" },
  { name: "TikTok", sub: "فيديوهات قصيرة", icon: "fa-brands fa-tiktok", color: "text-white" },
  { name: "Facebook", sub: "Reels", icon: "fa-brands fa-facebook", color: "text-blue-500" },
  { name: "Instagram", sub: "Reels / Post", icon: "fa-brands fa-instagram", color: "text-pink-500" }
];

const FORMATS = [
  { label: "فيديو", value: "MP4", icon: "fa-solid fa-film" },
  { label: "صوت", value: "MP3", icon: "fa-solid fa-music" },
  { label: "جودة عالية", value: "HD", icon: "fa-solid fa-clapperboard" },
  { label: "دقة عالية", value: "4K", icon: "fa-solid fa-tv" }
];

const FEATURES = [
  "استخراج الصوت من الفيديو",
  "تحويل إلى MP3",
  "تنزيل قوائم التشغيل",
  "دعم جميع الأجهزة",
  "واجهة بسيطة وسريعة"
];

const App: React.FC = () => {
  const [url, setUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [videoDetails, setVideoDetails] = useState<VideoDetails | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [activeOption, setActiveOption] = useState<QualityOption | null>(null);
  const [activeNav, setActiveNav] = useState<string>("home");
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">(() =>
    localStorage.getItem("joetube_theme") === "light" ? "light" : "dark"
  );

  const [toast, setToast] = useState<{
    message: string;
    subtitle?: string;
    type: "loading" | "success" | "error";
  } | null>(null);

  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Lifetime count of videos actually downloaded (persisted across sessions)
  const [totalDownloads, setTotalDownloads] = useState<number>(() => {
    const n = Number(localStorage.getItem("joetube_total_downloads"));
    return Number.isFinite(n) && n > 0 ? n : 0;
  });

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch {}
  }, [history]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("joetube_theme", theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem("joetube_total_downloads", String(totalDownloads));
    } catch {}
  }, [totalDownloads]);

  useEffect(() => {
    if (toast && toast.type !== "loading") {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleFetchOrSearch = async (inputUrlOrQuery?: string, keepPlaylist = false) => {
    const target = (inputUrlOrQuery || url).trim();
    if (!target) return;

    setIsLoading(true);
    setError(null);
    setVideoDetails(null);
    setSearchResults([]);
    if (!keepPlaylist) setPlaylist(null);

    const isPlaylist =
      /youtube\.com|youtu\.be/i.test(target) &&
      /[?&]list=([A-Za-z0-9_-]{6,})/i.test(target) &&
      !/[?&]v=[A-Za-z0-9_-]{11}/i.test(target);

    try {
      if (isPlaylist) {
        const res = await fetch(apiUrl(`/api/playlist?url=${encodeURIComponent(target)}`));
        const json = await res.json().catch(() => null);
        if (!res.ok || !json?.success) {
          throw new Error(json?.error || "تعذر جلب قائمة التشغيل.");
        }
        setPlaylist(json.data);
        return;
      }

      const isDirectLink =
        /youtube\.com|youtu\.be|tiktok\.com|douyin\.com|vm\.tiktok\.com|vt\.tiktok\.com|facebook\.com|fb\.watch|fb\.com|instagram\.com|instagr\.am|twitter\.com|x\.com|t\.co/i.test(
          target
        ) || /^[a-zA-Z0-9_-]{11}$/.test(target);

      let desktopErr: Error | null = null;
      if (isDirectLink && isDesktopApp() && isInstagramUrl(target)) {
        try {
          setVideoDetails(await loadDesktopDetails(target));
          return;
        } catch (e: any) {
          desktopErr = e instanceof Error ? e : new Error(String(e));
        }
      }

      if (isDirectLink) {
        const res = await fetch(apiUrl(`/api/video?url=${encodeURIComponent(target)}`), {
          signal: AbortSignal.timeout(30000)
        });
        const raw = await res.text();
        let json: any = null;
        try {
          json = raw ? JSON.parse(raw) : null;
        } catch {
          json = null;
        }

        if (!res.ok || !json?.success) {
          if (desktopErr) throw desktopErr; // yt-dlp's explanation (e.g. login required) is more useful
          if (json?.error) throw new Error(json.error);
          if (!json) {
            throw new Error(
              res.status === 401
                ? "النشر محمي بمصادقة Vercel؛ افتح الصفحة الرئيسية ثم أعد المحاولة أو عطّل Deployment Protection."
                : `استجابة غير صالحة من السيرفر (HTTP ${res.status}) — قد يكون انتهاء مهلة الدالة أو حجب يوتيوب للـ IP.`
            );
          }
          throw new Error("تعذر استخراج بيانات الفيديو.");
        }

        setVideoDetails(json.data);
        if (isDesktopApp() && json.data?.platform === "youtube") {
          const vid = json.data as VideoDetails;
          void loadDesktopQualities(vid.url).then((q) => {
            if (q) setVideoDetails((prev) => (prev && prev.id === vid.id ? { ...prev, qualities: q } : prev));
          });
        }
      } else {
        const res = await fetch(apiUrl(`/api/search?q=${encodeURIComponent(target)}`), {
          signal: AbortSignal.timeout(30000)
        });
        const json = await res.json().catch(() => null);

        if (!res.ok || !json?.success) {
          throw new Error(json?.error || "فشل البحث.");
        }

        if (!json.results || json.results.length === 0) {
          setError("لم يتم العثور على نتائج مطابقة. جرب كلمات بحث أخرى.");
        } else {
          setSearchResults(json.results);
        }
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err?.message || "حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectSearchResult = (selectedUrl: string) => {
    setUrl(selectedUrl);
    handleFetchOrSearch(selectedUrl);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownloadStart = useCallback(
    async (option: QualityOption) => {
      if (!videoDetails) return;

      setIsDownloading(true);
      setActiveOption(option);

      setToast({
        message: `جاري تجهيز (${option.quality})...`,
        subtitle: `المقطع: ${videoDetails.title}`,
        type: "loading"
      });

      const ext = option.format;
      const safeFileName = `${videoDetails.title.substring(0, 50)}.${ext}`;

      const triggerNativeBrowserDownload = (downloadUrl: string, fileName: string) =>
        saveFile(downloadUrl, fileName, (pct) =>
          setToast({
            message: `جاري التنزيل... ${pct}%`,
            subtitle: `المقطع: ${videoDetails.title}`,
            type: "loading"
          })
        );

      try {
        // Desktop app: yt-dlp + ffmpeg run locally (real qualities, real MP3, Instagram stories).
        if (isDesktopApp() && (videoDetails.platform === "youtube" || videoDetails.platform === "instagram")) {
          const done = await runDesktopDownload(videoDetails.url, option, (pct, note) =>
            setToast({ message: `جاري التحميل... ${pct}%`, subtitle: note || `المقطع: ${videoDetails.title}`, type: "loading" })
          );
          setTotalDownloads((n) => n + 1);
          setHistory((prev) => [
            {
              id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              videoId: videoDetails.id,
              title: videoDetails.title,
              thumbnail: videoDetails.thumbnail,
              quality: option.quality,
              format: option.format,
              downloadUrl: videoDetails.url,
              downloadedAt: Date.now()
            },
            ...prev.filter((p) => p.videoId !== videoDetails.id).slice(0, 25)
          ]);
          setToast({
            message: done.count > 1 ? `تم حفظ ${done.count} ملفات ✅` : "تم الحفظ بنجاح ✅",
            subtitle: `${done.fileName || videoDetails.title} — Downloads\\JoeTube`,
            type: "success"
          });
          return;
        }

        // Non-YouTube platforms (TikTok / Facebook / Instagram / X): download the resolved
        // direct-CDN URL through the secure serverless media proxy.
        if (option.directUrl && videoDetails.platform !== "youtube") {
          const proxyUrl = apiUrl(`/api/stream?id=${encodeURIComponent(option.directUrl)}&format=${encodeURIComponent(
            option.format
          )}&title=${encodeURIComponent(videoDetails.title)}`);

          const head = await fetch(proxyUrl, {
            method: "HEAD",
            signal: AbortSignal.timeout(10000)
          }).catch(() => null);
          const headType = (head?.headers.get("content-type") || "").toLowerCase();
          if (!head || !head.ok || headType.includes("text/html") || headType.includes("application/json")) {
            throw new Error("انتهت صلاحية رابط الوسائط أو تعذر الوصول إليه. يرجى إعادة فحص الرابط.");
          }

          const savedAt = await triggerNativeBrowserDownload(proxyUrl, safeFileName);
          setTotalDownloads((n) => n + 1);

          setHistory((prev) => [
            {
              id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              videoId: videoDetails.id,
              title: videoDetails.title,
              thumbnail: videoDetails.thumbnail,
              quality: option.quality,
              format: option.format,
              downloadUrl: proxyUrl,
              downloadedAt: Date.now()
            },
            ...prev.filter((p) => p.videoId !== videoDetails.id).slice(0, 25)
          ]);

          setToast({
            message: `تم بدء تنزيل "${videoDetails.title.substring(0, 35)}..." بنجاح! 🚀`,
            subtitle: savedAt ? `تم الحفظ في: ${savedAt}` : `الصيغة: ${option.format.toUpperCase()} • جاري الحفظ في جهازك`,
            type: "success"
          });
          return;
        }

        // Step 1: Call Express Serverless Download Preparation Endpoint
        const prepQuery = new URLSearchParams({
          url: videoDetails.url,
          format: option.formatCode,
          title: videoDetails.title
        }).toString();

        const prepRes = await fetch(apiUrl(`/api/download?${prepQuery}`), {
          signal: AbortSignal.timeout(30000)
        });

        if (!prepRes.ok) {
          const errData = await prepRes.json().catch(() => null);
          throw new Error(errData?.error || "تعذر تجهيز ملف الوسائط عبر السيرفرلس.");
        }

        const prepData = await prepRes.json().catch(() => null);
        if (!prepData) {
          throw new Error("لم يتم استلام رد صالح من خادم السيرفرلس.");
        }

        // Direct Stream URL proxied by our own serverless /api/stream (no third-party redirects)
        if (!prepData.download_url) {
          throw new Error(prepData.error || "لم يتم استلام رابط تنزيل مباشر صالح.");
        }

        const finalStreamUrl = apiUrl(prepData.download_url);

        const headCheck = await fetch(finalStreamUrl, {
          method: "HEAD",
          signal: AbortSignal.timeout(15000)
        }).catch(() => null);

        if (headCheck && !headCheck.ok) {
          const errData = await headCheck.json().catch(() => null);
          throw new Error(
            errData?.error || `تعذر التنزيل بجودة ${option.quality}، جرّب جودة أخرى مثل MP3 أو 360p.`
          );
        }

        const contentType = (headCheck?.headers.get("content-type") || "").toLowerCase();
        if (contentType.includes("text/html") || contentType.includes("application/xhtml")) {
          throw new Error(
            `أعاد المصدر صفحة ويب بدلاً من ملف وسائط لجودة ${option.quality}، جرّب MP3 أو 360p.`
          );
        }

        const savedAt = await triggerNativeBrowserDownload(finalStreamUrl, safeFileName);
        setTotalDownloads((n) => n + 1);

        setHistory((prev) => [
          {
            id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            videoId: videoDetails.id,
            title: videoDetails.title,
            thumbnail: videoDetails.thumbnail,
            quality: option.quality,
            format: option.format,
            downloadUrl: finalStreamUrl,
            downloadedAt: Date.now()
          },
          ...prev.filter((p) => p.videoId !== videoDetails.id).slice(0, 25)
        ]);

        setToast({
          message: `تم بدء تنزيل "${videoDetails.title.substring(0, 35)}..." بنجاح! 🚀`,
          subtitle: savedAt ? `تم الحفظ في: ${savedAt}` : `الصيغة: ${option.format.toUpperCase()} • جاري الحفظ في جهازك`,
          type: "success"
        });
      } catch (err: any) {
        console.error("Download failed:", err);
        setToast({
          message: "تعذر تنزيل هذا الخيار حالياً",
          subtitle: err?.message || "يرجى تجربة جودة أخرى أو التأكد من إتاحة الفيديو",
          type: "error"
        });
      } finally {
        setTimeout(() => {
          setIsDownloading(false);
          setActiveOption(null);
        }, 1200);
      }
    },
    [videoDetails]
  );

  const handleClearHistory = () => setHistory([]);
  const handleRemoveHistoryItem = (id: string) => setHistory((prev) => prev.filter((it) => it.id !== id));

  const focusHeroInput = () => {
    document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>("#hero-input input");
      input?.focus();
    }, 400);
  };

  const handleNavSelect = (id: string) => {
    setActiveNav(id);
    if (id === "home") document.getElementById("top")?.scrollIntoView({ behavior: "smooth" });
    if (id === "downloads" || id === "history") document.getElementById("history")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div id="top" className="min-h-screen bg-neon-field text-zinc-100">
      <Header
        onSearch={(q) => handleFetchOrSearch(q)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
      />

      <div dir="ltr" className="mx-auto max-w-[1400px] px-4 py-6 flex gap-6 items-start">
        <Sidebar active={activeNav} onSelect={handleNavSelect} />

        {/* Main column */}
        <main dir="rtl" className="flex-1 min-w-0">
          {/* Hero */}
          <section className="relative overflow-hidden rounded-3xl border border-yellow-400/20 bg-gradient-to-l from-[#1a1400] via-[#0d0b04] to-[#050506] p-6 sm:p-10 mb-6">
            <div className="relative z-10 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-3">
                كل محتواك في <span className="text-gold-grad">مكان واحد</span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-400 leading-relaxed mb-6 font-medium">
                حمّل فيديوهاتك من يوتيوب، تيك توك، فيسبوك ريلز، إنستغرام وإكس بجودة عالية وبكل سهولة،
                مباشرة بدون برامج.
              </p>

              <div id="hero-input">
                <UrlInputForm url={url} setUrl={setUrl} onSubmit={(val) => handleFetchOrSearch(val)} isLoading={isLoading} />
              </div>
            </div>

            {/* Phone mockup */}
            <div className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 z-0">
              <div className="relative w-44 h-80 rounded-[2.2rem] border-4 border-[#26262e] bg-black shadow-2xl shadow-yellow-500/10 rotate-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/10 to-transparent"></div>
                <div className="h-full flex flex-col items-center justify-center gap-3">
                  <img src="/apple-touch-icon.png" alt="JoeTube" className="w-20 h-20 rounded-2xl object-cover" />
                  <span className="text-gold-grad text-xl font-black">JoeTube</span>
                  <span className="text-[10px] text-zinc-500 tracking-widest">Download • Watch • Enjoy</span>
                </div>
              </div>
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="w-full bg-red-500/10 border border-red-500/30 text-red-300 p-4 rounded-2xl mb-6 flex items-start gap-3 text-sm font-semibold">
              <i className="fa-solid fa-triangle-exclamation text-red-400 text-lg shrink-0 mt-0.5"></i>
              <div className="flex-grow">
                <p>{error}</p>
              </div>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-white p-1">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          )}

          {/* Platform cards */}
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {PLATFORM_CARDS.map((p) => (
              <button
                key={p.name}
                onClick={focusHeroInput}
                className="group bg-[#101014] border border-[#26262e] hover:border-yellow-400/50 rounded-2xl p-4 sm:p-5 flex flex-col items-center gap-2 transition-all hover:-translate-y-1"
              >
                <span className="grid place-items-center w-12 h-12 rounded-2xl bg-[#050506] border border-[#26262e] group-hover:border-yellow-400/40">
                  <i className={`${p.icon} ${p.color} text-2xl`}></i>
                </span>
                <span className="text-sm font-bold text-white">{p.name}</span>
                <span className="text-[11px] text-zinc-500">{p.sub}</span>
              </button>
            ))}
          </section>

          {/* Video Preview & Options */}
          {videoDetails && (
            <div className="w-full animate-fade-in">
              <VideoPreviewCard video={videoDetails} />
              <DownloadOptions
                video={videoDetails}
                onDownloadStart={handleDownloadStart}
                isDownloading={isDownloading}
                activeOption={activeOption}
              />
            </div>
          )}

          {/* YouTube Playlist */}
          {playlist && (
            <PlaylistPanel
              playlist={playlist}
              onOpenVideo={(u) => {
                setUrl(u);
                handleFetchOrSearch(u, true);
              }}
              onClose={() => setPlaylist(null)}
            />
          )}

          {/* Search Results */}
          {!videoDetails && !playlist && (
            <SearchResults results={searchResults} onSelect={handleSelectSearchResult} isLoading={isLoading} />
          )}

          {/* Download History */}
          <DownloadHistory history={history} onClear={handleClearHistory} onRemove={handleRemoveHistoryItem} />
        </main>

        {/* Right rail */}
        <aside dir="rtl" className="hidden xl:flex w-72 shrink-0 flex-col gap-4 sticky top-24">
          <div className="bg-[#101014] border border-[#26262e] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-500 font-semibold mb-1">تم تحميل</p>
              <p className="text-2xl font-black text-white">{totalDownloads.toLocaleString("ar-EG")}</p>
              <p className="text-[11px] text-zinc-500">فيديو بنجاح</p>
            </div>
            <span className="grid place-items-center w-14 h-14 rounded-2xl bg-yellow-400/10 border border-yellow-400/20">
              <i className="fa-solid fa-cloud-arrow-down text-yellow-400 text-2xl"></i>
            </span>
          </div>

          <div className="bg-[#101014] border border-[#26262e] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">الصيغ المدعومة</h3>
            <div className="grid grid-cols-2 gap-3">
              {FORMATS.map((f) => (
                <div key={f.value} className="bg-[#050506] border border-[#26262e] rounded-xl p-3 flex flex-col items-center gap-1 text-center">
                  <i className={`${f.icon} text-yellow-400 text-lg`}></i>
                  <span className="text-xs font-black text-white">{f.value}</span>
                  <span className="text-[10px] text-zinc-500">{f.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#101014] border border-[#26262e] rounded-2xl p-5">
            <h3 className="text-sm font-bold text-white mb-4">مميزات رائعة</h3>
            <ul className="space-y-2.5">
              {FEATURES.map((feat) => (
                <li key={feat} className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
                  <i className="fa-solid fa-circle-check text-yellow-400"></i>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>

      {/* Floating Download Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
          <div
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 transition-all ${
              toast.type === "loading"
                ? "bg-[#0a0a0d]/95 border-yellow-500/40 text-white"
                : toast.type === "success"
                ? "bg-emerald-950/95 border-emerald-500/40 text-emerald-100"
                : "bg-red-950/95 border-red-500/40 text-red-100"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                toast.type === "loading"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : toast.type === "success"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {toast.type === "loading" ? (
                <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
              ) : toast.type === "success" ? (
                <i className="fa-solid fa-check text-lg"></i>
              ) : (
                <i className="fa-solid fa-triangle-exclamation text-lg"></i>
              )}
            </div>

            <div className="flex-grow overflow-hidden text-right">
              <h5 className="font-bold text-sm leading-tight">{toast.message}</h5>
              {toast.subtitle && <p className="text-xs opacity-80 truncate mt-0.5">{toast.subtitle}</p>}
            </div>

            <button onClick={() => setToast(null)} className="p-1 text-zinc-400 hover:text-white shrink-0">
              <i className="fa-solid fa-xmark text-xs"></i>
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-[#26262e] mt-8">
        <div dir="ltr" className="mx-auto max-w-[1400px] px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div dir="rtl" className="flex items-center gap-3">
            <img src="/apple-touch-icon.png" alt="JoeTube" className="w-9 h-9 rounded-xl object-cover" />
            <div>
              <p className="text-sm font-black text-white">JoeTube</p>
              <p className="text-[11px] text-zinc-500">More than a downloader...</p>
            </div>
          </div>

          <p dir="rtl" className="text-sm font-bold text-zinc-300">محتواك... بدون حدود</p>

          <div dir="rtl" className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <i className="fa-brands fa-youtube text-red-500"></i>
              <i className="fa-brands fa-tiktok text-white"></i>
              <i className="fa-brands fa-instagram text-pink-500"></i>
            </div>
            <span className="text-[11px] text-zinc-500">© 2027 JoeTube. جميع الحقوق محفوظة.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
