import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
    const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
    const [showIOSModal, setShowIOSModal] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    if (isInstalled || isDismissed) {
        return null;
    }

    if (!isInstallable && !isIOS) {
        return null;
    }

    return (
        <>
            <div className="w-full px-4 mb-3 animate-fade-in-up">
                <div className="bg-gradient-to-r from-gray-900 to-black text-white p-3.5 rounded-2xl shadow-xl border border-yellow-400/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#fce116] flex items-center justify-center text-black font-black text-xl shadow-md shrink-0">
                            ⚡
                        </div>
                        <div className="flex flex-col text-right">
                            <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-white">تثبيت تطبيق Joe tube</span>
                                <span className="text-[10px] bg-[#fce116] text-black font-bold px-1.5 py-0.5 rounded-full">PWA</span>
                            </div>
                            <span className="text-xs text-gray-300">بدون إعلانات وبسرعة خرافية على هاتفك</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {isInstallable && (
                            <button
                                onClick={install}
                                className="bg-[#fce116] hover:bg-[#e5cc14] text-black font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
                            >
                                <i className="fa-solid fa-download"></i>
                                <span>تثبيت</span>
                            </button>
                        )}

                        {isIOS && (
                            <button
                                onClick={() => setShowIOSModal(true)}
                                className="bg-[#fce116] hover:bg-[#e5cc14] text-black font-bold text-xs px-3.5 py-2 rounded-xl transition-all shadow active:scale-95 flex items-center gap-1.5 whitespace-nowrap"
                            >
                                <i className="fa-brands fa-apple"></i>
                                <span>تثبيت آيفون</span>
                            </button>
                        )}

                        <button
                            onClick={() => setIsDismissed(true)}
                            className="text-gray-400 hover:text-white text-xs p-1"
                            title="إغلاق"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            </div>

            {/* iOS Installation Instruction Modal */}
            {showIOSModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full text-right shadow-2xl border border-gray-100 relative">
                        <button
                            onClick={() => setShowIOSModal(false)}
                            className="absolute top-4 left-4 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-sm"
                        >
                            <i className="fa-solid fa-xmark"></i>
                        </button>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-2xl bg-[#fce116] flex items-center justify-center text-black font-bold text-2xl shadow">
                                ⚡
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-gray-900">تثبيت Joe tube على الآيفون</h3>
                                <p className="text-xs text-gray-500">يعمل كتطبيق أصلي في Safari</p>
                            </div>
                        </div>

                        <div className="space-y-3 my-4 text-xs text-gray-700 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-yellow-400 text-black font-bold flex items-center justify-center text-xs shrink-0">1</span>
                                <p>اضغط على زر <strong>المشاركة (Share)</strong> <i className="fa-solid fa-arrow-up-from-bracket text-blue-500 mx-1"></i> في أسفل شريط Safari.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-yellow-400 text-black font-bold flex items-center justify-center text-xs shrink-0">2</span>
                                <p>مرر للأسفل واختر <strong>إضافة إلى الصفحة الرئيسية (Add to Home Screen)</strong> <i className="fa-regular fa-square-plus text-gray-700 mx-1"></i>.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-yellow-400 text-black font-bold flex items-center justify-center text-xs shrink-0">3</span>
                                <p>اضغط على <strong>إضافة (Add)</strong> في الزاوية العلوية وسيظهر التطبيق على شاشتك فوراً!</p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowIOSModal(false)}
                            className="w-full bg-[#fce116] hover:bg-[#e5cc14] text-black font-bold py-3 rounded-xl transition-all shadow active:scale-95 text-sm"
                        >
                            فهمت، شكراً
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
