import React, { useState, useEffect, useRef } from "react";
import {
  X,
  Download,
  Copy,
  Check,
  Film,
  Music,
  Image as ImageIcon,
} from "lucide-react";
import { MediaItem } from "../types";
import { triggerBrowserDownload, formatBytes } from "../utils/mediaUtils";

interface MediaPreviewModalProps {
  item: MediaItem | null;
  onClose: () => void;
  onAddToQueue: (item: MediaItem) => void;
}

export const MediaPreviewModal: React.FC<MediaPreviewModalProps> = ({
  item,
  onClose,
  onAddToQueue,
}) => {
  const [, setIsPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(item.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    triggerBrowserDownload(item);
    onAddToQueue(item);
  };

  const isVideo = item.type === "video" || item.type === "stream";
  const isAudio = item.type === "audio";
  const isImage = item.type === "image";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-black rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-black bg-zinc-950">
          <div className="flex items-center gap-2.5 truncate mr-4">
            {isVideo && <Film className="w-4 h-4 text-amber-400 shrink-0" />}
            {isAudio && <Music className="w-4 h-4 text-teal-300 shrink-0" />}
            {isImage && <ImageIcon className="w-4 h-4 text-amber-400 shrink-0" />}
            <span className="text-sm font-semibold text-teal-200 truncate" title={item.title}>
              {item.title}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-zinc-800 hover:bg-zinc-750 text-teal-300 text-xs font-semibold border border-black transition-colors"
              title="Copy stream link"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-amber-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "Copied" : "Copy Link"}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 rounded-md text-teal-400 hover:text-teal-100 hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Media Preview Stage */}
        <div className="flex-1 bg-black/95 flex items-center justify-center min-h-[300px] max-h-[520px] overflow-hidden relative">
          {isVideo && (
            <video
              ref={videoRef}
              src={item.url}
              controls
              autoPlay
              playsInline
              className="w-full max-h-[500px] object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            />
          )}

          {isAudio && (
            <div className="w-full max-w-lg p-8 flex flex-col items-center justify-center">
              <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-black flex items-center justify-center mb-6 shadow-xl">
                <Music className="w-10 h-10 text-teal-300 animate-pulse" />
              </div>

              <div className="w-full mb-4">
                <h3 className="text-base font-semibold text-teal-200 text-center truncate mb-1">
                  {item.title}
                </h3>
                <p className="text-xs text-teal-400 text-center font-mono">
                  {item.format.toUpperCase()} · {item.sizeFormatted || "Audio Stream"}
                </p>
              </div>

              <audio ref={audioRef} src={item.url} controls autoPlay className="w-full" />
            </div>
          )}

          {isImage && (
            <img
              src={item.url}
              alt={item.title}
              referrerPolicy="no-referrer"
              className="w-full max-h-[500px] object-contain"
            />
          )}
        </div>

        {/* Modal Footer & Actions */}
        <div className="px-5 py-3.5 border-t border-black bg-zinc-950 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-xs text-teal-400">
            <span className="font-mono uppercase font-bold text-amber-300 px-2 py-0.5 rounded bg-amber-500/10 border border-black">
              {item.format}
            </span>
            <span className="font-mono tabular-nums text-teal-300">
              {item.sizeFormatted || (item.sizeBytes ? formatBytes(item.sizeBytes) : "Dynamic")}
            </span>
            <span className="hidden sm:inline text-zinc-600">·</span>
            <span className="hidden sm:inline text-teal-500 truncate max-w-xs">{item.sourcePageUrl}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold border border-black shadow-lg shadow-amber-500/20 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
