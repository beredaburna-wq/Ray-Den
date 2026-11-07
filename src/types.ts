export type MediaType = "video" | "audio" | "image" | "stream" | "document";

export interface MediaItem {
  id: string;
  url: string;
  title: string;
  type: MediaType;
  format: string; // 'mp4', 'm3u8', 'webm', 'mp3', 'm4a', 'jpg', 'png', etc.
  sizeBytes?: number;
  sizeFormatted?: string;
  dimensions?: { width: number; height: number };
  duration?: string;
  thumbnail?: string;
  sourcePageUrl: string;
  quality?: string; // '1080p', '720p', 'Original', 'High Quality', etc.
  isDownloadable: boolean;
}

export interface SniffResult {
  pageTitle: string;
  pageUrl: string;
  domain: string;
  mediaCount: number;
  items: MediaItem[];
}

export interface BrowserTab {
  id: string;
  title: string;
  url: string;
  displayUrl: string;
  favicon?: string;
  isLoading: boolean;
  history: string[];
  historyIndex: number;
  detectedMedia: MediaItem[];
  lastScanTimestamp?: number;
}

export interface DownloadTask {
  id: string;
  media: MediaItem;
  status: "queued" | "downloading" | "completed" | "error" | "paused";
  progress: number; // 0 to 100
  downloadedBytes: number;
  totalBytes?: number;
  speedBytesPerSec: number;
  etaSeconds?: number;
  startedAt: number;
  completedAt?: number;
  blobUrl?: string;
  errorMessage?: string;
}

export interface QuickBookmark {
  id: string;
  title: string;
  url: string;
  category: "Cinema & Video" | "Audio & Podcasts" | "Creative Commons" | "Stock & Galleries" | "Live Streams";
  description: string;
  badge: string;
  iconName: string;
}
