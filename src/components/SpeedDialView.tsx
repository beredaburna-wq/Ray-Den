import React, { useState } from "react";
import {
  Film,
  Music,
  Image,
  Globe,
  Radio,
  Sparkles,
  ArrowRight,
  Download,
  Layers,
  Zap,
} from "lucide-react";
import { CURATED_BOOKMARKS } from "../bookmarks";

interface SpeedDialViewProps {
  onNavigate: (url: string) => void;
  onSniffDirect: (url: string) => void;
}

export const SpeedDialView: React.FC<SpeedDialViewProps> = ({ onNavigate, onSniffDirect }) => {
  const [quickInput, setQuickInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  const categories = ["All", "Cinema & Video", "Audio & Podcasts", "Creative Commons", "Stock & Galleries", "Live Streams"];

  const filteredBookmarks =
    selectedCategory === "All"
      ? CURATED_BOOKMARKS
      : CURATED_BOOKMARKS.filter((b) => b.category === selectedCategory);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInput.trim()) return;
    onNavigate(quickInput.trim());
  };

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Film":
        return <Film className="w-5 h-5 text-amber-400" />;
      case "Music":
        return <Music className="w-5 h-5 text-teal-300" />;
      case "Image":
        return <Image className="w-5 h-5 text-amber-400" />;
      case "Globe":
        return <Globe className="w-5 h-5 text-teal-300" />;
      case "Radio":
        return <Radio className="w-5 h-5 text-amber-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-amber-400" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-900 p-6 md:p-10 flex flex-col items-center">
      <div className="w-full max-w-4xl flex flex-col items-center text-center mb-8">
        {/* Brand Tag with Gold Accent & Black Border */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-amber-500/10 border border-black text-amber-300 text-xs font-semibold mb-4 shadow-sm">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Universal In-Browser Media Downloader</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold font-display text-teal-200 tracking-tight mb-3">
          Browse Any Website. Download Any Media.
        </h1>
        <p className="text-teal-400/80 text-sm max-w-xl mb-8 leading-relaxed">
          Navigate to any video sharing platform, streaming archive, audio catalog, or photo gallery. OmniStream detects streams, HLS playlists, MP4s, MP3s, and images in real time.
        </p>

        {/* Center Quick Nav Input with Grey Surface & Black Border */}
        <form onSubmit={handleQuickSubmit} className="w-full max-w-2xl mb-8">
          <div className="relative flex items-center bg-zinc-950 border border-black rounded-xl p-2 shadow-2xl focus-within:ring-2 focus-within:ring-amber-500/50 transition-all">
            <Globe className="w-5 h-5 text-teal-400 ml-3 mr-3 shrink-0" />
            <input
              type="text"
              value={quickInput}
              onChange={(e) => setQuickInput(e.target.value)}
              placeholder="Paste any website or video URL (e.g. archive.org, peach.blender.org)..."
              className="w-full bg-transparent text-sm text-teal-100 placeholder-teal-600/70 focus:outline-none py-1"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => quickInput.trim() && onSniffDirect(quickInput.trim())}
                className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-750 text-teal-300 text-xs font-semibold border border-black transition-colors"
                title="Deep scan without opening browser view"
              >
                Scan Only
              </button>
              {/* Gold Accent Primary Button */}
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs transition-colors border border-black shadow-md"
              >
                <span>Browse & Sniff</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </form>

        {/* Category Filter Pills (Functional button segment controls) */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-950 rounded-lg border border-black overflow-x-auto max-w-full mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md whitespace-nowrap transition-colors border ${
                selectedCategory === cat
                  ? "bg-amber-500 text-zinc-950 border-black shadow-sm"
                  : "bg-transparent text-teal-400/80 hover:text-teal-200 hover:bg-zinc-850 border-transparent"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Bookmarks Grid: Grey Cards, Black Border, Teal Text, Gold Accents */}
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {filteredBookmarks.map((bookmark) => (
          <div
            key={bookmark.id}
            onClick={() => onNavigate(bookmark.url)}
            className="group relative bg-zinc-950/70 hover:bg-zinc-950 border border-black rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 rounded-lg bg-zinc-900 border border-black group-hover:border-amber-500/40 transition-colors">
                  {getIcon(bookmark.iconName)}
                </div>
                <span className="text-[11px] font-mono text-amber-300 font-bold bg-amber-500/10 border border-black px-2 py-0.5 rounded">
                  {bookmark.badge}
                </span>
              </div>

              <h3 className="text-sm font-semibold text-teal-200 group-hover:text-teal-100 transition-colors mb-1 text-left">
                {bookmark.title}
              </h3>
              <p className="text-xs text-teal-400/80 text-left line-clamp-2 leading-relaxed">
                {bookmark.description}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-black flex items-center justify-between text-xs text-teal-500">
              <span className="truncate max-w-[180px] font-mono text-[10px] text-teal-600">
                {bookmark.url.replace("https://", "").replace("http://", "")}
              </span>
              <div className="flex items-center gap-1 text-amber-400 font-bold group-hover:translate-x-0.5 transition-transform">
                <span>Open</span>
                <ArrowRight className="w-3 h-3" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Capability Highlights */}
      <div className="w-full max-w-4xl border-t border-black pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-zinc-950 border border-black shrink-0">
            <Download className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-teal-200 mb-1">CORS & Referrer Bypass</h4>
            <p className="text-xs text-teal-400/80 leading-relaxed">
              Downloads route through our genuine proxy engine to eliminate 403 Forbidden errors from anti-hotlinking CDNs.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-zinc-950 border border-black shrink-0">
            <Radio className="w-4 h-4 text-teal-300" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-teal-200 mb-1">HLS Stream Stitching</h4>
            <p className="text-xs text-teal-400/80 leading-relaxed">
              Automatically captures adaptive M3U8 playlists and concatenates segmented TS chunks into a single unified video.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-zinc-950 border border-black shrink-0">
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-teal-200 mb-1">Batch Zip Packaging</h4>
            <p className="text-xs text-teal-400/80 leading-relaxed">
              Select multiple media items or complete photo galleries on any webpage and download them in a single zipped archive.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
