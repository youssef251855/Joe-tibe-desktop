import React from 'react';

export type TabType = 'home' | 'batch' | 'tools' | 'history' | 'compare' | 'reviews';

interface BottomNavProps {
    activeTab: TabType;
    onChangeTab: (tab: TabType) => void;
    historyCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onChangeTab, historyCount = 0 }) => {
    return (
        <div className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-gray-200 flex justify-around items-center py-2 z-50 pb-5 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] max-w-md mx-auto left-0 right-0">
            <button 
                onClick={() => onChangeTab('home')}
                className={`flex flex-col items-center gap-1 w-12 transition-all ${activeTab === 'home' ? 'text-black font-bold scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeTab === 'home' ? 'bg-[#fce116] shadow-sm' : ''}`}>
                    <i className="fa-solid fa-bolt text-xs"></i>
                </div>
                <span className="text-[9px]">الرئيسية</span>
            </button>

            <button 
                onClick={() => onChangeTab('batch')}
                className={`flex flex-col items-center gap-1 w-12 transition-all ${activeTab === 'batch' ? 'text-black font-bold scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeTab === 'batch' ? 'bg-[#fce116] shadow-sm' : ''}`}>
                    <i className="fa-solid fa-layer-group text-xs"></i>
                </div>
                <span className="text-[9px]">دفعي</span>
            </button>

            <button 
                onClick={() => onChangeTab('tools')}
                className={`flex flex-col items-center gap-1 w-12 transition-all ${activeTab === 'tools' ? 'text-black font-bold scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeTab === 'tools' ? 'bg-[#fce116] shadow-sm' : ''}`}>
                    <i className="fa-solid fa-wand-magic-sparkles text-xs"></i>
                </div>
                <span className="text-[9px]">10 أدوات</span>
            </button>

            <button 
                onClick={() => onChangeTab('history')}
                className={`flex flex-col items-center gap-1 w-12 relative transition-all ${activeTab === 'history' ? 'text-black font-bold scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center ${activeTab === 'history' ? 'bg-[#fce116] shadow-sm' : ''}`}>
                    <i className="fa-solid fa-clock-rotate-left text-xs"></i>
                </div>
                <span className="text-[9px]">السجل</span>
                {historyCount > 0 && (
                    <span className="absolute top-0 right-1 bg-red-500 text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center shadow">
                        {historyCount > 9 ? '+9' : historyCount}
                    </span>
                )}
            </button>

            <button 
                onClick={() => onChangeTab('compare')}
                className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'compare' ? 'text-black font-bold scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeTab === 'compare' ? 'bg-[#fce116] shadow-sm' : ''}`}>
                    <i className="fa-solid fa-crown text-sm"></i>
                </div>
                <span className="text-[10px]">المميزات</span>
            </button>

            <button 
                onClick={() => onChangeTab('reviews')}
                className={`flex flex-col items-center gap-1 w-14 transition-all ${activeTab === 'reviews' ? 'text-black font-bold scale-105' : 'text-gray-400 hover:text-gray-600'}`}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeTab === 'reviews' ? 'bg-[#fce116] shadow-sm' : ''}`}>
                    <i className="fa-solid fa-star text-sm"></i>
                </div>
                <span className="text-[10px]">التقييمات</span>
            </button>
        </div>
    );
};
