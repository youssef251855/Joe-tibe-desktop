
export interface MusicInfo {
    title?: string;
    author?: string;
    playUrl?: string;
    cover?: string;
    duration?: number | string;
}

export interface VideoDetails {
    id?: string;
    url?: string;
    title: string;
    thumbnail: string;
    duration: string;
    platform?: 'youtube' | 'facebook' | 'tiktok' | 'instagram' | 'twitter' | 'playlist' | string;
    musicInfo?: MusicInfo;
}

export interface DownloadOption {
    quality: string;
    format: string;
    size: string;
    icon: string;
    url: string;
    directUrl?: string;
    loaderFormat?: string;
}

export interface BatchItem {
    id: string;
    url: string;
    title: string;
    thumbnail: string;
    duration?: string;
    platform: string;
    formats: DownloadOption[];
    selectedFormat?: DownloadOption;
    status: 'idle' | 'resolving' | 'ready' | 'downloading' | 'completed' | 'error';
    error?: string;
    directDownloadUrl?: string;
}

export interface PlaylistInfo {
    id: string;
    title: string;
    author?: string;
    thumbnail: string;
    videoCount: number;
    videos: Array<{
        index: number;
        id: string;
        title: string;
        thumbnail: string;
        duration: string;
        url: string;
        uploader: string;
    }>;
}

export interface DownloadHistoryItem {
    id: string;
    title: string;
    thumbnail: string;
    url: string;
    platform: string;
    format: string;
    quality: string;
    downloadedAt: number;
    directUrl?: string;
}

export interface AppReview {
    id: string;
    userName: string;
    rating: number;
    comment: string;
    date: string;
    createdAt?: number;
    likes?: number;
    tags?: string[];
}

export interface ReviewStats {
    total: number;
    average: number;
    distribution: { [key: number]: number };
}

