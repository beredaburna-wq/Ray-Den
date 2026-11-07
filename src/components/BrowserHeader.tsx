import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Home,
  ShieldCheck,
  Search,
  Download,
  Film,
  Plus,
  X,
  Laptop,
  Tablet,
  Smartphone,
  Sparkles,
} from "lucide-react";
import { BrowserTab } from "../types";

interface BrowserHeaderProps {
  tabs: BrowserTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onCloseTab: (id: string) => void;
  onNewTab: () => void;
  onNavigate: (url: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onReload: () => void;
  onGoHome: () => void;
  detectedCount: number;
  onToggleMediaDeck: () => void;
  isMediaDeckOpen: boolean;
  onToggleDownloadManager: () => void;
  activeDownloadsCount: number;
  viewportMode: "desktop" | "tablet" | "mobile";
  onChangeViewportMode: (mode: "desktop" | "tablet" | "mobile") => void;
  onOpenQuickSniffer: () => void;
}

export const BrowserHeader: React.FC<BrowserHeaderProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCloseTab,
  onNewTab,
  onNavigate,
  onGoBack,
  onGoForward,
  onReload,
  onGoHome,
  detectedCount,
  onToggleMediaDeck,
  isMediaDeckOpen,
  onToggleDownloadManager,
  activeDownloadsCount,
  viewportMode,
  onChangeViewportMode,
  onOpenQuickSniffer,
}) => {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const [addressInput, setAddressInput] = useState(activeTab?.displayUrl || "");

  useEffect(() => {
    if (activeTab) {
      setAddressInput(activeTab.displayUrl || activeTab.url);
    }
  }, [activeTab?.displayUrl, activeTab?.url]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addressInput.trim()) return;
    onNavigate(addressInput.trim());
  };

  const isHttps = activeTab?.url.startsWith("https://");

  return (
    <header className="bg-zinc-900 border-b border-black shrink-0 select-none flex flex-col">
      {/* Tab Strip */}
      <div className="flex items-center px-2 pt-2 gap-1 overflow-x-auto scrollbar-none bg-zinc-950 border-b border-black">
        {/* Brand Lockup */}
        <div className="flex items-center gap-1.5 px-3 py-1 mr-2 text-teal-300 font-bold tracking-tight text-sm shrink-0">
          <Film className="w-4 h-4 text-amber-400" />
          <span className="font-display tracking-wide text-teal-200">OmniStream</span>
        </div>

        {/* Tab Items */}
        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`group relative flex items-center gap-2 max-w-[220px] min-w-[140px] px-3 py-1.5 rounded-t-lg text-xs font-medium cursor-pointer transition-all border-t border-x ${
                  isActive
                    ? "bg-zinc-900 border-black text-teal-200 shadow-sm"
                    : "bg-zinc-950/80 border-transparent text-teal-400/60 hover:bg-zinc-900/60 hover:text-teal-300"
                }`}
              >
                <div className="w-3.5 h-3.5 shrink-0 flex items-center justify-center">
                  {tab.isLoading ? (
                    <RotateCw className="w-3 h-3 text-amber-400 animate-spin" />
                  ) : (
                    <span
                      className={`w-2 h-2 rounded-full transition-colors ${
                        isActive ? "bg-amber-400" : "bg-zinc-600 group-hover:bg-teal-400"
                      }`}
                    />
                  )}
                </div>

                <span className="truncate flex-1" title={tab.title || tab.url}>
                  {tab.title || "New Tab"}
                </span>

                {tab.detectedMedia.length > 0 && (
                  <span className="text-[10px] tabular-nums font-mono text-amber-300 font-bold px-1 rounded bg-amber-500/20 border border-black">
                    {tab.detectedMedia.length}
                  </span>
                )}

                {tabs.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCloseTab(tab.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-zinc-800 text-teal-400 hover:text-teal-200 transition-opacity"
                    title="Close tab"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={onNewTab}
            className="p-1.5 rounded-md text-teal-400/70 hover:text-teal-200 hover:bg-zinc-850 transition-colors"
            title="Open new tab"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Standalone Quick URL Scraper trigger with Gold Accent */}
        <button
          onClick={onOpenQuickSniffer}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-500/10 hover:bg-amber-500/20 border border-black transition-colors shrink-0 shadow-sm"
          title="Directly grab media from any URL without navigating"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Quick Sniffer</span>
        </button>
      </div>

      {/* Main Navigation & Omnibox Bar */}
      <div className="flex items-center justify-between gap-3 px-3 py-2">
        {/* Navigation History Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onGoBack}
            disabled={!activeTab?.canGoBack}
            className={`p-1.5 rounded-md transition-colors ${
              activeTab?.canGoBack
                ? "text-teal-300 hover:bg-zinc-800 hover:text-teal-100"
                : "text-zinc-600 cursor-not-allowed"
            }`}
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <button
            onClick={onGoForward}
            disabled={!activeTab?.canGoForward}
            className={`p-1.5 rounded-md transition-colors ${
              activeTab?.canGoForward
                ? "text-teal-300 hover:bg-zinc-800 hover:text-teal-100"
                : "text-zinc-600 cursor-not-allowed"
            }`}
            title="Go forward"
          >
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onReload}
            className={`p-1.5 rounded-md text-teal-300 hover:bg-zinc-800 hover:text-teal-100 transition-colors ${
              activeTab?.isLoading ? "text-amber-400" : ""
            }`}
            title="Reload page"
          >
            <RotateCw className={`w-4 h-4 ${activeTab?.isLoading ? "animate-spin text-amber-400" : ""}`} />
          </button>

          <button
            onClick={onGoHome}
            className="p-1.5 rounded-md text-teal-300 hover:bg-zinc-800 hover:text-teal-100 transition-colors"
            title="Go to Start Page / Bookmarks"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>

        {/* Omnibox / Smart Address Bar with Black Border & Teal Font */}
        <form onSubmit={handleSubmit} className="flex-1 max-w-3xl">
          <div className="relative flex items-center bg-zinc-950 border border-black rounded-lg px-2.5 py-1.5 focus-within:ring-1 focus-within:ring-amber-500 transition-all shadow-inner">
            <div className="flex items-center gap-1.5 text-teal-400 mr-2 shrink-0">
              {isHttps ? (
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" title="Secure Connection" />
              ) : (
                <Search className="w-3.5 h-3.5 text-teal-500" />
              )}
            </div>

            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="Search or enter web address (e.g. archive.org, peach.blender.org)..."
              className="w-full bg-transparent text-xs text-teal-200 placeholder-teal-600/70 focus:outline-none"
            />

            {addressInput && (
              <button
                type="button"
                onClick={() => setAddressInput("")}
                className="p-0.5 rounded text-teal-500 hover:text-teal-200 hover:bg-zinc-800 mr-1"
                title="Clear address"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Gold Accent Go Button */}
            <button
              type="submit"
              className="px-2.5 py-0.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 text-[11px] font-bold transition-colors shrink-0 border border-black shadow-sm"
            >
              Go
            </button>
          </div>
        </form>

        {/* Right Tools: Viewport toggle + Sniffer badge + Downloads */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Viewport switch */}
          <div className="hidden lg:flex items-center bg-zinc-950 p-0.5 rounded-md border border-black">
            <button
              onClick={() => onChangeViewportMode("desktop")}
              className={`p-1 rounded text-xs transition-colors ${
                viewportMode === "desktop" ? "bg-zinc-800 text-amber-400" : "text-teal-600 hover:text-teal-300"
              }`}
              title="Desktop viewport (100%)"
            >
              <Laptop className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onChangeViewportMode("tablet")}
              className={`p-1 rounded text-xs transition-colors ${
                viewportMode === "tablet" ? "bg-zinc-800 text-amber-400" : "text-teal-600 hover:text-teal-300"
              }`}
              title="Tablet viewport (768px)"
            >
              <Tablet className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onChangeViewportMode("mobile")}
              className={`p-1 rounded text-xs transition-colors ${
                viewportMode === "mobile" ? "bg-zinc-800 text-amber-400" : "text-teal-600 hover:text-teal-300"
              }`}
              title="Mobile viewport (375px)"
            >
              <Smartphone className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Media Sniffer Toggle with Gold Accent & Black Border */}
          <button
            onClick={onToggleMediaDeck}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-black transition-all ${
              detectedCount > 0
                ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                : "bg-zinc-800 text-teal-300 hover:bg-zinc-750"
            } ${isMediaDeckOpen ? "ring-1 ring-amber-400" : ""}`}
            title="Toggle Media Downloader Panel"
          >
            <Film className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Media</span>
            <span
              className={`text-[10px] font-mono tabular-nums font-bold px-1.5 py-0.2 rounded border border-black ${
                detectedCount > 0 ? "bg-amber-500 text-zinc-950" : "bg-zinc-700 text-teal-300"
              }`}
            >
              {detectedCount}
            </span>
          </button>

          {/* Download Manager Drawer Button with Gold Accent Indicator */}
          <button
            onClick={onToggleDownloadManager}
            className="relative p-1.5 rounded-lg bg-zinc-800 text-teal-300 hover:bg-zinc-750 hover:text-teal-100 border border-black transition-colors"
            title="Download Manager"
          >
            <Download className="w-4 h-4" />
            {activeDownloadsCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[9px] font-bold text-zinc-950 border border-black">
                {activeDownloadsCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
