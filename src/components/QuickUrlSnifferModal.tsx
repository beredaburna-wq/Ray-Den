import React, { useState } from "react";
import {
  X,
  Search,
  Sparkles,
  Download,
  Film,
  Music,
  Image as ImageIcon,
  Check,
  Copy,
  ExternalLink,
  Play,
} from "lucide-react";
import { MediaItem, SniffResult } from "../types";
import { triggerBrowserDownload } from "../utils/mediaUtils";

interface QuickUrlSnifferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPreviewMedia: (item: MediaItem) => void;
  onAddToQueue: (item: MediaItem) => void;
  onOpenInBrowser: (url: string) => void;
}

export const QuickUrlSnifferModal: React.FC<QuickUrlSnifferModalProps> = ({
  isOpen,
  onClose,
  onPreviewMedia,
  onAddToQueue,
  onOpenInBrowser,
}) => {
  const [targetUrl, setTargetUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SniffResult | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!targetUrl.trim()) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/media/sniff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: targetUrl.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Server responded with ${res.status}`);
      }

      const data: SniffResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to scan URL. Verify the link and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickSamples = [
    { label: "Blender 4K HLS", url: "https://peach.blender.org/" },
    { label: "Internet Archive Cinema", url: "https://archive.org/details/moviesandfilms" },
    { label: "Wikimedia 4K Nature", url: "https://commons.wikimedia.org/wiki/Category:Videos_of_nature" },
    { label: "Free Music Sound", url: "https://freemusicarchive.org/" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-black rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-black bg-zinc-950">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-teal-200 font-display">Deep Media Sniffer</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-teal-400 hover:text-teal-100 hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* URL Input Form with Grey Surface & Black Border */}
        <div className="p-5 border-b border-black bg-zinc-900">
          <p className="text-xs text-teal-400/80 mb-3">
            Paste any link from anywhere (video platform, social post, cloud drive, podcast feed, or blog) to inspect and extract all direct streams:
          </p>

          <form onSubmit={handleScan} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-zinc-950 border border-black rounded-xl px-3.5 py-2.5 text-xs text-teal-100 placeholder-teal-600/70 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono shadow-inner"
              />
            </div>
            {/* Gold Accent Scan Button */}
            <button
              type="submit"
              disabled={isLoading || !targetUrl.trim()}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-1.5 border border-black transition-colors disabled:opacity-50 shrink-0 shadow-md"
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-3.5 h-3.5 animate-spin" />
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Sniff Media</span>
                </>
              )}
            </button>
          </form>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 mt-3 overflow-x-auto text-[11px] text-teal-400">
            <span className="text-teal-500 shrink-0">Try sample:</span>
            {quickSamples.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setTargetUrl(s.url);
                }}
                className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-750 text-teal-300 hover:text-teal-100 border border-black whitespace-nowrap transition-colors font-medium"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 mb-4">
              {error}
            </div>
          )}

          {result && (
            <div>
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-black">
                <div>
                  <h3 className="text-sm font-bold text-teal-200 truncate">{result.pageTitle}</h3>
                  <p className="text-xs text-teal-500 font-mono truncate">{result.pageUrl}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-black">
                    {result.mediaCount} found
                  </span>
                  <button
                    onClick={() => {
                      onOpenInBrowser(result.pageUrl);
                      onClose();
                    }}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 font-bold px-2 py-1 rounded hover:bg-zinc-800"
                  >
                    <span>Open in Browser</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {result.items.length === 0 ? (
                <div className="text-center py-8 text-teal-400/80 text-xs">
                  No public direct media files could be extracted from this page.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {result.items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-zinc-950 border border-black rounded-xl p-3 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-black flex items-center justify-center shrink-0">
                          {item.type === "video" || item.type === "stream" ? (
                            <Film className="w-4 h-4 text-amber-400" />
                          ) : item.type === "audio" ? (
                            <Music className="w-4 h-4 text-teal-300" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-amber-400" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <h4 className="text-xs font-semibold text-teal-200 truncate" title={item.title}>
                            {item.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-teal-400 font-mono">
                            <span className="uppercase font-bold text-amber-300">{item.format}</span>
                            <span>·</span>
                            <span>{item.sizeFormatted || "Stream"}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopy(item)}
                          className="p-1.5 rounded-lg text-teal-400 hover:text-teal-100 hover:bg-zinc-800 transition-colors"
                          title="Copy stream link"
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <button
                          onClick={() => onPreviewMedia(item)}
                          className="p-1.5 rounded-lg text-teal-400 hover:text-teal-100 hover:bg-zinc-800 transition-colors"
                          title="Preview"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            triggerBrowserDownload(item);
                            onAddToQueue(item);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold border border-black transition-colors shadow-sm"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
