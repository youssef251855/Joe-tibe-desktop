
import type { DownloadOption } from './types';

export const DUMMY_DOWNLOAD_OPTIONS: DownloadOption[] = [
    // FIX: Added url property to satisfy DownloadOption interface
    { quality: '1080p', format: 'MP4', size: '125.8 MB', icon: 'fa-solid fa-film', url: '#' },
    // FIX: Added url property to satisfy DownloadOption interface
    { quality: '720p', format: 'MP4', size: '78.2 MB', icon: 'fa-solid fa-film', url: '#' },
    // FIX: Added url property to satisfy DownloadOption interface
    { quality: '480p', format: 'MP4', size: '45.1 MB', icon: 'fa-solid fa-film', url: '#' },
    // FIX: Added url property to satisfy DownloadOption interface
    { quality: '360p', format: 'MP4', size: '25.6 MB', icon: 'fa-solid fa-film', url: '#' },
    // FIX: Added url property to satisfy DownloadOption interface
    { quality: '128kbps', format: 'MP3', size: '8.9 MB', icon: 'fa-solid fa-music', url: '#' },
];