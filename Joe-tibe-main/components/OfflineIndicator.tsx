import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
    const isOnline = useOnlineStatus();

    if (isOnline) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-full shadow-2xl text-xs font-bold border border-red-400 animate-bounce">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            <i className="fa-solid fa-wifi-slash"></i>
            <span>أنت غير متصل بالإنترنت حالياً</span>
        </div>
    );
};
