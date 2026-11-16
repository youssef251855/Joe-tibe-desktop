import React from 'react';

interface SearchResult {
    id: string;
    title: string;
    thumbnail: string;
    duration: number;
    url: string;
    uploader: string;
}

interface SearchResultsProps {
    results: SearchResult[];
    onSelect: (url: string) => void;
}

const formatDuration = (seconds: number): string => {
    if (!seconds) return '';
    const h = Math.floor(seconds / 3600).toString();
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = Math.floor(seconds % 60).toString().padStart(2, '0');
    return h !== '0' ? `${h}:${m}:${s}` : `${m}:${s}`;
};

export const SearchResults: React.FC<SearchResultsProps> = ({ results, onSelect }) => {
    if (!results || results.length === 0) return null;

    return (
        <div className="w-full mt-4 animate-fade-in-up">
            <h3 className="text-lg font-bold mb-3 px-2 text-gray-800">نتائج البحث</h3>
            <div className="flex flex-col gap-3">
                {results.map((result) => (
                    <div 
                        key={result.id} 
                        onClick={() => onSelect(result.url)}
                        className="flex gap-3 p-2 bg-white rounded-xl shadow-sm border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors active:scale-[0.98]"
                    >
                        <div className="relative w-32 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
                            <img 
                                src={result.thumbnail} 
                                alt={result.title} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                            />
                            {result.duration > 0 && (
                                <span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
                                    {formatDuration(result.duration)}
                                </span>
                            )}
                        </div>
                        <div className="flex flex-col justify-center flex-grow overflow-hidden">
                            <h4 className="text-sm font-bold text-gray-900 line-clamp-2 leading-tight mb-1" dir="auto">
                                {result.title}
                            </h4>
                            <p className="text-xs text-gray-500 truncate" dir="auto">
                                {result.uploader}
                            </p>
                        </div>
                        <div className="flex items-center justify-center px-2">
                            <button className="w-8 h-8 rounded-full bg-[#fce116]/20 text-[#d4b800] flex items-center justify-center">
                                <i className="fa-solid fa-download text-sm"></i>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
