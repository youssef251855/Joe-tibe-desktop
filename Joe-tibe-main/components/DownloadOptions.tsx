import React from 'react';
import type { DownloadOption } from '../types';

interface DownloadOptionsProps {
    options: DownloadOption[];
    onSelect: (option: DownloadOption) => void;
    isDownloading: boolean;
    selectedOption: DownloadOption | null;
    downloadProgress?: string;
}

const DownloadButton: React.FC<{
    option: DownloadOption,
    onClick: () => void,
    isDownloading: boolean,
    isSelected: boolean,
    downloadProgress?: string,
}> = ({ option, onClick, isDownloading, isSelected, downloadProgress }) => {
    
    // Check if this is a "No Sound" video option
    const isNoSound = option.size.includes('بدون صوت') || option.icon.includes('video-slash');

    return (
        <button
            onClick={onClick}
            disabled={isDownloading}
            className={`w-full flex items-center justify-between p-3 rounded-lg mb-2 transition-all border
                ${isSelected 
                    ? 'bg-yellow-50 border-[#fce116]' 
                    : 'bg-white border-gray-100 hover:bg-gray-50'
                }`}
        >
            <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm
                    ${option.format.includes('MP3') || option.format.includes('M4A') ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'}
                    ${isNoSound ? 'bg-gray-200 text-gray-500' : ''} 
                    `}>
                    <i className={option.icon}></i>
                </div>
                <div className="flex flex-col items-start">
                    <span className="font-bold text-gray-800 text-sm">{option.quality}</span>
                    <span className="text-xs text-gray-400">{option.format}</span>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                {isSelected && isDownloading && downloadProgress && (
                    <span className="text-xs font-bold text-[#d4b800]">{downloadProgress}</span>
                )}
                <span className={`text-[10px] font-bold px-2 py-1 rounded
                    ${isNoSound ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                    {option.size}
                </span>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors
                    ${isSelected && isDownloading ? 'text-[#fce116]' : 'bg-gray-100 text-gray-500'}`}>
                    {isSelected && isDownloading ? (
                        <i className="fa-solid fa-circle-notch fa-spin"></i>
                    ) : (
                        <i className="fa-solid fa-download text-sm"></i>
                    )}
                </div>
            </div>
        </button>
    );
};

export const DownloadOptions: React.FC<DownloadOptionsProps> = ({ options, onSelect, isDownloading, selectedOption, downloadProgress }) => {
    const musicOptions = options.filter(o => o.icon.includes('music'));
    const videoOptions = options.filter(o => o.icon.includes('video'));

    return (
        <div className="animate-fade-in-up">
            {musicOptions.length > 0 && (
                <div className="mb-6">
                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3 px-2">
                        <i className="fa-solid fa-microphone-lines text-[#fce116]"></i>
                        فويس وصوتيات (MP3 / Audio)
                    </h4>
                    {musicOptions.map((option, index) => (
                        <DownloadButton
                            key={`music-${index}`}
                            option={option}
                            onClick={() => onSelect(option)}
                            isDownloading={isDownloading}
                            isSelected={selectedOption === option}
                            downloadProgress={downloadProgress}
                        />
                    ))}
                </div>
            )}

            {videoOptions.length > 0 && (
                <div>
                    <h4 className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-3 px-2">
                        <i className="fa-solid fa-video text-[#fce116]"></i>
                        فيديو
                    </h4>
                    {videoOptions.map((option, index) => (
                        <DownloadButton
                            key={`video-${index}`}
                            option={option}
                            onClick={() => onSelect(option)}
                            isDownloading={isDownloading}
                            isSelected={selectedOption === option}
                            downloadProgress={downloadProgress}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};