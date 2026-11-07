import { MediaItem } from "../types";

export function formatBytes(bytes?: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function sanitizeFilename(name: string, fallback = "download"): string {
  if (!name) return fallback;
  return name.replace(/[/\\?%*:|"<>]/g, "_").trim().slice(0, 100);
}

export function getDownloadUrl(item: MediaItem): string {
  if (item.format === "m3u8") {
    const filename = `${sanitizeFilename(item.title)}.ts`;
    return `/api/media/hls-download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(filename)}`;
  }
  const ext = item.format || "bin";
  const filename = `${sanitizeFilename(item.title)}.${ext}`;
  return `/api/media/download?url=${encodeURIComponent(item.url)}&filename=${encodeURIComponent(filename)}`;
}

export function triggerBrowserDownload(item: MediaItem): void {
  const downloadUrl = getDownloadUrl(item);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = `${sanitizeFilename(item.title)}.${item.format === "m3u8" ? "ts" : item.format || "bin"}`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

export async function downloadBatchZip(items: MediaItem[], zipName = "OmniMedia_Batch.zip"): Promise<void> {
  const payload = {
    items: items.map((i) => ({ url: i.url, title: sanitizeFilename(i.title) })),
    zipName,
  };

  const response = await fetch("/api/media/batch-zip", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Batch download failed: ${response.statusText}`);
  }

  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = zipName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
