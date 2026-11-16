import React from 'react';

interface UrlInputFormProps {
    url: string;
    setUrl: (url: string) => void;
    onSubmit: () => void;
    isLoading: boolean;
}

export const UrlInputForm: React.FC<UrlInputFormProps> = ({ url, setUrl, onSubmit, isLoading }) => {
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (url.trim()) {
            onSubmit();
        }
    };

    const handlePaste = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text && text.trim()) {
                    setUrl(text.trim());
                }
            }
        } catch (err) {
            console.warn('Clipboard read error:', err);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="relative flex items-center w-full">
            <div className="absolute right-4 text-gray-400">
                <i className="fa-solid fa-search"></i>
            </div>
            <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="ضع رابط إنستغرام، تيك توك، يوتيوب، فيسبوك، أو X..."
                className="w-full bg-gray-100 text-gray-800 rounded-full py-3.5 pr-12 pl-28 outline-none focus:ring-2 focus:ring-[#fce116] transition-all text-sm font-medium placeholder-gray-400"
                dir="auto"
                disabled={isLoading}
            />

            <div className="absolute left-20 flex items-center gap-1">
                {url ? (
                    <button 
                        type="button" 
                        onClick={() => setUrl('')}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        title="مسح"
                    >
                        <i className="fa-solid fa-times-circle text-sm"></i>
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={handlePaste}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-700 text-[11px] font-bold px-2 py-1 rounded-full flex items-center gap-1 transition-all active:scale-95"
                        title="لصق من الحافظة"
                    >
                        <i className="fa-regular fa-paste"></i>
                        <span>لصق</span>
                    </button>
                )}
            </div>

            <button
                type="submit"
                disabled={isLoading || !url.trim()}
                className="absolute left-1.5 bg-[#fce116] hover:bg-[#e5cc14] text-black font-bold py-2 px-4 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs flex items-center gap-1.5 shadow-sm"
            >
                {isLoading ? (
                    <i className="fa-solid fa-spinner fa-spin"></i>
                ) : (
                    <>
                        <i className="fa-solid fa-arrow-down text-[10px]"></i>
                        <span>تحليل</span>
                    </>
                )}
            </button>
        </form>
    );
};
