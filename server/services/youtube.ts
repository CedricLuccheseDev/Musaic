import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import { Readable } from "stream";
import type { Results } from "~/shared/types/types";
import { logInfo, logSuccess, logError } from "~/utils/logger";

// Liste d'instances Invidious publiques (Décembre 2025)
// Source: https://api.invidious.io/instances.json
// Note: Mise à jour avec les instances actives ayant l'API activée
const INVIDIOUS_INSTANCES = [
  "https://inv.perditum.com",
  "https://iv.ggtyler.dev",
  "https://inv.nadeko.net",
  "https://vid.puffyan.us",
  "https://yewtu.be",
];


// Download using yt-dlp (most reliable method in 2025)
// yt-dlp handles all YouTube blocking, throttling, and format changes automatically
async function downloadWithYtDlp(youtubeUrl: string): Promise<Readable> {
  logInfo("Starting yt-dlp download...");

  // Try to find yt-dlp - in Docker it's in /usr/bin, locally in ~/.local/bin
  const ytdlpPath = process.env.DOCKER_ENV
    ? "yt-dlp"  // In Docker, yt-dlp is in PATH
    : (process.env.HOME ? `${process.env.HOME}/.local/bin/yt-dlp` : "yt-dlp");

  // Spawn yt-dlp process to download best audio and output to stdout
  const ytdlp = spawn(ytdlpPath, [
    "-f", "bestaudio",           // Download best audio quality
    "--no-playlist",             // Don't download playlists
    "--no-warnings",             // Suppress warnings
    "--quiet",                   // Minimal output
    "--no-check-certificate",    // Ignore SSL certificate errors
    "--extractor-args", "youtube:player_client=ios", // Use iOS client to bypass bot detection
    "-o", "-",                   // Output to stdout
    youtubeUrl,
  ], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, PATH: `${process.env.PATH}:${process.env.HOME}/.local/bin` }
  });

  // Log any errors from yt-dlp
  ytdlp.stderr?.on("data", (data) => {
    const message = data.toString().trim();
    if (message) {
      logInfo("yt-dlp stderr:", message);
    }
  });

  ytdlp.on("error", (error) => {
    logError("yt-dlp process error:", error);
  });

  ytdlp.on("exit", (code) => {
    logInfo(`yt-dlp process exited with code ${code}`);
  });

  logSuccess("yt-dlp: Audio stream started");

  // Important: Return the stdout stream immediately
  // The stream will be consumed by ffmpeg through the pipe
  const outputStream = ytdlp.stdout as Readable;

  // Log when yt-dlp stdout closes
  outputStream.on("end", () => {
    logInfo("yt-dlp stdout ended");
  });

  outputStream.on("close", () => {
    logInfo("yt-dlp stdout closed");
  });

  return outputStream;
}

export async function downloadYoutubeMp3(
  youtubeUrl: string,
): Promise<Readable> {
  logInfo(
    "services:youtube:downloadYoutubeMp3: Downloading MP3 from URL:",
    youtubeUrl,
  );

  // Use yt-dlp to download audio (bypasses all YouTube blocking)
  const audioStream = await downloadWithYtDlp(youtubeUrl);

  // Convert to MP3 using ffmpeg
  logInfo("services:youtube:downloadYoutubeMp3: Starting ffmpeg conversion...");

  const ffmpeg = spawn(
    ffmpegPath!,
    [
      "-loglevel", "warning",
      "-i", "pipe:0",
      "-vn",
      "-ar", "44100",        // Sample rate
      "-ac", "2",            // Stereo
      "-b:a", "320k",        // Bitrate
      "-c:a", "libmp3lame",  // Codec
      "-q:a", "0",           // Best quality
      "-f", "mp3",
      "pipe:1",
    ],
    { stdio: ["pipe", "pipe", "pipe"] }, // Capture stderr
  );

  // Log all ffmpeg output for debugging
  ffmpeg.stderr?.on("data", (data) => {
    const message = data.toString();
    logInfo("ffmpeg stderr:", message.trim());
  });

  ffmpeg.on("error", (error) => {
    logError("ffmpeg process error:", error);
  });

  ffmpeg.on("close", (code) => {
    logInfo(`ffmpeg process closed with code ${code}`);
    if (code === 0) {
      logSuccess(`ffmpeg process completed successfully`);
    } else {
      logError(`ffmpeg process failed with code ${code}`);
    }
  });

  ffmpeg.stdin?.on("error", (error) => {
    logError("ffmpeg stdin error:", error);
  });

  // Handle audio stream errors before piping
  audioStream.on("error", (error) => {
    logError("Audio stream error before ffmpeg:", error);
  });

  // Log yt-dlp data flow
  let ytdlpBytes = 0;
  audioStream.on("data", (chunk) => {
    ytdlpBytes += chunk.length;
    if (ytdlpBytes === chunk.length) {
      logSuccess(`yt-dlp: First data chunk received (${chunk.length} bytes)`);
    }
  });

  audioStream.on("end", () => {
    logInfo(`yt-dlp: Total bytes downloaded: ${ytdlpBytes}`);
  });

  // Pipe audio stream to ffmpeg
  audioStream.pipe(ffmpeg.stdin!);

  // Log when data flows
  let dataReceived = false;
  let totalBytes = 0;
  ffmpeg.stdout!.on("data", (chunk) => {
    totalBytes += chunk.length;
    if (!dataReceived) {
      logSuccess("ffmpeg: MP3 data flowing to client");
      dataReceived = true;
    }
  });

  ffmpeg.stdout!.on("end", () => {
    logInfo(`ffmpeg: Total MP3 bytes sent: ${totalBytes}`);
  });

  return ffmpeg.stdout!;
}

// Download via Invidious API
async function downloadViaInvidious(
  instance: string,
  videoId: string,
): Promise<Readable> {
  // Get video info from Invidious with timeout
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${instance}/api/v1/videos/${videoId}`, {
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`Invidious API error: ${response.status}`);
    }

    const data = await response.json() as {
      adaptiveFormats?: Array<{
        url: string;
        type: string;
        bitrate?: number;
        audioQuality?: string;
      }>;
    };

    if (!data.adaptiveFormats || data.adaptiveFormats.length === 0) {
      throw new Error("No formats found from Invidious");
    }

    // Find best audio format
    const audioFormats = data.adaptiveFormats.filter((f) =>
      f.type.startsWith("audio/")
    );

    if (audioFormats.length === 0) {
      throw new Error("No audio formats found");
    }

    // Sort by bitrate and get the best
    const bestAudio = audioFormats.sort(
      (a, b) => (b.bitrate || 0) - (a.bitrate || 0)
    )[0];

    logInfo(`Invidious: Found audio format with bitrate ${bestAudio.bitrate}kbps`);

    // Download the audio stream
    const audioResponse = await fetch(bestAudio.url);
    if (!audioResponse.ok || !audioResponse.body) {
      throw new Error(`Failed to download from Invidious: ${audioResponse.status}`);
    }

    return audioResponse.body as unknown as Readable;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

export async function getYoutubeMeta(
  youtubeUrl: string,
): Promise<{ title: string; filesize?: number }> {
  logInfo(
    "services:youtube:getYoutubeMeta: Fetching metadata for URL:",
    youtubeUrl,
  );

  return new Promise((resolve, reject) => {
    // Use yt-dlp to get video metadata (faster and more reliable than Invidious)
    const ytdlpPath = process.env.DOCKER_ENV
      ? "yt-dlp"  // In Docker, yt-dlp is in PATH
      : (process.env.HOME ? `${process.env.HOME}/.local/bin/yt-dlp` : "yt-dlp");

    const ytdlp = spawn(ytdlpPath, [
      "--print", "%(title)s",  // Print only the title
      "--no-playlist",
      "--no-warnings",
      "--extractor-args", "youtube:player_client=ios", // Use iOS client to bypass bot detection
      youtubeUrl,
    ], {
      env: { ...process.env, PATH: `${process.env.PATH}:${process.env.HOME}/.local/bin` }
    });

    let title = "";
    let error = "";

    ytdlp.stdout?.on("data", (data) => {
      title += data.toString();
    });

    ytdlp.stderr?.on("data", (data) => {
      error += data.toString();
    });

    ytdlp.on("close", (code) => {
      if (code === 0 && title.trim()) {
        const cleanTitle = title.trim().replace(/[<>:"/\\|?*]/g, "-"); // Remove invalid filename chars
        logSuccess(`yt-dlp: Got video title: ${cleanTitle}`);
        resolve({
          title: cleanTitle,
          filesize: undefined, // yt-dlp doesn't easily provide filesize without downloading
        });
      } else {
        logError(`yt-dlp metadata failed with code ${code}: ${error}`);
        reject(new Error(`Failed to fetch metadata: ${error || "Unknown error"}`));
      }
    });

    ytdlp.on("error", (err) => {
      logError("yt-dlp process error:", err);
      reject(err);
    });
  });
}

export async function searchYoutube(
  query: string,
  maxResults = 5,
): Promise<Results[]> {
  // Search using Invidious API (reliable and no API key needed)
  logInfo(`Searching for: ${query}`);

  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(
        `${instance}/api/v1/search?q=${encodeURIComponent(query)}&type=video`,
        { signal: controller.signal }
      );

      clearTimeout(timeout);
      if (!response.ok) continue;

      const data = await response.json() as Array<{
        videoId: string;
        title: string;
        author: string;
        lengthSeconds: number;
        videoThumbnails: Array<{ url: string }>;
      }>;

      logSuccess(`Invidious (${instance}): Found ${data.length} results`);

      return data.slice(0, maxResults).map((video) => ({
        id: { videoId: video.videoId },
        title: video.title,
        uploader: video.author,
        duration: video.lengthSeconds,
        thumbnail: video.videoThumbnails?.[0]?.url || "",
        link: `https://www.youtube.com/watch?v=${video.videoId}`,
      }));
    } catch (error) {
      logError(`Invidious (${instance}) search failed:`, error);
    }
  }

  throw new Error("Failed to search on all Invidious instances. Please try again later.");
}
