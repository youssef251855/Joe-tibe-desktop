import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { WhatsNewModal } from './WhatsNewModal';

export const Header: React.FC = () => {
    const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
    const [showIOSModal, setShowIOSModal] = useState(false);
    const [showUpdatesModal, setShowUpdatesModal] = useState(false);

    // Show updates modal automatically once on entry
    useEffect(() => {
        try {
            const hasSeen = localStorage.getItem('joetube_updates_modal_v3_seen');
            if (!hasSeen) {
                const timer = setTimeout(() => {
                    setShowUpdatesModal(true);
                }, 600);
                return () => clearTimeout(timer);
            }
        } catch {}
    }, []);

    const handleCloseUpdates = () => {
        try {
            localStorage.setItem('joetube_updates_modal_v3_seen', 'true');
        } catch {}
        setShowUpdatesModal(false);
    };

    return (
        <div className="w-full bg-[#fce116] pb-12 pt-7 rounded-b-[2.5rem] shadow-md mb-4 text-center relative overflow-hidden">
            {/* Background Pattern effect */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <i className="fa-solid fa-download absolute text-9xl -left-10 -top-10 text-black transform rotate-12"></i>
                <i className="fa-solid fa-music absolute text-8xl -right-6 bottom-4 text-black transform -rotate-12"></i>
            </div>

            {/* Top Toolbar: Updates Badge, 0 Ads Badge & PWA Install */}
            <div className="relative z-20 flex items-center justify-between px-5 mb-2">
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => setShowUpdatesModal(true)}
                        className="flex items-center gap-1 bg-black text-[#fce116] text-[10.5px] font-extrabold px-2.5 py-1 rounded-full shadow-xs hover:bg-gray-900 transition active:scale-95 cursor-pointer relative"
                        title="عرض التحديثات الجديدة"
                    >
                        <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                        <i className="fa-solid fa-wand-magic-sparkles text-[10px]"></i>
                        <span>التحديثات</span>
                    </button>

                    <div className="flex items-center gap-1 bg-black/10 text-black text-[10px] font-black px-2.5 py-1 rounded-full">
                        <i className="fa-solid fa-ban text-red-700"></i>
                        <span>0% إعلانات</span>
                    </div>
                </div>

                {!isInstalled && (isInstallable || isIOS) && (
                    <button
                        onClick={isInstallable ? install : () => setShowIOSModal(true)}
                        className="flex items-center gap-1.5 bg-black text-[#fce116] text-[11px] font-bold px-3 py-1.5 rounded-full shadow hover:bg-gray-900 transition active:scale-95"
                    >
                        <i className="fa-solid fa-mobile-screen-button"></i>
                        <span>تثبيت كـ PWA</span>
                    </button>
                )}
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center">
                <div className="flex items-center gap-2 mb-1.5">
                    <div className="bg-black text-[#fce116] w-10 h-10 rounded-xl flex items-center justify-center text-2xl shadow-sm">
                        <i className="fa-solid fa-bolt"></i>
                    </div>
                    <h1 className="text-3xl font-black text-black tracking-wide">
                        Joe <span className="text-gray-800 font-extrabold">tube</span>
                    </h1>
                </div>
                <p className="text-black/80 text-xs font-semibold px-4 max-w-xs leading-relaxed">
                    تحميل فيديوهات إنستغرام، تيك توك، يوتيوب، X وفيسبوك بدون علامة مائية وفويسات MP3
                </p>
            </div>

            {/* Whats New / Updates Modal */}
            <WhatsNewModal
                isOpen={showUpdatesModal}
                onClose={handleCloseUpdates}
            />

            {/* iOS Modal */}
            {showIOSModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-right shadow-2xl relative">
                        <button
                            onClick={() => setShowIOSModal(false)}
                            className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                        <h3 className="text-base font-bold text-gray-900 mb-2">تثبيت Joe tube على الآيفون</h3>
                        <p className="text-xs text-gray-600 mb-4">
                            اضغط على زر <strong>المشاركة (Share)</strong> في Safari ثم اختر <strong>إضافة إلى الصفحة الرئيسية</strong> لتثبيته كتطبيق مستقل.
                        </p>
                        <button
                            onClick={() => setShowIOSModal(false)}
                            className="w-full bg-[#fce116] text-black font-bold py-2.5 rounded-xl text-xs"
                        >
                            حسناً
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
