import React, { useRef, useEffect, useState } from "react";
import {
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  Film,
} from "lucide-react";
import { BrowserTab, MediaItem } from "../types";

interface BrowserViewportProps {
  activeTab: BrowserTab;
  viewportMode: "desktop" | "tablet" | "mobile";
  onMediaDetected: (tabId: string, items: MediaItem[], pageTitle?: string) => void;
  onOpenMediaDeck: () => void;
}

export const BrowserViewport: React.FC<BrowserViewportProps> = ({
  activeTab,
  viewportMode,
  onMediaDetected,
  onOpenMediaDeck,
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [, setIframeLoaded] = useState(false);

  // Derive proxied URL
  const proxyUrl = activeTab.url
    ? `/api/browser/view?url=${encodeURIComponent(activeTab.url)}`
    : "";

  useEffect(() => {
    setIframeLoaded(false);
    setLoadError(null);
  }, [activeTab.url]);

  // Listen for messages from injected sniffer script
  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      try {
        if (e.data && e.data.type === "OMNI_MEDIA_DETECTED") {
          const rawItems = e.data.items || [];
          const convertedItems: MediaItem[] = rawItems.map((item: any, idx: number) => ({
            id: `sniff-${Date.now()}-${idx}`,
            url: item.url,
            title: item.title || activeTab.title || "Detected Media",
            type: item.type || "video",
            format: item.format || (item.url.includes(".m3u8") ? "m3u8" : item.url.split(".").pop()?.split("?")[0] || "mp4"),
            sourcePageUrl: activeTab.url,
            isDownloadable: true,
          }));

          if (convertedItems.length > 0) {
            onMediaDetected(activeTab.id, convertedItems, e.data.pageTitle);
          }
        }
      } catch (err) {
        console.warn("Error processing iframe message:", err);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [activeTab.id, activeTab.url, activeTab.title, onMediaDetected]);

  // Get viewport width constraint
  const getContainerWidth = () => {
    switch (viewportMode) {
      case "mobile":
        return "max-w-[390px] border-x border-black shadow-2xl";
      case "tablet":
        return "max-w-[768px] border-x border-black shadow-2xl";
      case "desktop":
      default:
        return "w-full";
    }
  };

  const domain = (() => {
    try {
      return new URL(activeTab.url).hostname;
    } catch {
      return activeTab.url;
    }
  })();

  return (
    <div className="flex-1 flex flex-col bg-zinc-900 items-center overflow-hidden relative">
      {/* Top Page Status Bar with Grey Surface, Black Border, Teal Text, Gold Badge */}
      <div className="w-full flex items-center justify-between px-3 py-1.5 bg-zinc-950 border-b border-black text-xs text-teal-400 select-none shrink-0 z-10">
        <div className="flex items-center gap-2 truncate">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" />
          <span className="font-mono text-teal-200 truncate">{domain}</span>
          <span className="text-zinc-600">·</span>
          <span className="text-[11px] text-teal-400/80 truncate hidden sm:inline">{activeTab.title || "Loading..."}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {activeTab.detectedMedia.length > 0 && (
            <button
              onClick={onOpenMediaDeck}
              className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-black text-[11px] font-bold hover:bg-amber-500/30 transition-all cursor-pointer shadow-sm"
            >
              <Film className="w-3 h-3 text-amber-400" />
              <span>{activeTab.detectedMedia.length} Media Found</span>
            </button>
          )}

          <a
            href={activeTab.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 p-1 text-teal-400 hover:text-teal-100 transition-colors"
            title="Open in new native window"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Loading Bar with Gold Accent */}
      {activeTab.isLoading && (
        <div className="w-full h-0.5 bg-zinc-800 overflow-hidden shrink-0 border-b border-black">
          <div className="h-full bg-amber-500 animate-pulse w-full" />
        </div>
      )}

      {/* Viewport Frame */}
      <div className="flex-1 w-full flex justify-center bg-zinc-900 overflow-hidden relative">
        <div className={`h-full flex flex-col transition-all duration-200 bg-white ${getContainerWidth()}`}>
          {loadError ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-zinc-900 text-teal-200 text-center">
              <AlertCircle className="w-10 h-10 text-amber-400 mb-3" />
              <h3 className="text-base font-semibold text-teal-100 mb-1">Could Not Load Embedded View</h3>
              <p className="text-xs text-teal-400/80 max-w-md mb-4">{loadError}</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setLoadError(null);
                    if (iframeRef.current) iframeRef.current.src = proxyUrl;
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs border border-black"
                >
                  Retry Loading
                </button>
                <a
                  href={activeTab.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-teal-300 text-xs font-semibold border border-black"
                >
                  Open in New Tab
                </a>
              </div>
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              src={proxyUrl}
              title={activeTab.title || "Browser View"}
              className="w-full h-full border-0 bg-white"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
              onLoad={() => {
                setIframeLoaded(true);
              }}
              onError={() => {
                setLoadError("The target site refused embedded connection. OmniStream deep scraper can still extract all media.");
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
