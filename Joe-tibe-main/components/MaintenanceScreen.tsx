import React from 'react';

export const MaintenanceScreen: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
            <div className="max-w-md w-full bg-gray-800 border border-gray-700 p-8 rounded-3xl shadow-2xl space-y-6 animate-fade-in-up">
                {/* Icon */}
                <div className="w-20 h-20 bg-yellow-500/10 border-2 border-[#fce116] rounded-2xl flex items-center justify-center mx-auto text-[#fce116] text-3xl shadow-lg shadow-yellow-500/10">
                    <i className="fa-solid fa-screwdriver-wrench animate-bounce"></i>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-2xl font-black tracking-tight text-white">
                        الموقع تحت الصيانة والتحديث
                    </h1>
                    <p className="text-sm text-gray-400">
                        نقوم حالياً بتطوير وتحسين خوادم التحميل لتكون أسرع وأكثر استقراراً بدون أي أخطاء.
                    </p>
                </div>

                {/* Target Date Box */}
                <div className="bg-gray-900/80 border border-yellow-500/30 rounded-2xl p-4 flex items-center justify-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500 text-black font-extrabold flex items-center justify-center text-lg">
                        <i className="fa-regular fa-calendar-days"></i>
                    </div>
                    <div className="text-right">
                        <span className="text-[11px] text-gray-400 block font-medium">موعد انتهاء الصيانة والعودة</span>
                        <span className="text-base font-black text-[#fce116]">25 / 10 / 2026</span>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="pt-2 border-t border-gray-700/60 text-xs text-gray-500 flex items-center justify-center gap-2">
                    <i className="fa-solid fa-shield-halved text-emerald-500"></i>
                    <span>شكراً لتفبركم، سنعود أقوى وأسرع!</span>
                </div>
            </div>
        </div>
    );
};
