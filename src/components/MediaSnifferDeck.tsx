import React, { useState, useMemo } from "react";
import {
  Film,
  Music,
  Image,
  Download,
  Play,
  Copy,
  Check,
  Archive,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  FileText,
} from "lucide-react";
import { MediaItem, MediaType } from "../types";
import { triggerBrowserDownload, downloadBatchZip, formatBytes } from "../utils/mediaUtils";

interface MediaSnifferDeckProps {
  items: MediaItem[];
  pageTitle: string;
  pageUrl: string;
  isScanning: boolean;
  onRefreshScan: () => void;
  onPreviewMedia: (item: MediaItem) => void;
  onAddToQueue: (item: MediaItem) => void;
}

export const MediaSnifferDeck: React.FC<MediaSnifferDeckProps> = ({
  items,
  isScanning,
  onRefreshScan,
  onPreviewMedia,
  onAddToQueue,
}) => {
  const [selectedType, setSelectedType] = useState<MediaType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesType = selectedType === "all" || item.type === selectedType;
      const matchesSearch =
        !searchQuery ||
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.format.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.url.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesSearch;
    });
  }, [items, selectedType, searchQuery]);

  // Counts by type
  const counts = useMemo(() => {
    const res = { all: items.length, video: 0, audio: 0, stream: 0, image: 0, document: 0 };
    items.forEach((item) => {
      if (item.type in res) {
        res[item.type as keyof typeof res]++;
      }
    });
    return res;
  }, [items]);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length && filteredItems.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map((i) => i.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleCopyUrl = (item: MediaItem) => {
    navigator.clipboard.writeText(item.url);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleBatchDownload = () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;

    selectedItems.forEach((item, index) => {
      setTimeout(() => {
        triggerBrowserDownload(item);
        onAddToQueue(item);
      }, index * 400);
    });
  };

  const handleBatchZip = async () => {
    const selectedItems = items.filter((i) => selectedIds.has(i.id));
    if (selectedItems.length === 0) return;

    setIsZipping(true);
    try {
      await downloadBatchZip(selectedItems, `OmniMedia_${Date.now()}.zip`);
    } catch (err: any) {
      alert(`Batch ZIP failed: ${err.message}`);
    } finally {
      setIsZipping(false);
    }
  };

  const getFormatBadgeColor = (format: string, type: MediaType) => {
    if (type === "stream" || format === "m3u8") return "bg-amber-500/15 text-amber-300 border-black";
    if (type === "video") return "bg-amber-500/20 text-amber-300 border-black";
    if (type === "audio") return "bg-teal-500/20 text-teal-300 border-black";
    if (type === "image") return "bg-zinc-800 text-teal-200 border-black";
    return "bg-zinc-800 text-teal-300 border-black";
  };

  return (
    <div className="h-full flex flex-col bg-zinc-900 border-l border-black overflow-hidden select-none">
      {/* Deck Header: Grey Surface, Black Border, Teal Text, Gold Accents */}
      <div className="p-4 border-b border-black bg-zinc-950 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-bold text-teal-200 font-display">Media Downloader Deck</h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-black">
              {items.length}
            </span>
          </div>

          <button
            onClick={onRefreshScan}
            disabled={isScanning}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold text-teal-300 hover:text-teal-100 bg-zinc-800 hover:bg-zinc-750 border border-black transition-colors disabled:opacity-50"
            title="Deep re-scan page"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin text-amber-400" : ""}`} />
            <span>{isScanning ? "Scanning..." : "Rescan"}</span>
          </button>
        </div>

        {/* Search bar */}
        <div className="relative flex items-center bg-zinc-950 border border-black rounded-lg px-2.5 py-1 mb-3 focus-within:ring-1 focus-within:ring-amber-500">
          <Search className="w-3.5 h-3.5 text-teal-500 mr-2 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by name, format (mp4, m3u8, mp3)..."
            className="w-full bg-transparent text-xs text-teal-200 placeholder-teal-600/70 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="text-xs text-teal-500 hover:text-teal-200"
            >
              ×
            </button>
          )}
        </div>

        {/* Media Type Tabs (Segmented Button Controls) */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedType("all")}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors whitespace-nowrap border ${
              selectedType === "all"
                ? "bg-amber-500 text-zinc-950 border-black shadow-sm"
                : "bg-transparent text-teal-400/80 hover:text-teal-200 hover:bg-zinc-800 border-transparent"
            }`}
          >
            All ({counts.all})
          </button>

          <button
            onClick={() => setSelectedType("video")}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors whitespace-nowrap border ${
              selectedType === "video"
                ? "bg-amber-500 text-zinc-950 border-black shadow-sm"
                : "bg-transparent text-teal-400/80 hover:text-teal-200 hover:bg-zinc-800 border-transparent"
            }`}
          >
            Videos ({counts.video})
          </button>

          <button
            onClick={() => setSelectedType("stream")}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors whitespace-nowrap border ${
              selectedType === "stream"
                ? "bg-amber-500 text-zinc-950 border-black shadow-sm"
                : "bg-transparent text-teal-400/80 hover:text-teal-200 hover:bg-zinc-800 border-transparent"
            }`}
          >
            HLS ({counts.stream})
          </button>

          <button
            onClick={() => setSelectedType("audio")}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors whitespace-nowrap border ${
              selectedType === "audio"
                ? "bg-amber-500 text-zinc-950 border-black shadow-sm"
                : "bg-transparent text-teal-400/80 hover:text-teal-200 hover:bg-zinc-800 border-transparent"
            }`}
          >
            Audio ({counts.audio})
          </button>

          <button
            onClick={() => setSelectedType("image")}
            className={`px-2.5 py-1 rounded text-xs font-bold transition-colors whitespace-nowrap border ${
              selectedType === "image"
                ? "bg-amber-500 text-zinc-950 border-black shadow-sm"
                : "bg-transparent text-teal-400/80 hover:text-teal-200 hover:bg-zinc-800 border-transparent"
            }`}
          >
            Images ({counts.image})
          </button>
        </div>
      </div>

      {/* Batch Actions Bar with Black Border */}
      {filteredItems.length > 0 && (
        <div className="px-4 py-2 bg-zinc-950/70 border-b border-black flex items-center justify-between text-xs text-teal-400 shrink-0">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-1.5 text-teal-300 hover:text-teal-100 transition-colors"
          >
            {selectedIds.size === filteredItems.length && filteredItems.length > 0 ? (
              <CheckSquare className="w-4 h-4 text-amber-400" />
            ) : (
              <Square className="w-4 h-4 text-zinc-600" />
            )}
            <span>Select All ({filteredItems.length})</span>
          </button>

          {selectedIds.size > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchDownload}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs border border-black transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download ({selectedIds.size})</span>
              </button>

              <button
                onClick={handleBatchZip}
                disabled={isZipping}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-750 text-teal-200 font-semibold text-xs border border-black transition-colors disabled:opacity-50"
              >
                <Archive className="w-3.5 h-3.5 text-amber-400" />
                <span>{isZipping ? "Zipping..." : "Export ZIP"}</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Media Items Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-teal-400/80">
            <Film className="w-10 h-10 text-zinc-600 mb-3" />
            <h3 className="text-sm font-semibold text-teal-200 mb-1">
              {items.length === 0 ? "No Media Detected Yet" : "No Matches Found"}
            </h3>
            <p className="text-xs text-teal-400/70 max-w-xs mb-4">
              {items.length === 0
                ? "Navigate to any page with videos, podcasts, streams, or images, or click 'Rescan' to perform a deep page probe."
                : "Try clearing your search query or switching to 'All' category."}
            </p>
            {items.length === 0 && (
              <button
                onClick={onRefreshScan}
                disabled={isScanning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs border border-black transition-colors shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
                <span>Run Deep Media Sniffer</span>
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                className={`group relative bg-zinc-950/80 border rounded-xl p-3 transition-all flex flex-col gap-2.5 ${
                  isSelected
                    ? "border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.2)] bg-amber-950/20"
                    : "border-black hover:border-zinc-700"
                }`}
              >
                {/* Top Row: Checkbox, Title & Format Pill */}
                <div className="flex items-start gap-2.5">
                  <button
                    onClick={() => toggleSelectOne(item.id)}
                    className="mt-0.5 text-zinc-600 hover:text-amber-400 transition-colors shrink-0"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Square className="w-4 h-4 text-zinc-600" />
                    )}
                  </button>

                  {/* Thumbnail / Icon preview */}
                  <div className="w-12 h-12 rounded-lg bg-zinc-900 border border-black flex items-center justify-center shrink-0 overflow-hidden relative">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : item.type === "video" || item.type === "stream" ? (
                      <Film className="w-5 h-5 text-amber-400" />
                    ) : item.type === "audio" ? (
                      <Music className="w-5 h-5 text-teal-300" />
                    ) : item.type === "image" ? (
                      <Image className="w-5 h-5 text-amber-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-teal-400" />
                    )}

                    {/* Quick Preview Overlay Button */}
                    {(item.type === "video" || item.type === "audio" || item.type === "image" || item.type === "stream") && (
                      <button
                        onClick={() => onPreviewMedia(item)}
                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-amber-300 transition-opacity"
                        title="Preview media"
                      >
                        <Play className="w-4 h-4 text-amber-400 fill-amber-400" />
                      </button>
                    )}
                  </div>

                  {/* Item info with Teal Font */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4
                        className="text-xs font-semibold text-teal-200 truncate cursor-pointer hover:text-amber-300"
                        title={item.title}
                        onClick={() => onPreviewMedia(item)}
                      >
                        {item.title}
                      </h4>

                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getFormatBadgeColor(
                          item.format,
                          item.type
                        )}`}
                      >
                        {item.format}
                      </span>
                    </div>

                    {/* Unboxed Metadata (Zero-Pill discipline) with Teal Font */}
                    <div className="flex items-center gap-2 text-[11px] text-teal-400/80">
                      <span className="font-mono tabular-nums text-teal-300 font-medium">
                        {item.sizeFormatted || (item.sizeBytes ? formatBytes(item.sizeBytes) : "Stream / Dynamic")}
                      </span>
                      {item.quality && (
                        <>
                          <span aria-hidden="true" className="text-zinc-600">·</span>
                          <span className="text-teal-400">{item.quality}</span>
                        </>
                      )}
                      <span aria-hidden="true" className="text-zinc-600">·</span>
                      <span className="capitalize text-teal-500">{item.type}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Row Actions */}
                <div className="pt-2 border-t border-black flex items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    {/* Copy Direct URL */}
                    <button
                      onClick={() => handleCopyUrl(item)}
                      className="p-1 rounded text-teal-400 hover:text-teal-100 hover:bg-zinc-800 transition-colors"
                      title="Copy stream URL"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-teal-300" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {/* Preview Button */}
                    <button
                      onClick={() => onPreviewMedia(item)}
                      className="px-2 py-1 rounded text-teal-300 hover:text-teal-100 hover:bg-zinc-800 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      <span>Preview</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Gold Accent Download Button */}
                    <button
                      onClick={() => {
                        triggerBrowserDownload(item);
                        onAddToQueue(item);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs border border-black transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
