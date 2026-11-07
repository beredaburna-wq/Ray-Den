import React, { useState, useEffect, useCallback } from "react";
import { BrowserTab, MediaItem, DownloadTask } from "./types";
import { BrowserHeader } from "./components/BrowserHeader";
import { SpeedDialView } from "./components/SpeedDialView";
import { BrowserViewport } from "./components/BrowserViewport";
import { MediaSnifferDeck } from "./components/MediaSnifferDeck";
import { MediaPreviewModal } from "./components/MediaPreviewModal";
import { DownloadManagerDrawer } from "./components/DownloadManagerDrawer";
import { QuickUrlSnifferModal } from "./components/QuickUrlSnifferModal";

const INITIAL_TAB: BrowserTab = {
  id: "tab-home",
  title: "OmniStream - Start Page",
  url: "",
  displayUrl: "",
  isLoading: false,
  history: [""],
  historyIndex: 0,
  detectedMedia: [],
};

export default function App() {
  const [tabs, setTabs] = useState<BrowserTab[]>([INITIAL_TAB]);
  const [activeTabId, setActiveTabId] = useState<string>("tab-home");
  const [isMediaDeckOpen, setIsMediaDeckOpen] = useState(true);
  const [isDownloadManagerOpen, setIsDownloadManagerOpen] = useState(false);
  const [isQuickSnifferOpen, setIsQuickSnifferOpen] = useState(false);
  const [previewMediaItem, setPreviewMediaItem] = useState<MediaItem | null>(null);
  const [downloadTasks, setDownloadTasks] = useState<DownloadTask[]>([]);
  const [viewportMode, setViewportMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isScanningActiveTab, setIsScanningActiveTab] = useState(false);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  // Deep scan helper
  const performDeepScan = useCallback(async (tabId: string, url: string) => {
    if (!url || url.startsWith("about:") || url === "") return;
    setIsScanningActiveTab(true);

    try {
      const res = await fetch("/api/media/sniff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (res.ok) {
        const data = await res.json();
        const scannedItems: MediaItem[] = data.items || [];

        setTabs((prevTabs) =>
          prevTabs.map((t) => {
            if (t.id === tabId) {
              // Merge items deduplicating by URL
              const existingUrls = new Set(t.detectedMedia.map((m) => m.url));
              const newItems = scannedItems.filter((m) => !existingUrls.has(m.url));
              return {
                ...t,
                title: data.pageTitle || t.title,
                detectedMedia: [...t.detectedMedia, ...newItems],
                lastScanTimestamp: Date.now(),
              };
            }
            return t;
          })
        );
      }
    } catch (err) {
      console.warn("Background scan error:", err);
    } finally {
      setIsScanningActiveTab(false);
    }
  }, []);

  // Navigation Handler
  const handleNavigate = useCallback(
    (targetInput: string) => {
      let finalUrl = targetInput.trim();
      if (!finalUrl) return;

      // Detect if user typed a search query instead of a URL
      const isDomainOrUrl =
        finalUrl.includes(".") && !finalUrl.includes(" ") && !finalUrl.startsWith("?");
      if (!isDomainOrUrl && !finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        // Search DuckDuckGo via query
        finalUrl = `https://duckduckgo.com/?q=${encodeURIComponent(finalUrl)}`;
      } else if (!finalUrl.startsWith("http://") && !finalUrl.startsWith("https://")) {
        finalUrl = "https://" + finalUrl;
      }

      setTabs((prevTabs) =>
        prevTabs.map((t) => {
          if (t.id === activeTabId) {
            const nextHistory = t.history.slice(0, t.historyIndex + 1);
            nextHistory.push(finalUrl);
            return {
              ...t,
              url: finalUrl,
              displayUrl: finalUrl,
              title: new URL(finalUrl).hostname,
              isLoading: true,
              history: nextHistory,
              historyIndex: nextHistory.length - 1,
              detectedMedia: [], // clear for new page
            };
          }
          return t;
        })
      );

      // Trigger server-side media extraction
      performDeepScan(activeTabId, finalUrl);
    },
    [activeTabId, performDeepScan]
  );

  const handleGoBack = () => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => {
        if (t.id === activeTabId && t.historyIndex > 0) {
          const nextIndex = t.historyIndex - 1;
          const targetUrl = t.history[nextIndex];
          return {
            ...t,
            url: targetUrl,
            displayUrl: targetUrl,
            historyIndex: nextIndex,
            detectedMedia: [],
          };
        }
        return t;
      })
    );
  };

  const handleGoForward = () => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => {
        if (t.id === activeTabId && t.historyIndex < t.history.length - 1) {
          const nextIndex = t.historyIndex + 1;
          const targetUrl = t.history[nextIndex];
          return {
            ...t,
            url: targetUrl,
            displayUrl: targetUrl,
            historyIndex: nextIndex,
            detectedMedia: [],
          };
        }
        return t;
      })
    );
  };

  const handleReload = () => {
    if (!activeTab.url) return;
    setTabs((prevTabs) =>
      prevTabs.map((t) => (t.id === activeTabId ? { ...t, isLoading: true } : t))
    );
    performDeepScan(activeTabId, activeTab.url);
  };

  const handleGoHome = () => {
    setTabs((prevTabs) =>
      prevTabs.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              url: "",
              displayUrl: "",
              title: "Start Page",
              detectedMedia: [],
            }
          : t
      )
    );
  };

  const handleNewTab = () => {
    const newId = `tab-${Date.now()}`;
    const newTab: BrowserTab = {
      id: newId,
      title: "New Tab",
      url: "",
      displayUrl: "",
      isLoading: false,
      history: [""],
      historyIndex: 0,
      detectedMedia: [],
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newId);
  };

  const handleCloseTab = (idToClose: string) => {
    if (tabs.length === 1) {
      handleGoHome();
      return;
    }
    const idx = tabs.findIndex((t) => t.id === idToClose);
    const nextTabs = tabs.filter((t) => t.id !== idToClose);
    setTabs(nextTabs);
    if (activeTabId === idToClose) {
      const fallbackTab = nextTabs[Math.max(0, idx - 1)];
      setActiveTabId(fallbackTab.id);
    }
  };

  // Callback when iframe bridge detects media in real-time
  const handleMediaDetected = useCallback(
    (tabId: string, items: MediaItem[], pageTitle?: string) => {
      setTabs((prevTabs) =>
        prevTabs.map((t) => {
          if (t.id === tabId) {
            const existingUrls = new Set(t.detectedMedia.map((m) => m.url));
            const freshItems = items.filter((m) => !existingUrls.has(m.url));
            if (freshItems.length === 0) return t;

            return {
              ...t,
              title: pageTitle || t.title,
              detectedMedia: [...t.detectedMedia, ...freshItems],
            };
          }
          return t;
        })
      );
    },
    []
  );

  // Add task to Download Manager with progress simulation
  const handleAddToQueue = useCallback((item: MediaItem) => {
    const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const totalBytes = item.sizeBytes || 15 * 1024 * 1024; // fallback estimate
    const newTask: DownloadTask = {
      id: taskId,
      media: item,
      status: "downloading",
      progress: 0,
      downloadedBytes: 0,
      totalBytes,
      speedBytesPerSec: 3.5 * 1024 * 1024, // 3.5 MB/s
      startedAt: Date.now(),
    };

    setDownloadTasks((prev) => [newTask, ...prev]);

    // Simulate realistic progress interval
    const interval = setInterval(() => {
      setDownloadTasks((prev) =>
        prev.map((t) => {
          if (t.id === taskId) {
            const added = Math.floor(Math.random() * (1024 * 1024) + 600 * 1024);
            const nextBytes = Math.min(t.downloadedBytes + added, t.totalBytes || totalBytes);
            const progress = (nextBytes / (t.totalBytes || totalBytes)) * 100;
            const isDone = progress >= 100;

            if (isDone) {
              clearInterval(interval);
              return {
                ...t,
                progress: 100,
                downloadedBytes: t.totalBytes || totalBytes,
                status: "completed",
                completedAt: Date.now(),
              };
            }

            return {
              ...t,
              progress,
              downloadedBytes: nextBytes,
              speedBytesPerSec: 2.8 * 1024 * 1024 + Math.random() * (1024 * 1024),
            };
          }
          return t;
        })
      );
    }, 400);
  }, []);

  const handleClearCompleted = () => {
    setDownloadTasks((prev) => prev.filter((t) => t.status !== "completed"));
  };

  const handleRetryTask = (task: DownloadTask) => {
    handleAddToQueue(task.media);
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-zinc-900 font-sans text-teal-200">
      {/* OmniStream Top Browser Header */}
      <BrowserHeader
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={handleCloseTab}
        onNewTab={handleNewTab}
        onNavigate={handleNavigate}
        onGoBack={handleGoBack}
        onGoForward={handleGoForward}
        onReload={handleReload}
        onGoHome={handleGoHome}
        detectedCount={activeTab.detectedMedia.length}
        onToggleMediaDeck={() => setIsMediaDeckOpen((prev) => !prev)}
        isMediaDeckOpen={isMediaDeckOpen}
        onToggleDownloadManager={() => setIsDownloadManagerOpen((prev) => !prev)}
        activeDownloadsCount={downloadTasks.filter((t) => t.status === "downloading").length}
        viewportMode={viewportMode}
        onChangeViewportMode={setViewportMode}
        onOpenQuickSniffer={() => setIsQuickSnifferOpen(true)}
      />

      {/* Main Workspace (Split Pane View) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Side: Web Page Viewport or Start/SpeedDial Page */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {!activeTab.url ? (
            <SpeedDialView
              onNavigate={handleNavigate}
              onSniffDirect={(url) => {
                handleNavigate(url);
                setIsMediaDeckOpen(true);
              }}
            />
          ) : (
            <BrowserViewport
              activeTab={activeTab}
              viewportMode={viewportMode}
              onMediaDetected={handleMediaDetected}
              onOpenMediaDeck={() => setIsMediaDeckOpen(true)}
            />
          )}
        </div>

        {/* Right Side: Media Downloader Deck Drawer / Split Panel */}
        {isMediaDeckOpen && (
          <aside className="w-80 md:w-96 lg:w-[420px] h-full shrink-0 shadow-2xl z-20 flex flex-col transition-all">
            <MediaSnifferDeck
              items={activeTab.detectedMedia}
              pageTitle={activeTab.title}
              pageUrl={activeTab.url}
              isScanning={isScanningActiveTab}
              onRefreshScan={() => performDeepScan(activeTabId, activeTab.url)}
              onPreviewMedia={(item) => setPreviewMediaItem(item)}
              onAddToQueue={handleAddToQueue}
            />
          </aside>
        )}
      </div>

      {/* Media Player / Inspector Modal */}
      <MediaPreviewModal
        item={previewMediaItem}
        onClose={() => setPreviewMediaItem(null)}
        onAddToQueue={handleAddToQueue}
      />

      {/* Download Manager Drawer */}
      <DownloadManagerDrawer
        isOpen={isDownloadManagerOpen}
        onClose={() => setIsDownloadManagerOpen(false)}
        tasks={downloadTasks}
        onClearCompleted={handleClearCompleted}
        onRetryTask={handleRetryTask}
      />

      {/* Quick Standalone URL Sniffer Modal */}
      <QuickUrlSnifferModal
        isOpen={isQuickSnifferOpen}
        onClose={() => setIsQuickSnifferOpen(false)}
        onPreviewMedia={(item) => setPreviewMediaItem(item)}
        onAddToQueue={handleAddToQueue}
        onOpenInBrowser={(url) => {
          handleNavigate(url);
          setIsMediaDeckOpen(true);
        }}
      />
    </div>
  );
}
