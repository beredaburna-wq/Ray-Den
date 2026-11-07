import React from "react";
import {
  X,
  Download,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Trash2,
  Film,
  Music,
  Image as ImageIcon,
} from "lucide-react";
import { DownloadTask } from "../types";
import { formatBytes, triggerBrowserDownload } from "../utils/mediaUtils";

interface DownloadManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: DownloadTask[];
  onClearCompleted: () => void;
  onRetryTask: (task: DownloadTask) => void;
}

export const DownloadManagerDrawer: React.FC<DownloadManagerDrawerProps> = ({
  isOpen,
  onClose,
  tasks,
  onClearCompleted,
  onRetryTask,
}) => {
  if (!isOpen) return null;

  const activeCount = tasks.filter((t) => t.status === "downloading" || t.status === "queued").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-zinc-900 border-l border-black shadow-2xl flex flex-col select-none animate-in slide-in-from-right duration-200">
      {/* Header with Grey Surface, Black Border, Teal Text, Gold Badge */}
      <div className="flex items-center justify-between p-4 border-b border-black bg-zinc-950">
        <div className="flex items-center gap-2">
          <Download className="w-5 h-5 text-amber-400" />
          <h2 className="text-sm font-bold text-teal-200 font-display">Download Manager</h2>
          {activeCount > 0 && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-black">
              {activeCount} active
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {completedCount > 0 && (
            <button
              onClick={onClearCompleted}
              className="p-1 rounded text-teal-400 hover:text-teal-200 hover:bg-zinc-800 text-xs"
              title="Clear completed tasks"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <button
            onClick={onClose}
            className="p-1 rounded text-teal-400 hover:text-teal-100 hover:bg-zinc-800"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tasks.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-teal-400/80">
            <Download className="w-10 h-10 text-zinc-600 mb-3" />
            <h3 className="text-sm font-semibold text-teal-200 mb-1">No Downloads Yet</h3>
            <p className="text-xs text-teal-400/70 max-w-xs">
              When you download videos, streams, audio tracks, or batch archives, their progress will appear here.
            </p>
          </div>
        ) : (
          tasks.map((task) => {
            const isFinished = task.status === "completed";
            const isError = task.status === "error";
            const isDownloading = task.status === "downloading" || task.status === "queued";

            return (
              <div
                key={task.id}
                className="bg-zinc-950/80 border border-black rounded-xl p-3 flex flex-col gap-2 relative overflow-hidden"
              >
                {/* Top Row: Icon + Title */}
                <div className="flex items-start gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-black flex items-center justify-center shrink-0">
                    {task.media.type === "video" || task.media.type === "stream" ? (
                      <Film className="w-4 h-4 text-amber-400" />
                    ) : task.media.type === "audio" ? (
                      <Music className="w-4 h-4 text-teal-300" />
                    ) : (
                      <ImageIcon className="w-4 h-4 text-amber-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-teal-200 truncate" title={task.media.title}>
                        {task.media.title}
                      </h4>
                      <span className="text-[10px] font-mono uppercase font-bold text-amber-300 shrink-0">
                        {task.media.format}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-teal-500 mt-0.5">
                      <span className="font-mono tabular-nums text-teal-300">
                        {formatBytes(task.downloadedBytes)}
                        {task.totalBytes ? ` / ${formatBytes(task.totalBytes)}` : ""}
                      </span>
                      {task.speedBytesPerSec > 0 && isDownloading && (
                        <>
                          <span aria-hidden="true" className="text-zinc-600">·</span>
                          <span className="font-mono tabular-nums text-amber-400 font-bold">
                            {formatBytes(task.speedBytesPerSec)}/s
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar with Gold Accent */}
                <div className="w-full bg-zinc-900 h-1.5 rounded-full overflow-hidden border border-black">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isFinished
                        ? "bg-teal-400"
                        : isError
                        ? "bg-rose-500"
                        : "bg-amber-500 animate-pulse"
                    }`}
                    style={{ width: `${Math.max(5, task.progress)}%` }}
                  />
                </div>

                {/* Status footer */}
                <div className="flex items-center justify-between text-[11px] text-teal-400">
                  <div className="flex items-center gap-1.5">
                    {isFinished && (
                      <span className="flex items-center gap-1 text-teal-300 font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
                        <span>Completed</span>
                      </span>
                    )}
                    {isError && (
                      <span className="flex items-center gap-1 text-rose-400 font-semibold">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Failed</span>
                      </span>
                    )}
                    {isDownloading && (
                      <span className="text-amber-400 font-mono tabular-nums font-semibold">
                        {Math.round(task.progress)}% · Transferring...
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {isFinished && (
                      <button
                        onClick={() => triggerBrowserDownload(task.media)}
                        className="p-1 rounded text-teal-400 hover:text-teal-100 hover:bg-zinc-800 transition-colors"
                        title="Save to disk again"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {isError && (
                      <button
                        onClick={() => onRetryTask(task)}
                        className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-750 text-xs text-teal-300 border border-black"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer statistics */}
      {tasks.length > 0 && (
        <div className="p-3 border-t border-black bg-zinc-950 text-xs text-teal-400 flex items-center justify-between font-mono tabular-nums">
          <span>{tasks.length} Total items</span>
          <span className="text-teal-300 font-bold">{completedCount} downloaded</span>
        </div>
      )}
    </div>
  );
};
