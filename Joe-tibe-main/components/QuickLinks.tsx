import React from 'react';

interface QuickLinksProps {
    onLinkClick: (name: string) => void;
}

export const QuickLinks: React.FC<QuickLinksProps> = ({ onLinkClick }) => {
    const links = [
        { name: 'Instagram', icon: 'fa-brands fa-instagram', color: 'text-pink-600', bg: 'bg-pink-50', badge: 'Reels/Post' },
        { name: 'X / تويتر', icon: 'fa-brands fa-x-twitter', color: 'text-black', bg: 'bg-gray-100', badge: 'HD MP4' },
        { name: 'TikTok', icon: 'fa-brands fa-tiktok', color: 'text-black', bg: 'bg-gray-100', badge: 'بدون لوجو' },
        { name: 'YouTube', icon: 'fa-brands fa-youtube', color: 'text-red-600', bg: 'bg-red-50', badge: 'HD / MP3' },
        { name: 'Facebook', icon: 'fa-brands fa-facebook', color: 'text-blue-600', bg: 'bg-blue-50', badge: 'Reels' },
    ];

    return (
        <div className="w-full px-4 mt-8 animate-fade-in-up">
            <div className="flex items-center justify-between mb-3 px-2">
                <span className="text-[11px] font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">تحميل فوري 0% إعلانات</span>
                <h3 className="text-gray-700 font-bold text-sm">المنصات المدعومة بالكامل</h3>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
                {links.map((link) => (
                    <div 
                        key={link.name} 
                        onClick={() => onLinkClick(link.name)}
                        className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-gray-50/90 border border-gray-100 hover:border-yellow-300 hover:bg-yellow-50/40 cursor-pointer transition-all active:scale-95 text-center group"
                    >
                        <div className={`w-11 h-11 rounded-2xl ${link.bg} flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform mb-1`}>
                            <i className={`${link.icon} text-xl ${link.color}`}></i>
                        </div>
                        <span className="text-[11px] font-bold text-gray-800 leading-tight">{link.name}</span>
                        <span className="text-[8.5px] text-gray-400 font-medium mt-0.5">{link.badge}</span>
                    </div>
                ))}
            </div>
            
            <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl border border-yellow-200 text-right shadow-sm">
                <div className="flex items-center gap-2 mb-1.5">
                    <span className="bg-[#fce116] text-black text-[10px] font-extrabold px-2 py-0.5 rounded-md">جديد 🔥</span>
                    <p className="text-gray-900 text-xs font-black">التحميل الدفعي وقوائم التشغيل (Batch)</p>
                </div>
                <p className="text-gray-600 text-xs leading-relaxed">
                    يمكنك الآن لصق عدة روابط معاً أو رابط قائمة تشغيل (Playlist) لتحميل جميع المقاطع دفعة واحدة بنقرة واحدة!
                </p>
            </div>
        </div>
    );
};