import React from 'react';

interface WhatsNewModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    const sections = [
        {
            badge: 'أمان وحماية قصوى',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            title: '🛡️ حل مشكلة المواقع غير المرغوب فيها وصفحات HTML نهائياً',
            items: [
                {
                    icon: 'fa-solid fa-shield-halved text-emerald-600 bg-emerald-50',
                    title: 'منع تام للنوافذ المنبثقة والتحويلات الخارجية',
                    desc: 'لن يتم توجيهك إلى أي مواقع غير مرغوب فيها أو إعلانات مزعجة إطلاقاً، التحميل يتم محلياً ومباشرة من السيرفر النظيف.'
                },
                {
                    icon: 'fa-solid fa-file-shield text-blue-600 bg-blue-50',
                    title: 'القضاء الجذري على تنزيل ملفات الـ HTML الوهمية',
                    desc: 'تم اعتماد تقنية السحب الآمن للذاكرة (In-Memory Blob Streaming) مع فحص البايتات والتأكد التام من استلام ملف صوت أو فيديو حقيقي قبل حفظه على جهازك.'
                },
                {
                    icon: 'fa-solid fa-ban text-red-600 bg-red-50',
                    title: '0% إعلانات وتجربة نقية وفائقة السرعة',
                    desc: 'واجهة خفيفة ومحمية بالكامل لا تحتوي على أي برمجيات تتبع أو روابط دعائية.'
                }
            ]
        },
        {
            badge: 'ترسانة الميزات الجديدة',
            badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
            title: '⚡ 17 ميزة وأداة وسائط احترافية جديدة',
            items: [
                {
                    icon: 'fa-solid fa-scissors text-amber-600 bg-amber-50',
                    title: 'قص واقتطاع الصوت والفيديو (Trimmer)',
                    desc: 'حدد بداية ونهاية المقطع بدقة ثوانٍ لحفظ الجزء الذي تريده فقط وتوفير مساحة التخزين.'
                },
                {
                    icon: 'fa-solid fa-sliders text-purple-600 bg-purple-50',
                    title: 'معادل الصوت ومضخم البيز 200% (Equalizer)',
                    desc: 'معادل ترددات 5-Band مع تضخيم يصل لـ +12dB وأوضاع Mega Bass و نقاوة الصوت وستيريو السيارة.'
                },
                {
                    icon: 'fa-solid fa-image text-indigo-600 bg-indigo-50',
                    title: 'تنزيل صورة الغلاف الرسمية بدقة 4K',
                    desc: 'استخراج غلاف الفيديو والبوستر الرسمي بأعلى دقة MaxRes Ultra HD بدون علامات مائية.'
                },
                {
                    icon: 'fa-solid fa-film text-pink-600 bg-pink-50',
                    title: 'صانع صور GIF المتحركة فائقة الوضوح',
                    desc: 'تحويل أي لقطة من 2 إلى 6 ثوانٍ لصورة متحركة GIF ومشاركتها في واتساب وتليغرام.'
                },
                {
                    icon: 'fa-solid fa-podcast text-teal-600 bg-teal-50',
                    title: 'وضع البودكاست وتوضيح الصوت (Podcast Mode)',
                    desc: 'موازنة الصوت التلقائية (LUFS) وإزالة ضجيج الهواء مع خيارات تسريع الاستماع 1.25x و 1.5x.'
                },
                {
                    icon: 'fa-solid fa-headphones text-cyan-600 bg-cyan-50',
                    title: 'المشغل العائم في الخلفية (Floating Player)',
                    desc: 'مشغل مصغر عائم مع أمواج صوتية متحركة يتيح لك الاستماع أثناء تصفح التطبيق أو باقي التبويبات.'
                },
                {
                    icon: 'fa-solid fa-compact-disc text-amber-700 bg-amber-50',
                    title: 'تقسيم الفصول وتنزيل مقاطع الألبومات',
                    desc: 'فصل وتنزيل كل أغنية أو فقرة من مقاطع الكوكتيل والحفلات الطويلة كملف MP3 منفصل.'
                },
                {
                    icon: 'fa-solid fa-stethoscope text-rose-600 bg-rose-50',
                    title: 'تشخيص وفحص روابط الفيديو (Diagnostics)',
                    desc: 'فحص فوري لقيود العمر وحالة البث وكشف جودات الفيديو المتاحة قبل التحميل بدون أخطاء.'
                },
                {
                    icon: 'fa-solid fa-closed-captioning text-orange-600 bg-orange-50',
                    title: 'استخراج الترجمات المتزامنة (SRT / VTT)',
                    desc: 'تحميل ملفات الترجمة والكلمات النصية بعدة لغات لتشغيلها مع VLC ومشغلات التلفاز الذكية.'
                },
                {
                    icon: 'fa-solid fa-rotate text-emerald-600 bg-emerald-50',
                    title: 'محول الصيغ الشامل (WAV, M4A, FLAC, OGG)',
                    desc: 'تحويل مباشر إلى صيغ استوديو نقية غير مضغوطة مع تحديد معدل البت من 128k حتى 320k.'
                },
                {
                    icon: 'fa-solid fa-bell text-yellow-600 bg-yellow-50',
                    title: 'صانع رنات الهاتف ونغمات المنبه 30 ثانية',
                    desc: 'توليد رنة جاهزة مع تلاشي الصوت في الدخول والخروج متوافقة مع أجهزة أندرويد وآيفون.'
                },
                {
                    icon: 'fa-solid fa-qrcode text-gray-900 bg-gray-100',
                    title: 'النقل السريع للهاتف عبر مسح كود QR',
                    desc: 'امسح الكود بكاميرا هاتفك للتحميل المباشر دون الحاجة لكابلات أو إرسال روابط يدوية.'
                },
                {
                    icon: 'fa-solid fa-tag text-blue-700 bg-blue-50',
                    title: 'محرر وسوم وبيانات الأغنية (ID3 Tags)',
                    desc: 'تخصيص اسم الفنان، الألبوم، وسنة الإصدار لتظهر منظمة داخل Spotify وApple Music.'
                },
                {
                    icon: 'fa-solid fa-stethoscope text-sky-600 bg-sky-50',
                    title: 'أداة فحص جودة وقيود الرابط (Diagnostics)',
                    desc: 'كشف قيود العمر، الحظر الجغرافي، والتأكد من توافر الدقات الفائقة قبل البدء.'
                },
                {
                    icon: 'fa-solid fa-chart-pie text-violet-600 bg-violet-50',
                    title: 'حاسبة توفير باقة الإنترنت وحجم الملفات',
                    desc: 'مقارنة دقيقة توضح مقدار التوفير في باقة الموبايل بنسبة تصل إلى 97%.'
                }
            ]
        }
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3.5 sm:p-4 animate-fade-in text-right" dir="rtl">
            <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl relative border border-gray-100 max-h-[92vh] flex flex-col my-auto">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm transition-colors active:scale-95 cursor-pointer z-10"
                    aria-label="إغلاق"
                >
                    <i className="fa-solid fa-xmark font-bold"></i>
                </button>

                {/* Header Banner */}
                <div className="flex items-center gap-3 mb-4 pr-1 pb-3 border-b border-gray-100">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#fce116] to-amber-300 flex items-center justify-center text-black font-black text-2xl shadow-sm shrink-0">
                        <i className="fa-solid fa-wand-magic-sparkles"></i>
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 className="text-base sm:text-lg font-black text-gray-900 leading-tight">
                                مرحباً بك في JoeTube الجديد!
                            </h3>
                            <span className="bg-[#fce116] text-black text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
                                الإصدار الأحدث 2026
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-0.5">
                            تم حل مشاكل التحميل نهائياً وإطلاق أضخم حزمة ميزات إضافية
                        </p>
                    </div>
                </div>

                {/* Scrollable Updates Body */}
                <div className="overflow-y-auto space-y-4 flex-grow pr-1 pl-1 mb-4 text-xs leading-relaxed">
                    {sections.map((sec, secIdx) => (
                        <div key={secIdx} className="space-y-2.5">
                            <div className="flex items-center justify-between">
                                <h4 className="font-extrabold text-xs sm:text-sm text-gray-900">{sec.title}</h4>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sec.badgeColor}`}>
                                    {sec.badge}
                                </span>
                            </div>

                            <div className="space-y-2">
                                {sec.items.map((item, i) => (
                                    <div
                                        key={i}
                                        className="p-3 rounded-2xl bg-gray-50/90 border border-gray-100 flex items-start gap-3 transition-colors hover:bg-gray-100/70"
                                    >
                                        <div className={`w-8 h-8 rounded-xl ${item.icon.split(' ')[1]} ${item.icon.split(' ')[2]} flex items-center justify-center text-sm shrink-0 shadow-2xs mt-0.5`}>
                                            <i className={item.icon.split(' ')[0]}></i>
                                        </div>
                                        <div className="flex-grow min-w-0">
                                            <h5 className="font-extrabold text-gray-900 text-[11.5px] mb-0.5">{item.title}</h5>
                                            <p className="text-[10.5px] text-gray-500 font-medium leading-normal">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Confirm Button */}
                <button
                    onClick={onClose}
                    className="w-full bg-[#fce116] hover:bg-[#e5cc14] text-black font-extrabold py-3.5 px-4 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-yellow-500/20 cursor-pointer"
                >
                    <i className="fa-solid fa-rocket"></i>
                    <span>فهمت، ابدأ الاستخدام الآمن الآن 🚀</span>
                </button>
            </div>
        </div>
    );
};
