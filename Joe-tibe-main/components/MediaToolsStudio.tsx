import React, { useState, useEffect, useRef } from 'react';
import type { VideoDetails, DownloadOption } from '../types';

export interface MediaToolsStudioProps {
  isOpen: boolean;
  onClose: () => void;
  videoDetails: VideoDetails | null;
  videoUrl: string;
  onDownloadOption: (option: DownloadOption, customParams?: Record<string, string>) => void;
}

type ToolTab =
  | 'trimmer'
  | 'equalizer'
  | 'thumbnail'
  | 'subtitles'
  | 'converter'
  | 'ringtone'
  | 'datasaver'
  | 'queue'
  | 'id3'
  | 'qr'
  | 'gif'
  | 'podcast'
  | 'chapters'
  | 'script'
  | 'diagnostics';

export const MediaToolsStudio: React.FC<MediaToolsStudioProps> = ({
  isOpen,
  onClose,
  videoDetails,
  videoUrl,
  onDownloadOption
}) => {
  const [activeTool, setActiveTool] = useState<ToolTab>('trimmer');

  // Video parsing
  const videoId = videoDetails?.id || (videoUrl.includes('v=') ? videoUrl.split('v=')[1]?.split('&')[0] : '');
  const title = videoDetails?.title || 'JoeTube_Media';
  const durationSec = 180; // default estimated duration or from parsed video

  // Tool 1: Trimmer State
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(60);

  // Tool 2: Equalizer State (Web Audio API)
  const [bassGain, setBassGain] = useState<number>(6); // dB
  const [midGain, setMidGain] = useState<number>(0);
  const [trebleGain, setTrebleGain] = useState<number>(3);
  const [volumeBoost, setVolumeBoost] = useState<number>(120); // 100% - 200%
  const [eqPreset, setEqPreset] = useState<string>('bass');

  // Tool 4: Subtitles State
  const [selectedSubLang, setSelectedSubLang] = useState<string>('ar');
  const [subtitleCopied, setSubtitleCopied] = useState<boolean>(false);

  // Tool 5: Multi-Format Converter State
  const [targetFormat, setTargetFormat] = useState<string>('mp3');
  const [targetBitrate, setTargetBitrate] = useState<string>('320k');

  // Tool 6: Ringtone State
  const [ringtoneStart, setRingtoneStart] = useState<number>(15);
  const [fadeIn, setFadeIn] = useState<boolean>(true);
  const [fadeOut, setFadeOut] = useState<boolean>(true);

  // Tool 8: Queue Manager State
  const [queueItems, setQueueItems] = useState<{ id: string; name: string; size: string; status: string }[]>([
    { id: '1', name: title, size: '8.4 MB (MP3 320k)', status: 'جاهز' }
  ]);
  const [soundAlert, setSoundAlert] = useState<boolean>(true);

  // Tool 9: ID3 Tag Editor State
  const [customTitle, setCustomTitle] = useState<string>(title);
  const [customArtist, setCustomArtist] = useState<string>('JoeTube Artist');
  const [customAlbum, setCustomAlbum] = useState<string>('JoeTube Hits');
  const [customYear, setCustomYear] = useState<string>('2026');
  const [customGenre, setCustomGenre] = useState<string>('Arabic / Pop');

  // Tool 10: QR Code State
  const [copiedQrUrl, setCopiedQrUrl] = useState<boolean>(false);

  // Tool 11: GIF Maker State
  const [gifStart, setGifStart] = useState<number>(10);
  const [gifDuration, setGifDuration] = useState<number>(4);
  const [gifFps, setGifFps] = useState<number>(15);

  // Tool 12: Podcast Mode State
  const [podcastSpeed, setPodcastSpeed] = useState<string>('1.25x');
  const [normalizeVolume, setNormalizeVolume] = useState<boolean>(true);
  const [removeBackgroundNoise, setRemoveBackgroundNoise] = useState<boolean>(true);

  // Tool 13: Chapters Splitter State
  const [chaptersList] = useState<{ id: number; title: string; start: string; duration: string }[]>([
    { id: 1, title: 'المقدمة والافتتاحية', start: '00:00', duration: '0:45' },
    { id: 2, title: 'الجزء الرئيسي والأداء الحماسي', start: '00:45', duration: '1:30' },
    { id: 3, title: 'الخاتمة وشكر المتابعين', start: '02:15', duration: '0:45' }
  ]);

  // Tool 14: Script & Hashtags Extractor State
  const [copiedScript, setCopiedScript] = useState<boolean>(false);
  const [copiedTags, setCopiedTags] = useState<boolean>(false);

  // Tool 15: Diagnostics State
  const [isDiagnosing, setIsDiagnosing] = useState<boolean>(false);
  const [diagResults, setDiagResults] = useState<{ label: string; value: string; ok: boolean }[]>([
    { label: 'حالة البث والاتصال', value: 'متصل بأعلى سرعة (100%)', ok: true },
    { label: 'قيود العمر وتسجيل الدخول', value: 'مفتوح وعام (بدون قيود)', ok: true },
    { label: 'حقوق النشر وحظر البلدان', value: 'متاح للتحميل في جميع الدول', ok: true },
    { label: 'أعلى دقة متوفرة', value: '4K Ultra HD (2160p / 60fps)', ok: true },
    { label: 'جودة الصوت الأصلية', value: 'استوديو نقي 320kbps Stereo', ok: true }
  ]);

  useEffect(() => {
    if (videoDetails?.title) {
      setCustomTitle(videoDetails.title);
    }
  }, [videoDetails?.title]);

  if (!isOpen) return null;

  // Helper format seconds into MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Preset Equalizer Handler
  const applyEqPreset = (preset: string) => {
    setEqPreset(preset);
    if (preset === 'bass') {
      setBassGain(10);
      setMidGain(2);
      setTrebleGain(4);
    } else if (preset === 'vocal') {
      setBassGain(0);
      setMidGain(8);
      setTrebleGain(5);
    } else if (preset === 'car') {
      setBassGain(12);
      setMidGain(1);
      setTrebleGain(6);
    } else if (preset === 'flat') {
      setBassGain(0);
      setMidGain(0);
      setTrebleGain(0);
    }
  };

  // Thumbnail links
  const maxResThumb = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : videoDetails?.thumbnail;
  const hqThumb = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : videoDetails?.thumbnail;
  const mqThumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : videoDetails?.thumbnail;

  // Mock subtitle tracks / sample lyrics
  const sampleLyrics = {
    ar: `[00:00.00] استخراج الترجمة الفورية باللغة العربية
[00:04.50] مرحباً بكم في أداة استخراج الكلمات المتزامنة عبر JoeTube
[00:09.20] يتم الآن مزامنة الكلمات والترجمة بتوقيت زمني دقيق
[00:15.00] يمكنك تحميل ملف الترجمة بصيغة SRT أو VTT لمشاهدته مع أي مشغل فيديو
[00:22.00] نهاية مقطع الترجمة النصية المتزامنة`,
    en: `[00:00.00] Automatic Subtitle & Lyrics Generation (English)
[00:04.50] Welcome to JoeTube Synchronized Captions Studio
[00:09.20] Audio stream analyzed and synced with sub-second accuracy
[00:15.00] Ready to download as SRT for VLC, TV, or mobile media players
[00:22.00] End of caption sequence`,
    fr: `[00:00.00] Sous-titres et paroles synchronisés (Français)
[00:05.00] Bienvenue dans le studio JoeTube de sous-titrage automatique
[00:12.00] Téléchargez votre fichier au format SRT ou VTT pour votre lecteur vidéo`,
    es: `[00:00.00] Subtítulos y letras sincronizadas (Español)
[00:05.00] Bienvenido al estudio de subtítulos JoeTube
[00:12.00] Descarga tu archivo en formato SRT o VTT para tu reproductor favorito`
  };

  // Download Subtitles as SRT / VTT
  const downloadSubtitleFile = (format: 'srt' | 'vtt' | 'txt') => {
    const text = sampleLyrics[selectedSubLang as keyof typeof sampleLyrics] || sampleLyrics.ar;
    let fileContent = text;
    if (format === 'srt') {
      fileContent = `1\n00:00:00,000 --> 00:00:04,500\nاستخراج الترجمة الفورية عبر JoeTube\n\n2\n00:00:04,500 --> 00:00:09,200\nمزامنة الكلمات والترجمة بتوقيت دقيق\n\n3\n00:00:09,200 --> 00:00:25,000\nتم التجهيز بنجاح عبر استوديو JoeTube للوسائط`;
    } else if (format === 'vtt') {
      fileContent = `WEBVTT\n\n00:00.000 --> 00:04.500\nاستخراج الترجمة الفورية عبر JoeTube\n\n00:04.500 --> 00:09.200\nمزامنة الكلمات والترجمة بتوقيت دقيق`;
    }

    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}_subtitles_${selectedSubLang}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // QR Code URL (Points to web app with video URL)
  const qrTargetUrl = typeof window !== 'undefined' ? `${window.location.origin}?url=${encodeURIComponent(videoUrl || '')}` : videoUrl;
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(qrTargetUrl)}&color=0-0-0&bgcolor=255-255-255`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col my-4 max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-400 via-yellow-400 to-[#fce116] p-4 text-black flex items-center justify-between shrink-0 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-black/15 flex items-center justify-center text-black font-black text-sm">
              <i className="fa-solid fa-wand-magic-sparkles"></i>
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base leading-tight">استوديو أدوات الوسائط (15 ميزة فائقة)</h3>
                <span className="bg-black text-[#fce116] text-[10px] font-black px-2 py-0.5 rounded-full">Coming Soon</span>
              </div>
              <p className="text-[11px] font-semibold opacity-90">15 أداة قادمة قريباً في التحديث الجديد • Coming Soon</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-black/15 hover:bg-black/30 text-black flex items-center justify-center transition-colors cursor-pointer"
            aria-label="إغلاق"
          >
            <i className="fa-solid fa-xmark text-sm font-black"></i>
          </button>
        </div>

        {/* Global Coming Soon Notice Banner */}
        <div className="bg-gradient-to-r from-amber-100 to-yellow-100 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs font-bold text-amber-950 shrink-0" dir="rtl">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0"></span>
            <span>جميع هذه الميزات الـ 15 موسومة بـ (Coming Soon) وستتاح بكامل وظائفها قريباً!</span>
          </div>
          <span className="bg-amber-500 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-xs shrink-0">
            قريباً • Coming Soon
          </span>
        </div>

        {/* 15 Tools Navigation Bar (Scrollable Tabs) */}
        <div className="bg-gray-100 p-1.5 flex items-center gap-1 overflow-x-auto no-scrollbar border-b border-gray-200 shrink-0 text-xs">
          {[
            { id: 'trimmer', label: '1. قص المقطع ✂️ (Coming Soon)', icon: 'fa-scissors' },
            { id: 'equalizer', label: '2. معادل الصوت 🎚️ (Coming Soon)', icon: 'fa-sliders' },
            { id: 'thumbnail', label: '3. صورة 4K 🖼️ (Coming Soon)', icon: 'fa-image' },
            { id: 'subtitles', label: '4. الترجمة 📝 (Coming Soon)', icon: 'fa-closed-captioning' },
            { id: 'converter', label: '5. محول الصيغ 🔄 (Coming Soon)', icon: 'fa-rotate' },
            { id: 'ringtone', label: '6. رنة هاتف 📱 (Coming Soon)', icon: 'fa-bell' },
            { id: 'datasaver', label: '7. توفير الباقة 📊 (Coming Soon)', icon: 'fa-chart-pie' },
            { id: 'queue', label: '8. قائمة الانتظار ⏳ (Coming Soon)', icon: 'fa-list-check' },
            { id: 'id3', label: '9. بيانات الأغنية 🏷️ (Coming Soon)', icon: 'fa-tag' },
            { id: 'qr', label: '10. مسح QR 📲 (Coming Soon)', icon: 'fa-qrcode' },
            { id: 'gif', label: '11. صانع GIF 🎞️ (Coming Soon)', icon: 'fa-film' },
            { id: 'podcast', label: '12. وضع البودكاست 🎙️ (Coming Soon)', icon: 'fa-podcast' },
            { id: 'chapters', label: '13. تقسيم الفصول 💿 (Coming Soon)', icon: 'fa-compact-disc' },
            { id: 'script', label: '14. النصوص والوسوم 📜 (Coming Soon)', icon: 'fa-file-lines' },
            { id: 'diagnostics', label: '15. فحص الرابط 🔍 (Coming Soon)', icon: 'fa-stethoscope' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTool(tab.id as ToolTab)}
              className={`px-3 py-2 rounded-xl font-bold whitespace-nowrap flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTool === tab.id
                  ? 'bg-white text-black shadow-sm ring-1 ring-black/5 scale-[1.02]'
                  : 'text-gray-600 hover:text-black hover:bg-white/60'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tool Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 text-right" dir="rtl">
          {/* Tool 1: Audio / Video Trimmer */}
          {activeTool === 'trimmer' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-scissors text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">1. قص واقتطاع الصوت/الفيديو قبل التحميل</h4>
                  <p className="text-[11px] text-gray-500">حدد البداية والنهاية لحفظ الجزء المرغوب فقط وتوفير المساحة</p>
                </div>
              </div>

              <div className="bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                  <span>البداية: <span className="text-amber-700 font-extrabold">{formatTime(trimStart)}</span></span>
                  <span>المدة المقتطعة: <span className="text-emerald-700 font-extrabold">{formatTime(Math.max(0, trimEnd - trimStart))}</span></span>
                  <span>النهاية: <span className="text-amber-700 font-extrabold">{formatTime(trimEnd)}</span></span>
                </div>

                {/* Range Sliders */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-600 flex justify-between">
                    <span>موضع البداية (بالثواني):</span>
                    <span>{trimStart} ثانية</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max={durationSec - 5}
                    value={trimStart}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTrimStart(val);
                      if (val >= trimEnd) setTrimEnd(val + 10);
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />

                  <label className="text-[11px] font-bold text-gray-600 flex justify-between mt-2">
                    <span>موضع النهاية (بالثواني):</span>
                    <span>{trimEnd} ثانية</span>
                  </label>
                  <input
                    type="range"
                    min={trimStart + 5}
                    max={durationSec}
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    onDownloadOption(
                      {
                        quality: `مقتطع MP3 (${formatTime(trimStart)} - ${formatTime(trimEnd)})`,
                        format: 'MP3',
                        size: 'صوت مقتطع',
                        icon: 'fa-solid fa-scissors',
                        url: videoUrl,
                        loaderFormat: 'mp3'
                      },
                      { ss: String(trimStart), to: String(trimEnd) }
                    );
                    onClose();
                  }}
                  className="bg-[#fce116] hover:bg-[#e5cc14] text-black font-extrabold text-xs py-3 px-3 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <i className="fa-solid fa-music"></i>
                  <span>تحميل المقطع MP3</span>
                </button>

                <button
                  onClick={() => {
                    onDownloadOption(
                      {
                        quality: `مقتطع MP4 (${formatTime(trimStart)} - ${formatTime(trimEnd)})`,
                        format: 'MP4',
                        size: 'فيديو مقتطع',
                        icon: 'fa-solid fa-film',
                        url: videoUrl,
                        loaderFormat: 'mp4'
                      },
                      { ss: String(trimStart), to: String(trimEnd) }
                    );
                    onClose();
                  }}
                  className="bg-gray-900 hover:bg-black text-white font-extrabold text-xs py-3 px-3 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <i className="fa-solid fa-video"></i>
                  <span>تحميل المقطع MP4</span>
                </button>
              </div>
            </div>
          )}

          {/* Tool 2: Audio Equalizer & Bass Booster */}
          {activeTool === 'equalizer' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-sliders text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">2. معادل الصوت ومضخم البيز فائق القوة</h4>
                  <p className="text-[11px] text-gray-500">تحكم بالترددات الصوتية ومستوى الجهير (Bass) وتضخيم الصوت حتى 200%</p>
                </div>
              </div>

              {/* Presets */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {[
                  { id: 'bass', label: 'Mega Bass 🔊', icon: 'fa-bolt' },
                  { id: 'vocal', label: 'نقاوة الصوت 🎤', icon: 'fa-microphone' },
                  { id: 'car', label: 'سيارة / ستيريو 🚗', icon: 'fa-car' },
                  { id: 'flat', label: 'افتراضي 🔄', icon: 'fa-rotate' }
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyEqPreset(p.id)}
                    className={`px-2.5 py-1.5 rounded-lg font-bold border transition-all cursor-pointer whitespace-nowrap ${
                      eqPreset === p.id
                        ? 'bg-amber-100 border-amber-300 text-amber-900 shadow-xs'
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Sliders */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3.5">
                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                    <span>مستوى البيز (Bass / 60Hz):</span>
                    <span className="text-amber-600 font-extrabold">+{bassGain} dB</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="18"
                    value={bassGain}
                    onChange={(e) => setBassGain(Number(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                    <span>الترددات المتوسطة (Mid / 1kHz):</span>
                    <span className="text-blue-600 font-extrabold">{midGain >= 0 ? `+${midGain}` : midGain} dB</span>
                  </div>
                  <input
                    type="range"
                    min="-6"
                    max="12"
                    value={midGain}
                    onChange={(e) => setMidGain(Number(e.target.value))}
                    className="w-full accent-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                    <span>الترددات الحادة (Treble / 10kHz):</span>
                    <span className="text-emerald-600 font-extrabold">+{trebleGain} dB</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="12"
                    value={trebleGain}
                    onChange={(e) => setTrebleGain(Number(e.target.value))}
                    className="w-full accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                    <span>مضخم الصوت الإجمالي (Volume Boost):</span>
                    <span className="text-red-600 font-extrabold">{volumeBoost}%</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="200"
                    step="5"
                    value={volumeBoost}
                    onChange={(e) => setVolumeBoost(Number(e.target.value))}
                    className="w-full accent-red-500 cursor-pointer"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  onDownloadOption({
                    quality: `MP3 معدّل (${eqPreset} +${bassGain}dB)`,
                    format: 'MP3',
                    size: 'صوت مضخم 320k',
                    icon: 'fa-solid fa-sliders',
                    url: videoUrl,
                    loaderFormat: 'mp3'
                  });
                  onClose();
                }}
                className="w-full bg-[#fce116] hover:bg-[#e5cc14] text-black font-extrabold text-xs py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-download"></i>
                <span>تطبيق وتنزيل الصوت بالمعادل والمضخم</span>
              </button>
            </div>
          )}

          {/* Tool 3: 4K Thumbnail Downloader */}
          {activeTool === 'thumbnail' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-image text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">3. تحميل صورة الغلاف بدقة 4K فائقة الوضوح</h4>
                  <p className="text-[11px] text-gray-500">احفظ غلاف الفيديو الرسمي بأعلى دقة متوفرة بدون أي علامات مائية</p>
                </div>
              </div>

              <div className="relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm aspect-video bg-gray-100">
                <img
                  src={maxResThumb || hqThumb}
                  alt={title}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-1 rounded-lg">
                  دقة 4K / HD
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <a
                  href={maxResThumb || hqThumb}
                  target="_blank"
                  rel="noreferrer"
                  download={`${title}_thumbnail_4k.jpg`}
                  className="p-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 font-bold text-amber-900 flex flex-col items-center gap-1 transition-all"
                >
                  <i className="fa-solid fa-arrow-down text-amber-600"></i>
                  <span>أعلى دقة MaxRes (4K)</span>
                  <span className="text-[10px] text-gray-500 font-normal">1920x1080</span>
                </a>

                <a
                  href={hqThumb}
                  target="_blank"
                  rel="noreferrer"
                  download={`${title}_thumbnail_hd.jpg`}
                  className="p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 font-bold text-gray-800 flex flex-col items-center gap-1 transition-all"
                >
                  <i className="fa-solid fa-arrow-down text-gray-600"></i>
                  <span>دقة عالية HQ</span>
                  <span className="text-[10px] text-gray-500 font-normal">480x360</span>
                </a>
              </div>
            </div>
          )}

          {/* Tool 4: Subtitles & Captions */}
          {activeTool === 'subtitles' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-closed-captioning text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">4. استخراج وتحميل الترجمات والنصوص المتزامنة</h4>
                  <p className="text-[11px] text-gray-500">حفظ ملفات الترجمة SRT لمشغلات التلفاز وVLC والكلمات الغنائية</p>
                </div>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-gray-700">لغة الترجمة:</span>
                <select
                  value={selectedSubLang}
                  onChange={(e) => setSelectedSubLang(e.target.value)}
                  className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 font-bold text-gray-800 focus:outline-none"
                >
                  <option value="ar">العربية (Arabic)</option>
                  <option value="en">الإنجليزية (English)</option>
                  <option value="fr">الفرنسية (French)</option>
                  <option value="es">الإسبانية (Spanish)</option>
                </select>
              </div>

              {/* Preview Box */}
              <div className="bg-gray-900 text-green-400 p-3.5 rounded-2xl font-mono text-[11px] max-h-36 overflow-y-auto leading-relaxed shadow-inner">
                <pre className="whitespace-pre-wrap">{sampleLyrics[selectedSubLang as keyof typeof sampleLyrics]}</pre>
              </div>

              {/* Download Buttons */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  onClick={() => downloadSubtitleFile('srt')}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold py-2.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <i className="fa-solid fa-file-lines"></i>
                  <span>تحميل SRT</span>
                </button>

                <button
                  onClick={() => downloadSubtitleFile('vtt')}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-2.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <i className="fa-solid fa-code"></i>
                  <span>تحميل VTT</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(sampleLyrics[selectedSubLang as keyof typeof sampleLyrics]);
                    setSubtitleCopied(true);
                    setTimeout(() => setSubtitleCopied(false), 2000);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-2.5 px-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                >
                  <i className={subtitleCopied ? 'fa-solid fa-check text-green-600' : 'fa-solid fa-copy'}></i>
                  <span>{subtitleCopied ? 'تم النسخ' : 'نسخ النص'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tool 5: Multi-Format Audio Converter */}
          {activeTool === 'converter' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-rotate text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">5. محول الصيغ الفوري ومعدل البت المتقدم</h4>
                  <p className="text-[11px] text-gray-500">اختر صيغة الصوت المفضلة (MP3, WAV, AAC, M4A, FLAC) مع معدل البت</p>
                </div>
              </div>

              {/* Format selection */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">صيغة الملف الصوتية:</label>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    { id: 'mp3', label: 'MP3 (شامل)', desc: 'الأكثر توافقاً' },
                    { id: 'm4a', label: 'M4A (Apple)', desc: 'جودة نقية وخفيفة' },
                    { id: 'wav', label: 'WAV (استوديو)', desc: 'غير مضغوط Lossless' },
                    { id: 'aac', label: 'AAC', desc: 'ترميز متقدم' },
                    { id: 'flac', label: 'FLAC', desc: 'أعلى نقاوة هاي فاي' },
                    { id: 'ogg', label: 'OGG Vorbis', desc: 'مفتوح المصدر' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setTargetFormat(f.id)}
                      className={`p-2.5 rounded-xl border font-bold text-right transition-all cursor-pointer ${
                        targetFormat === f.id
                          ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-xs'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <div className="font-extrabold uppercase">{f.label}</div>
                      <div className="text-[9px] text-gray-400 font-normal">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Bitrate selection */}
              <div>
                <label className="text-xs font-bold text-gray-700 block mb-2">معدل البت (Bitrate):</label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {['320k', '256k', '192k', '128k'].map((b) => (
                    <button
                      key={b}
                      onClick={() => setTargetBitrate(b)}
                      className={`py-2 rounded-xl border font-bold transition-all cursor-pointer ${
                        targetBitrate === b
                          ? 'bg-black text-[#fce116] border-black shadow-xs'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {b.replace('k', ' kbps')}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  onDownloadOption({
                    quality: `${targetFormat.toUpperCase()} (${targetBitrate})`,
                    format: targetFormat.toUpperCase(),
                    size: `صيغة ${targetFormat.toUpperCase()}`,
                    icon: 'fa-solid fa-rotate',
                    url: videoUrl,
                    loaderFormat: targetFormat
                  });
                  onClose();
                }}
                className="w-full bg-[#fce116] hover:bg-[#e5cc14] text-black font-extrabold text-xs py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-download"></i>
                <span>تحميل بالصيغة المحددة ({targetFormat.toUpperCase()} - {targetBitrate})</span>
              </button>
            </div>
          )}

          {/* Tool 6: Ringtone Maker (30s Highlight) */}
          {activeTool === 'ringtone' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-bell text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">6. صانع رنات الهاتف ونغمات المنبه (30 ثانية)</h4>
                  <p className="text-[11px] text-gray-500">اقتطاع أفضل 30 ثانية حماسية مع تلاشي البداية والنهاية جاهزة لرنة هاتفك</p>
                </div>
              </div>

              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-2xl border border-yellow-200 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                  <span>موضع بداية الرنة:</span>
                  <span className="text-amber-700 font-extrabold">{formatTime(ringtoneStart)} - {formatTime(ringtoneStart + 30)}</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={durationSec - 35}
                  value={ringtoneStart}
                  onChange={(e) => setRingtoneStart(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <div className="flex items-center justify-between text-xs font-semibold text-gray-700 pt-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fadeIn}
                      onChange={(e) => setFadeIn(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span>تلاشي الدخول (Fade In 2s)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fadeOut}
                      onChange={(e) => setFadeOut(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span>تلاشي الخروج (Fade Out 2s)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    onDownloadOption(
                      {
                        quality: `رنة هاتف أندرويد (30s MP3)`,
                        format: 'MP3',
                        size: 'رنة هاتف',
                        icon: 'fa-solid fa-mobile-screen',
                        url: videoUrl,
                        loaderFormat: 'mp3'
                      },
                      { ss: String(ringtoneStart), to: String(ringtoneStart + 30) }
                    );
                    onClose();
                  }}
                  className="bg-[#fce116] hover:bg-[#e5cc14] text-black font-extrabold py-3 px-3 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <i className="fa-brands fa-android"></i>
                  <span>رنة أندرويد (MP3)</span>
                </button>

                <button
                  onClick={() => {
                    onDownloadOption(
                      {
                        quality: `رنة آيفون (30s M4A/M4R)`,
                        format: 'M4A',
                        size: 'رنة آيفون',
                        icon: 'fa-brands fa-apple',
                        url: videoUrl,
                        loaderFormat: 'm4a'
                      },
                      { ss: String(ringtoneStart), to: String(ringtoneStart + 30) }
                    );
                    onClose();
                  }}
                  className="bg-gray-900 hover:bg-black text-white font-extrabold py-3 px-3 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <i className="fa-brands fa-apple"></i>
                  <span>رنة آيفون (M4A)</span>
                </button>
              </div>
            </div>
          )}

          {/* Tool 7: Data Saver Calculator */}
          {activeTool === 'datasaver' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-chart-pie text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">7. حاسبة توفير باقة الإنترنت ومقارنة الأحجام</h4>
                  <p className="text-[11px] text-gray-500">شاهد حجم البيانات المستهلكة لكل جودة ومقدار التوفير في باقة الموبايل</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                {[
                  { quality: 'فيديو 1080p Full HD', size: '145.0 ميغابايت', saved: '0% (الحجم الكامل)', color: 'bg-red-500', pct: 100 },
                  { quality: 'فيديو 720p HD', size: '68.0 ميغابايت', saved: 'توفير 53%', color: 'bg-amber-500', pct: 47 },
                  { quality: 'فيديو 480p SD', size: '28.0 ميغابايت', saved: 'توفير 81%', color: 'bg-blue-500', pct: 19 },
                  { quality: 'صوت MP3 320kbps (هاي فاي)', size: '8.2 ميغابايت', saved: 'توفير 94% من الباقة!', color: 'bg-emerald-500', pct: 6 },
                  { quality: 'صوت اقتصادي MP3 128kbps', size: '3.4 ميغابايت', saved: 'توفير 97% خفيف جداً!', color: 'bg-emerald-600', pct: 3 }
                ].map((item, idx) => (
                  <div key={idx} className="bg-gray-50 p-3 rounded-xl border border-gray-100 space-y-1.5">
                    <div className="flex justify-between font-bold text-gray-800">
                      <span>{item.quality}</span>
                      <span className="text-gray-900">{item.size}</span>
                    </div>
                    <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.pct}%` }}></div>
                    </div>
                    <div className="text-[10px] font-bold text-emerald-700 text-left" dir="ltr">
                      {item.saved}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool 8: Queue Manager & Speedometer */}
          {activeTool === 'queue' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-list-check text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">8. قائمة الانتظار الذكية ومقياس سرعة النقل</h4>
                  <p className="text-[11px] text-gray-500">إدارة التنزيلات المتتالية وقياس سرعة السحب في الوقت الفعلي</p>
                </div>
              </div>

              {/* Speedometer Gauge Box */}
              <div className="bg-gray-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-400 text-black flex items-center justify-center text-xl font-black">
                    <i className="fa-solid fa-gauge-high"></i>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400">سرعة الاتصال بالسيرفر الفائق</div>
                    <div className="text-lg font-black text-amber-400">12.5 MB/s</div>
                  </div>
                </div>

                <div className="text-left text-xs font-semibold text-gray-300">
                  <div>وقت الاستجابة: <span className="text-emerald-400">18ms</span></div>
                  <div>حالة السيرفر: <span className="text-emerald-400">متصل وآمن ✓</span></div>
                </div>
              </div>

              {/* Queue List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-700">الملفات في قائمة الانتظار:</div>
                {queueItems.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-50 border border-gray-200 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <i className="fa-solid fa-file-audio text-amber-500"></i>
                      <div className="truncate font-bold text-gray-800" title={item.name}>{item.name}</div>
                    </div>
                    <span className="shrink-0 bg-emerald-100 text-emerald-800 font-extrabold px-2 py-0.5 rounded-full text-[10px]">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={soundAlert}
                    onChange={(e) => setSoundAlert(e.target.checked)}
                    className="accent-amber-500"
                  />
                  <span>تنبيه بنغمة صوتية عند اكتمال التنزيل 🔔</span>
                </label>
              </div>
            </div>
          )}

          {/* Tool 9: ID3 Tag Editor */}
          {activeTool === 'id3' && (
            <div className="space-y-4 animate-fade-in">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-tag text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">9. محرر وسوم وبيانات الأغنية (ID3 Tags)</h4>
                  <p className="text-[11px] text-gray-500">خصص اسم الفنان، الألبوم، وسنة الإصدار لتظهر منظمة في Spotify وApple Music</p>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">عنوان الأغنية / المقطع:</label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">اسم الفنان / المنشد:</label>
                    <input
                      type="text"
                      value={customArtist}
                      onChange={(e) => setCustomArtist(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">اسم الألبوم:</label>
                    <input
                      type="text"
                      value={customAlbum}
                      onChange={(e) => setCustomAlbum(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">سنة الإصدار:</label>
                    <input
                      type="text"
                      value={customYear}
                      onChange={(e) => setCustomYear(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">التصنيف الموسيقي (Genre):</label>
                    <input
                      type="text"
                      value={customGenre}
                      onChange={(e) => setCustomGenre(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onDownloadOption(
                    {
                      quality: `MP3 بوسوم مخصصة (${customArtist})`,
                      format: 'MP3',
                      size: '320k وسوم مخصصة',
                      icon: 'fa-solid fa-tag',
                      url: videoUrl,
                      loaderFormat: 'mp3'
                    },
                    { title: customTitle, artist: customArtist, album: customAlbum }
                  );
                  onClose();
                }}
                className="w-full bg-[#fce116] hover:bg-[#e5cc14] text-black font-extrabold text-xs py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-download"></i>
                <span>تنزيل ملف MP3 بالوسوم المخصصة</span>
              </button>
            </div>
          )}

          {/* Tool 10: Mobile QR Code Instant Transfer */}
          {activeTool === 'qr' && (
            <div className="space-y-4 animate-fade-in text-center">
              <div className="flex items-center gap-2 border-b pb-2 text-right">
                <i className="fa-solid fa-qrcode text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">10. النقل السريع للهاتف عبر مسح كود QR</h4>
                  <p className="text-[11px] text-gray-500">وجه كاميرا هاتفك المحمول نحو الشاشة للتحميل الفوري على هاتفك مباشرة</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl inline-block mx-auto shadow-sm">
                <img
                  src={qrImageUrl}
                  alt="QR Code"
                  className="w-48 h-48 mx-auto rounded-xl shadow-xs"
                />
              </div>

              <p className="text-xs text-gray-600 font-bold">
                امسح الكود عبر تطبيق الكاميرا في آيفون أو أندرويد لفتح وتحميل الفيديو فوراً!
              </p>

              <button
                onClick={() => {
                  navigator.clipboard?.writeText(qrTargetUrl);
                  setCopiedQrUrl(true);
                  setTimeout(() => setCopiedQrUrl(false), 2000);
                }}
                className="inline-flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold text-xs py-2.5 px-4 rounded-xl transition-all cursor-pointer"
              >
                <i className={copiedQrUrl ? 'fa-solid fa-check text-green-600' : 'fa-solid fa-link'}></i>
                <span>{copiedQrUrl ? 'تم نسخ الرابط بنجاح!' : 'نسخ رابط التحميل المباشر'}</span>
              </button>
            </div>
          )}

          {/* Tool 11: Animated GIF Maker */}
          {activeTool === 'gif' && (
            <div className="space-y-4 animate-fade-in text-right">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-film text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">11. تحويل الفيديو إلى صورة متحركة (GIF)</h4>
                  <p className="text-[11px] text-gray-500">اقتطاع مشهد قصير وتحويله لصورة GIF عالية الجودة للمشاركة في واتساب وتليغرام</p>
                </div>
              </div>

              <div className="bg-amber-50/70 p-4 rounded-2xl border border-amber-200 space-y-3">
                <div className="flex justify-between items-center text-xs font-bold text-gray-800">
                  <span>بداية لقطة الـ GIF:</span>
                  <span className="text-amber-700 font-extrabold">{formatTime(gifStart)} - {formatTime(gifStart + gifDuration)}</span>
                </div>

                <input
                  type="range"
                  min="0"
                  max={durationSec - 15}
                  value={gifStart}
                  onChange={(e) => setGifStart(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />

                <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">مدة الصورة المتحركة:</label>
                    <div className="flex gap-1.5">
                      {[2, 4, 6].map((sec) => (
                        <button
                          key={sec}
                          onClick={() => setGifDuration(sec)}
                          className={`flex-1 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                            gifDuration === sec ? 'bg-black text-[#fce116] border-black' : 'bg-white text-gray-700 border-gray-200'
                          }`}
                        >
                          {sec} ثوانٍ
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700 block mb-1">معدل الإطارات (FPS):</label>
                    <div className="flex gap-1.5">
                      {[10, 15, 24].map((fps) => (
                        <button
                          key={fps}
                          onClick={() => setGifFps(fps)}
                          className={`flex-1 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                            gifFps === fps ? 'bg-black text-[#fce116] border-black' : 'bg-white text-gray-700 border-gray-200'
                          }`}
                        >
                          {fps} fps
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  onDownloadOption(
                    {
                      quality: `صورة متحركة GIF (${gifDuration}s - ${gifFps}fps)`,
                      format: 'GIF',
                      size: 'صورة GIF متحركة',
                      icon: 'fa-solid fa-film',
                      url: videoUrl,
                      loaderFormat: 'gif'
                    },
                    { ss: String(gifStart), to: String(gifStart + gifDuration) }
                  );
                  onClose();
                }}
                className="w-full bg-[#fce116] hover:bg-[#e5cc14] text-black font-extrabold text-xs py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-download"></i>
                <span>توليد وتنزيل صورة GIF المتحركة</span>
              </button>
            </div>
          )}

          {/* Tool 12: Podcast & Voice Note Mode */}
          {activeTool === 'podcast' && (
            <div className="space-y-4 animate-fade-in text-right">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-podcast text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">12. وضع البودكاست وتوضيح الصوت والكلام</h4>
                  <p className="text-[11px] text-gray-500">تحسين وضوح المحاضرات والخطب وإزالة الضجيج مع تسريع الاستماع 1.25x و 1.5x</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700 block mb-1.5">سرعة الاستماع المفضلة:</label>
                  <div className="grid grid-cols-4 gap-1.5 font-bold">
                    {['1.0x (طبيعي)', '1.25x (سريع)', '1.5x (محاضرات)', '2.0x (مكثف)'].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPodcastSpeed(spd.split(' ')[0])}
                        className={`py-2 px-1 rounded-xl border text-[11px] transition-all cursor-pointer ${
                          podcastSpeed === spd.split(' ')[0]
                            ? 'bg-amber-100 border-amber-400 text-amber-900 font-extrabold shadow-xs'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-gray-200">
                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={normalizeVolume}
                      onChange={(e) => setNormalizeVolume(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span>موازنة علو الصوت التلقائية (LUFS Normalization)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700">
                    <input
                      type="checkbox"
                      checked={removeBackgroundNoise}
                      onChange={(e) => setRemoveBackgroundNoise(e.target.checked)}
                      className="accent-amber-500"
                    />
                    <span>إزالة تشويش الخلفية وصوت الهواء (Noise Filter)</span>
                  </label>
                </div>
              </div>

              <button
                onClick={() => {
                  onDownloadOption({
                    quality: `بودكاست نقي (${podcastSpeed})`,
                    format: 'MP3',
                    size: 'صوت مخصص للمحاضرات',
                    icon: 'fa-solid fa-podcast',
                    url: videoUrl,
                    loaderFormat: 'mp3'
                  });
                  onClose();
                }}
                className="w-full bg-[#fce116] hover:bg-[#e5cc14] text-black font-extrabold text-xs py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-download"></i>
                <span>تنزيل المقطع الصوتي كبودكاست نقي ({podcastSpeed})</span>
              </button>
            </div>
          )}

          {/* Tool 13: Chapters & Album Splitter */}
          {activeTool === 'chapters' && (
            <div className="space-y-4 animate-fade-in text-right">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-compact-disc text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">13. تقسيم الفصول وتنزيل مقاطع الألبومات</h4>
                  <p className="text-[11px] text-gray-500">تحميل أي أغنية أو فقرة فردية من مقاطع الكوكتيل والحفلات الطويلة بشكل منفصل</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {chaptersList.map((ch) => (
                  <div
                    key={ch.id}
                    className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between hover:bg-amber-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 h-7 rounded-lg bg-amber-400/20 text-amber-800 font-extrabold flex items-center justify-center text-xs">
                        {ch.id}
                      </span>
                      <div>
                        <div className="font-extrabold text-gray-900">{ch.title}</div>
                        <div className="text-[10px] text-gray-500">يبدأ عند: {ch.start} • المدة: {ch.duration}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        onDownloadOption(
                          {
                            quality: `فصل ${ch.id}: ${ch.title}`,
                            format: 'MP3',
                            size: ch.duration,
                            icon: 'fa-solid fa-compact-disc',
                            url: videoUrl,
                            loaderFormat: 'mp3'
                          },
                          { title: ch.title }
                        );
                        onClose();
                      }}
                      className="px-3 py-1.5 bg-[#fce116] hover:bg-[#e5cc14] text-black font-extrabold rounded-xl transition-all shadow-xs flex items-center gap-1 cursor-pointer"
                    >
                      <i className="fa-solid fa-download text-[10px]"></i>
                      <span>تحميل</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool 14: Video Script & Hashtags Extractor */}
          {activeTool === 'script' && (
            <div className="space-y-4 animate-fade-in text-right">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-file-lines text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">14. استخراج النصوص والهاشتاغات والكلمات الدلالية</h4>
                  <p className="text-[11px] text-gray-500">نسخ وصف الفيديو الكامل وهاشتاغات الترند الفيروسية بضغطة زر واحدة</p>
                </div>
              </div>

              {/* Tags Cloud */}
              <div>
                <label className="font-bold text-xs text-gray-700 block mb-1.5">هاشتاغات الترند المستخرجة:</label>
                <div className="flex flex-wrap gap-1.5">
                  {['#trending', '#viral', '#shorts', '#explore', '#foryou', '#reels', '#music', '#joetube'].map((t) => (
                    <span key={t} className="bg-amber-100 text-amber-800 font-extrabold text-[11px] px-2.5 py-1 rounded-lg">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Description Preview */}
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200 text-xs text-gray-700 space-y-1.5 max-h-36 overflow-y-auto">
                <div className="font-extrabold text-gray-900">{title}</div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  تم استخراج وتوليد هذا النص التحليلي وبيانات الوسائط عبر منصة JoeTube الفائقة. يحتوي المقطع على تراكيب صوتية عالية النقاء وترميز فيديو رسمي بدقة استوديو.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText('#trending #viral #shorts #explore #foryou #reels #music #joetube');
                    setCopiedTags(true);
                    setTimeout(() => setCopiedTags(false), 2000);
                  }}
                  className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <i className={copiedTags ? 'fa-solid fa-check text-green-600' : 'fa-solid fa-hashtag'}></i>
                  <span>{copiedTags ? 'تم نسخ الهاشتاغات!' : 'نسخ جميع الهاشتاغات'}</span>
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(`${title}\n\n#trending #viral #shorts #explore #foryou #reels #music #joetube`);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                  }}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-extrabold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <i className={copiedScript ? 'fa-solid fa-check text-green-600' : 'fa-solid fa-copy'}></i>
                  <span>{copiedScript ? 'تم نسخ النص الكامل!' : 'نسخ الوصف والنص'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Tool 15: Link Health & Restriction Diagnostics */}
          {activeTool === 'diagnostics' && (
            <div className="space-y-4 animate-fade-in text-right">
              <div className="flex items-center gap-2 border-b pb-2">
                <i className="fa-solid fa-stethoscope text-amber-500 text-lg"></i>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">15. فحص جودة وقيود الرابط (Stream Diagnostics)</h4>
                  <p className="text-[11px] text-gray-500">فحص فوري لقيود العمر، الحظر الجغرافي، وسرعة البث قبل البدء</p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {diagResults.map((item, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-gray-800">{item.label}</div>
                      <div className="text-[11px] text-emerald-700 font-extrabold mt-0.5">{item.value}</div>
                    </div>
                    <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0">
                      <i className="fa-solid fa-check"></i>
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => {
                  setIsDiagnosing(true);
                  setTimeout(() => setIsDiagnosing(false), 1000);
                }}
                disabled={isDiagnosing}
                className="w-full bg-gray-900 hover:bg-black text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <i className={`fa-solid ${isDiagnosing ? 'fa-spinner fa-spin' : 'fa-rotate-right'}`}></i>
                <span>{isDiagnosing ? 'جاري الفحص المباشر...' : 'إعادة فحص الرابط الآن'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1.5">
            <i className="fa-solid fa-shield-halved text-emerald-600"></i>
            <span>معالجة فائقة السرعة بدون إعلانات</span>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-gray-700 hover:text-black px-4 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 transition-colors cursor-pointer"
          >
            إغلاق الاستوديو
          </button>
        </div>
      </div>
    </div>
  );
};
