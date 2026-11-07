import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import * as cheerio from "cheerio";
import JSZip from "jszip";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Standard modern browser user agent
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface MediaItem {
  id: string;
  url: string;
  title: string;
  type: "video" | "audio" | "image" | "stream" | "document";
  format: string; // 'mp4', 'm3u8', 'webm', 'mp3', 'jpg', etc.
  sizeBytes?: number;
  sizeFormatted?: string;
  dimensions?: { width: number; height: number };
  duration?: string;
  thumbnail?: string;
  sourcePageUrl: string;
  quality?: string; // '1080p', '720p', 'Original', 'High'
  isDownloadable: boolean;
}

function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes <= 0) return "Unknown size";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

function getFilenameFromUrl(urlStr: string, fallback = "media_download"): string {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      const clean = decodeURIComponent(last.split("?")[0]);
      if (clean && clean.includes(".")) {
        return clean.replace(/[^a-zA-Z0-9._-]/g, "_");
      }
    }
  } catch {}
  return fallback;
}

function normalizeUrl(target: string, baseUrl: string): string | null {
  if (!target || target.startsWith("data:") || target.startsWith("javascript:")) return null;
  try {
    return new URL(target.trim(), baseUrl).href;
  } catch {
    return null;
  }
}

// Media Extension Classifier
function classifyMedia(urlStr: string, contentType = ""): { type: MediaItem["type"]; format: string } {
  const lowerUrl = urlStr.toLowerCase().split("?")[0];
  const lowerCt = contentType.toLowerCase();

  // HLS / Dash
  if (lowerUrl.endsWith(".m3u8") || lowerCt.includes("application/x-mpegurl") || lowerCt.includes("vnd.apple.mpegurl")) {
    return { type: "stream", format: "m3u8" };
  }
  if (lowerUrl.endsWith(".mpd") || lowerCt.includes("dash+xml")) {
    return { type: "stream", format: "mpd" };
  }

  // Videos
  if (
    lowerUrl.endsWith(".mp4") ||
    lowerUrl.endsWith(".m4v") ||
    lowerUrl.endsWith(".webm") ||
    lowerUrl.endsWith(".mov") ||
    lowerUrl.endsWith(".mkv") ||
    lowerUrl.endsWith(".avi") ||
    lowerUrl.endsWith(".flv") ||
    lowerCt.startsWith("video/")
  ) {
    let ext = "mp4";
    if (lowerUrl.endsWith(".webm") || lowerCt.includes("webm")) ext = "webm";
    else if (lowerUrl.endsWith(".mov") || lowerCt.includes("quicktime")) ext = "mov";
    else if (lowerUrl.endsWith(".mkv")) ext = "mkv";
    return { type: "video", format: ext };
  }

  // Audio
  if (
    lowerUrl.endsWith(".mp3") ||
    lowerUrl.endsWith(".m4a") ||
    lowerUrl.endsWith(".aac") ||
    lowerUrl.endsWith(".ogg") ||
    lowerUrl.endsWith(".wav") ||
    lowerUrl.endsWith(".flac") ||
    lowerCt.startsWith("audio/")
  ) {
    let ext = "mp3";
    if (lowerUrl.endsWith(".m4a")) ext = "m4a";
    else if (lowerUrl.endsWith(".wav")) ext = "wav";
    else if (lowerUrl.endsWith(".flac")) ext = "flac";
    else if (lowerUrl.endsWith(".ogg")) ext = "ogg";
    return { type: "audio", format: ext };
  }

  // Images
  if (
    lowerUrl.endsWith(".jpg") ||
    lowerUrl.endsWith(".jpeg") ||
    lowerUrl.endsWith(".png") ||
    lowerUrl.endsWith(".webp") ||
    lowerUrl.endsWith(".gif") ||
    lowerUrl.endsWith(".svg") ||
    lowerUrl.endsWith(".avif") ||
    lowerCt.startsWith("image/")
  ) {
    let ext = "jpg";
    if (lowerUrl.endsWith(".png") || lowerCt.includes("png")) ext = "png";
    else if (lowerUrl.endsWith(".webp") || lowerCt.includes("webp")) ext = "webp";
    else if (lowerUrl.endsWith(".gif") || lowerCt.includes("gif")) ext = "gif";
    else if (lowerUrl.endsWith(".svg") || lowerCt.includes("svg")) ext = "svg";
    return { type: "image", format: ext };
  }

  // Subtitles / Docs
  if (lowerUrl.endsWith(".vtt") || lowerUrl.endsWith(".srt") || lowerUrl.endsWith(".pdf")) {
    const ext = lowerUrl.split(".").pop() || "doc";
    return { type: "document", format: ext };
  }

  return { type: "document", format: "bin" };
}

// Deep Probe utility with timeout
async function probeUrl(urlStr: string, referrer: string): Promise<{ sizeBytes?: number; contentType?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(urlStr, {
      method: "HEAD",
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Referer: referrer,
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const ct = res.headers.get("content-type") || "";
    const cl = res.headers.get("content-length");
    const sizeBytes = cl ? parseInt(cl, 10) : undefined;
    return { sizeBytes, contentType: ct };
  } catch {
    return {};
  }
}

// -----------------------------------------------------------------------------
// REST API: SNIFF MEDIA FROM ANY SITE
// -----------------------------------------------------------------------------
app.post("/api/media/sniff", async (req, res) => {
  try {
    let { url } = req.body;
    if (!url || typeof url !== "string") {
      res.status(400).json({ error: "Missing or invalid URL" });
      return;
    }

    url = url.trim();
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = "https://" + url;
    }

    const targetUrl = new URL(url);

    // Fetch the target webpage
    const pageResponse = await fetch(targetUrl.href, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Referer: targetUrl.origin,
      },
      redirect: "follow",
    });

    const contentType = pageResponse.headers.get("content-type") || "";
    const finalUrl = pageResponse.url || targetUrl.href;

    // Check if the URL requested was directly a media file itself!
    const directClass = classifyMedia(finalUrl, contentType);
    if (directClass.type !== "document" || contentType.startsWith("video/") || contentType.startsWith("audio/")) {
      const cl = pageResponse.headers.get("content-length");
      const sizeBytes = cl ? parseInt(cl, 10) : undefined;
      const mediaItem: MediaItem = {
        id: `direct-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        url: finalUrl,
        title: getFilenameFromUrl(finalUrl, "Direct Media Stream"),
        type: directClass.type,
        format: directClass.format,
        sizeBytes,
        sizeFormatted: sizeBytes ? formatBytes(sizeBytes) : undefined,
        sourcePageUrl: finalUrl,
        isDownloadable: true,
        quality: "Original",
      };
      res.json({
        pageTitle: mediaItem.title,
        pageUrl: finalUrl,
        domain: targetUrl.hostname,
        mediaCount: 1,
        items: [mediaItem],
      });
      return;
    }

    const html = await pageResponse.text();
    const $ = cheerio.load(html);

    const pageTitle =
      $('meta[property="og:title"]').attr("content") ||
      $('meta[name="twitter:title"]').attr("content") ||
      $("title").text().trim() ||
      targetUrl.hostname;

    const items: MediaItem[] = [];
    const seenUrls = new Set<string>();

    const addItem = (
      rawUrl: string,
      title: string,
      typeHint?: MediaItem["type"],
      formatHint?: string,
      thumbnail?: string,
      quality?: string
    ) => {
      const resolved = normalizeUrl(rawUrl, finalUrl);
      if (!resolved || seenUrls.has(resolved)) return;

      // Filter out common trackers, favicons, tiny icons
      if (
        resolved.includes("google-analytics") ||
        resolved.includes("facebook.com/tr") ||
        resolved.includes("favicon") ||
        resolved.endsWith(".ico") ||
        resolved.includes("pixel")
      ) {
        return;
      }

      seenUrls.add(resolved);
      const classification = classifyMedia(resolved);
      const mediaType = typeHint || classification.type;
      const format = formatHint || classification.format;

      items.push({
        id: `m-${items.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
        url: resolved,
        title: title || getFilenameFromUrl(resolved, `${mediaType} asset`),
        type: mediaType,
        format,
        thumbnail: thumbnail ? normalizeUrl(thumbnail, finalUrl) || undefined : undefined,
        sourcePageUrl: finalUrl,
        quality: quality || (format === "m3u8" ? "Adaptive Stream" : "Source"),
        isDownloadable: true,
      });
    };

    // 1. OpenGraph & Twitter Video / Audio
    const ogVideo = $('meta[property="og:video"]').attr("content") || $('meta[property="og:video:url"]').attr("content") || $('meta[property="og:video:secure_url"]').attr("content");
    const ogThumb = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content");

    if (ogVideo) {
      addItem(ogVideo, `${pageTitle} (Video)`, "video", undefined, ogThumb, "High Quality");
    }

    const ogAudio = $('meta[property="og:audio"]').attr("content") || $('meta[property="og:audio:secure_url"]').attr("content");
    if (ogAudio) {
      addItem(ogAudio, `${pageTitle} (Audio)`, "audio", undefined, ogThumb, "Audio Master");
    }

    const twitterStream = $('meta[name="twitter:player:stream"]').attr("content");
    if (twitterStream) {
      addItem(twitterStream, `${pageTitle} (Twitter/X Stream)`, "video", undefined, ogThumb);
    }

    // 2. HTML5 <video> & <source> tags
    $("video").each((_, el) => {
      const $v = $(el);
      const poster = $v.attr("poster");
      const src = $v.attr("src");
      if (src) {
        addItem(src, `${pageTitle} (Video)`, "video", undefined, poster);
      }
      $v.find("source").each((_, s) => {
        const sSrc = $(s).attr("src");
        const sType = $(s).attr("type");
        if (sSrc) {
          const cls = classifyMedia(sSrc, sType);
          addItem(sSrc, `${pageTitle} (${cls.format.toUpperCase()})`, "video", cls.format, poster);
        }
      });
    });

    // 3. HTML5 <audio> & <source> tags
    $("audio").each((_, el) => {
      const $a = $(el);
      const src = $a.attr("src");
      if (src) {
        addItem(src, `${pageTitle} (Audio Track)`, "audio");
      }
      $a.find("source").each((_, s) => {
        const sSrc = $(s).attr("src");
        if (sSrc) {
          addItem(sSrc, `${pageTitle} (Audio)`, "audio");
        }
      });
    });

    // 4. Download links <a> pointing to video/audio/archives
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      const text = $(el).text().trim();
      const cls = classifyMedia(href);
      if (cls.type === "video" || cls.type === "audio" || cls.type === "stream") {
        addItem(href, text || getFilenameFromUrl(href, "Media File"), cls.type, cls.format);
      }
    });

    // 5. High-Res Images & Galleries (Filtered to meaningful sizes)
    $("img").each((_, el) => {
      const $img = $(el);
      let src = $img.attr("src") || $img.attr("data-src") || $img.attr("data-original") || $img.attr("data-highres");
      const srcset = $img.attr("srcset");
      const alt = $img.attr("alt")?.trim() || "";
      const width = parseInt($img.attr("width") || "0", 10);
      const height = parseInt($img.attr("height") || "0", 10);

      // If srcset exists, extract the highest resolution candidate
      if (srcset) {
        const candidates = srcset.split(",").map((s) => s.trim().split(/\s+/));
        if (candidates.length > 0) {
          const best = candidates[candidates.length - 1][0];
          if (best) src = best;
        }
      }

      if (src && !src.startsWith("data:image/svg+xml") && width >= 0 && height >= 0) {
        // Exclude tiny icons or avatars if size is declared and small
        if ((width > 0 && width < 120) || (height > 0 && height < 120)) {
          return;
        }
        const cls = classifyMedia(src);
        if (cls.type === "image") {
          addItem(src, alt || `${pageTitle} (Image ${items.length + 1})`, "image", cls.format, src);
        }
      }
    });

    // 6. Regex scan for HLS m3u8 playlists and MP4 URLs embedded in JS scripts or JSON blobs
    const scriptTexts = $("script")
      .map((_, el) => $(el).html() || "")
      .get()
      .join("\n");

    const m3u8Regex = /(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/gi;
    let match;
    while ((match = m3u8Regex.exec(scriptTexts)) !== null) {
      addItem(match[1], `${pageTitle} (HLS Stream)`, "stream", "m3u8", ogThumb, "Adaptive HLS");
    }

    const mp4Regex = /(https?:\/\/[^\s"'<>]+\.(?:mp4|webm)[^\s"'<>]*)/gi;
    while ((match = mp4Regex.exec(scriptTexts)) !== null) {
      const cls = classifyMedia(match[1]);
      addItem(match[1], `${pageTitle} (Embedded ${cls.format.toUpperCase()})`, "video", cls.format, ogThumb);
    }

    const audioRegex = /(https?:\/\/[^\s"'<>]+\.(?:mp3|m4a|wav|ogg)[^\s"'<>]*)/gi;
    while ((match = audioRegex.exec(scriptTexts)) !== null) {
      const cls = classifyMedia(match[1]);
      addItem(match[1], `${pageTitle} (Audio Stream)`, "audio", cls.format, ogThumb);
    }

    // 7. Parallel HEAD probes for top 12 items to get real file sizes
    const itemsToProbe = items.slice(0, 15);
    await Promise.all(
      itemsToProbe.map(async (item) => {
        const probe = await probeUrl(item.url, finalUrl);
        if (probe.sizeBytes) {
          item.sizeBytes = probe.sizeBytes;
          item.sizeFormatted = formatBytes(probe.sizeBytes);
        }
        if (probe.contentType) {
          const refined = classifyMedia(item.url, probe.contentType);
          item.format = refined.format;
        }
      })
    );

    res.json({
      pageTitle,
      pageUrl: finalUrl,
      domain: targetUrl.hostname,
      mediaCount: items.length,
      items,
    });
  } catch (error: any) {
    console.error("Media sniffing failed:", error);
    res.status(500).json({
      error: error.message || "Failed to scan website for media.",
    });
  }
});

// -----------------------------------------------------------------------------
// REST API: UNIVERSAL MEDIA DOWNLOAD STREAM PROXY
// -----------------------------------------------------------------------------
app.get("/api/media/download", async (req, res) => {
  try {
    const mediaUrl = req.query.url as string;
    let customFilename = req.query.filename as string;
    const forceType = req.query.type as string;

    if (!mediaUrl) {
      res.status(400).send("Missing target media URL");
      return;
    }

    const parsed = new URL(mediaUrl);

    // Fetch upstream media stream with genuine headers to bypass anti-hotlinking
    const upstream = await fetch(mediaUrl, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Referer: parsed.origin,
        Accept: "*/*",
      },
    });

    if (!upstream.ok) {
      res.status(upstream.status).send(`Upstream download failed: ${upstream.statusText}`);
      return;
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const contentLength = upstream.headers.get("content-length");

    if (!customFilename) {
      customFilename = getFilenameFromUrl(mediaUrl, "media_download");
    }

    // Ensure extension matches
    if (!customFilename.includes(".")) {
      const guessed = classifyMedia(mediaUrl, contentType);
      customFilename += `.${guessed.format}`;
    }

    // Sanitize filename for headers
    const safeFilename = encodeURIComponent(customFilename.replace(/[/\\?%*:|"<>]/g, "_"));

    res.setHeader("Content-Disposition", `attachment; filename="${customFilename}"; filename*=UTF-8''${safeFilename}`);
    res.setHeader("Content-Type", contentType);
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    res.setHeader("Access-Control-Allow-Origin", "*");

    // Stream response
    if (upstream.body) {
      // @ts-ignore Node 22 Web Stream to Express Response
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } else {
      const buffer = await upstream.arrayBuffer();
      res.end(Buffer.from(buffer));
    }
  } catch (error: any) {
    console.error("Download proxy error:", error);
    if (!res.headersSent) {
      res.status(500).send(`Download failed: ${error.message}`);
    }
  }
});

// -----------------------------------------------------------------------------
// REST API: HLS M3U8 STREAM STITCHER & DOWNLOADER
// -----------------------------------------------------------------------------
app.get("/api/media/hls-download", async (req, res) => {
  try {
    const playlistUrl = req.query.url as string;
    let filename = (req.query.filename as string) || "hls_video_stream.ts";

    if (!playlistUrl) {
      res.status(400).send("Missing m3u8 playlist URL");
      return;
    }

    const parsed = new URL(playlistUrl);
    const m3u8Res = await fetch(playlistUrl, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Referer: parsed.origin,
      },
    });

    if (!m3u8Res.ok) {
      res.status(502).send("Could not load m3u8 playlist");
      return;
    }

    const playlistText = await m3u8Res.text();
    const lines = playlistText.split("\n").map((l) => l.trim());

    // Check if master playlist
    let segmentUrls: string[] = [];
    const isMaster = playlistText.includes("#EXT-X-STREAM-INF");

    if (isMaster) {
      // Find the first or best sub-playlist
      for (const line of lines) {
        if (line && !line.startsWith("#")) {
          const subUrl = new URL(line, playlistUrl).href;
          const subRes = await fetch(subUrl, {
            headers: { "User-Agent": BROWSER_USER_AGENT, Referer: parsed.origin },
          });
          const subText = await subRes.text();
          const subLines = subText.split("\n").map((l) => l.trim());
          for (const sLine of subLines) {
            if (sLine && !sLine.startsWith("#")) {
              segmentUrls.push(new URL(sLine, subUrl).href);
            }
          }
          break;
        }
      }
    } else {
      for (const line of lines) {
        if (line && !line.startsWith("#")) {
          segmentUrls.push(new URL(line, playlistUrl).href);
        }
      }
    }

    if (segmentUrls.length === 0) {
      res.status(404).send("No TS video segments found in playlist");
      return;
    }

    // Set streaming headers for concatenated video
    if (!filename.endsWith(".ts") && !filename.endsWith(".mp4")) {
      filename += ".ts";
    }

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "video/mp2t");

    // Fetch segments sequentially and pipe directly into response
    for (let i = 0; i < segmentUrls.length; i++) {
      try {
        const segUrl = segmentUrls[i];
        const segRes = await fetch(segUrl, {
          headers: { "User-Agent": BROWSER_USER_AGENT, Referer: parsed.origin },
        });
        if (segRes.ok) {
          const buf = await segRes.arrayBuffer();
          res.write(Buffer.from(buf));
        }
      } catch (segErr) {
        console.warn(`Failed segment ${i}:`, segErr);
      }
    }

    res.end();
  } catch (error: any) {
    console.error("HLS download error:", error);
    if (!res.headersSent) {
      res.status(500).send(`HLS Stitcher error: ${error.message}`);
    }
  }
});

// -----------------------------------------------------------------------------
// REST API: BATCH ZIP DOWNLOADER (Download multiple media in 1 archive)
// -----------------------------------------------------------------------------
app.post("/api/media/batch-zip", async (req, res) => {
  try {
    const { items, zipName } = req.body as { items: Array<{ url: string; title: string }>; zipName?: string };
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "No items provided for zip archive" });
      return;
    }

    const zip = new JSZip();
    const limit = Math.min(items.length, 30); // reasonable batch cap

    await Promise.all(
      items.slice(0, limit).map(async (item, idx) => {
        try {
          const parsed = new URL(item.url);
          const response = await fetch(item.url, {
            headers: { "User-Agent": BROWSER_USER_AGENT, Referer: parsed.origin },
          });
          if (response.ok) {
            const buffer = await response.arrayBuffer();
            let fname = getFilenameFromUrl(item.url, `media_${idx + 1}`);
            if (item.title && !fname.includes(item.title)) {
              fname = `${idx + 1}_${item.title.replace(/[^a-zA-Z0-9_-]/g, "_")}_${fname}`;
            }
            zip.file(fname, Buffer.from(buffer));
          }
        } catch (e) {
          console.warn("Failed to fetch item for zip:", item.url, e);
        }
      })
    );

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    const finalZipName = zipName || `OmniMedia_Batch_${Date.now()}.zip`;

    res.setHeader("Content-Disposition", `attachment; filename="${finalZipName}"`);
    res.setHeader("Content-Type", "application/zip");
    res.send(zipBuffer);
  } catch (error: any) {
    console.error("Batch zip error:", error);
    res.status(500).json({ error: error.message || "Failed to generate ZIP archive" });
  }
});

// -----------------------------------------------------------------------------
// REST API: IN-BROWSER WEB PROXY (Strips CSP/Frame-Busting & Injects Sniffer)
// -----------------------------------------------------------------------------
app.get("/api/browser/view", async (req, res) => {
  try {
    let target = req.query.url as string;
    if (!target) {
      res.status(400).send("No URL specified");
      return;
    }

    target = target.trim();
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "https://" + target;
    }

    const targetUrl = new URL(target);
    const upstream = await fetch(targetUrl.href, {
      headers: {
        "User-Agent": BROWSER_USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        Referer: targetUrl.origin,
      },
      redirect: "follow",
    });

    const finalUrl = upstream.url || targetUrl.href;
    const finalParsed = new URL(finalUrl);
    const rawHtml = await upstream.text();
    const $ = cheerio.load(rawHtml);

    // Strip frame busters, CSP, and X-Frame-Options meta tags
    $('meta[http-equiv="Content-Security-Policy"]').remove();
    $('meta[http-equiv="X-Frame-Options"]').remove();

    // Set base URL so relative paths resolve cleanly
    if ($("base").length === 0) {
      $("head").prepend(`<base href="${finalParsed.origin}/">`);
    }

    // Rewrite internal links so clicking them navigates within the browser viewport
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href && !href.startsWith("#") && !href.startsWith("javascript:")) {
        const resolved = normalizeUrl(href, finalUrl);
        if (resolved && (resolved.startsWith("http://") || resolved.startsWith("https://"))) {
          $(el).attr("href", `/api/browser/view?url=${encodeURIComponent(resolved)}`);
          $(el).attr("target", "_self");
        }
      }
    });

    // Injected client-side bridge script to detect media dynamically & notify parent
    const snifferScript = `
      <script>
        (function() {
          const currentUrl = ${JSON.stringify(finalUrl)};
          function reportMedia() {
            try {
              const detected = [];
              const seen = new Set();
              
              // Scan videos
              document.querySelectorAll('video, video source').forEach(el => {
                const src = el.src || el.currentSrc || el.getAttribute('src');
                if (src && !seen.has(src)) {
                  seen.add(src);
                  detected.push({ url: src, type: 'video', title: document.title || 'Video Player' });
                }
              });

              // Scan audios
              document.querySelectorAll('audio, audio source').forEach(el => {
                const src = el.src || el.currentSrc || el.getAttribute('src');
                if (src && !seen.has(src)) {
                  seen.add(src);
                  detected.push({ url: src, type: 'audio', title: document.title || 'Audio Player' });
                }
              });

              if (detected.length > 0 && window.parent) {
                window.parent.postMessage({
                  type: 'OMNI_MEDIA_DETECTED',
                  pageUrl: currentUrl,
                  pageTitle: document.title,
                  items: detected
                }, '*');
              }
            } catch (err) {}
          }

          window.addEventListener('load', reportMedia);
          setTimeout(reportMedia, 1500);
          setTimeout(reportMedia, 3500);

          // Watch for DOM changes (lazy loaded videos/images)
          const observer = new MutationObserver(() => {
            reportMedia();
          });
          observer.observe(document.documentElement, { childList: true, subtree: true });
        })();
      </script>
    `;

    $("body").append(snifferScript);

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader("X-Frame-Options", "ALLOWALL");
    res.send($.html());
  } catch (error: any) {
    res.status(500).send(`Browser proxy error: ${error.message}`);
  }
});

// Serve frontend assets
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    // Vite dev mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Started in development mode with Vite hot-reloading middlewares.");
  } else {
    // Production static mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Started in production mode serving static assets from /dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on port http://localhost:${PORT}`);
  });
}

setupServer().catch((err) => {
  console.error("Failed to start full-stack server:", err);
});
