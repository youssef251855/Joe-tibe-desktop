import React from 'react';

export const Loader: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="relative w-16 h-16">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-[#FF0000] rounded-full animate-spin border-t-transparent"></div>
            </div>
            <h3 className="mt-6 text-lg font-bold text-gray-700">جاري المعالجة...</h3>
            <p className="text-gray-500 text-sm mt-1">نقوم بجلب أفضل جودة لك</p>
        </div>
    );
};

const style = document.createElement('style');
style.innerHTML = `
    @keyframes fade-in-up {
        0% {
            opacity: 0;
            transform: translateY(20px);
        }
        100% {
            opacity: 1;
            transform: translateY(0);
        }
    }
    .animate-fade-in-up {
        animation: fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }
`;
document.head.appendChild(style);