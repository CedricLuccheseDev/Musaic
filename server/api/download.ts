// server/api/download.ts
import { defineEventHandler, getQuery } from "h3";
import type { Readable } from "stream";
import { logInfo, logError } from "~/utils/logger";
import { downloadYoutubeMp3, getYoutubeMeta } from "../services/youtube";

export default defineEventHandler(async (event) => {
  const { url, metaOnly } = getQuery(event) as {
    url?: string;
    metaOnly?: string;
  };
  if (!url) {
    event.node.res.statusCode = 400;
    return event.node.res.end("Missing url parameter");
  }

  logInfo("server/api/download.ts: Get youtube mp3...");
  const { title, filesize } = await getYoutubeMeta(url);
  if (metaOnly === "true") {
    return { title, filesize };
  }

  const res = event.node.res;
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Disposition", `attachment; filename="${title}.mp3"`);
  res.setHeader("X-Track-Title", encodeURIComponent(title));

  // Pipe the MP3 stream directly to the HTTP response
  logInfo("server/api/download.ts: Downloading MP3 from URL:", url, "...");

  return new Promise<void>(async (resolve, reject) => {
    try {
      const mp3Stream: Readable = await downloadYoutubeMp3(url);

      // Handle stream errors
      mp3Stream.on("error", (error) => {
        logError("server/api/download.ts: Stream error:", error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end("Download failed");
        }
        reject(error);
      });

      // Pipe to response
      mp3Stream.pipe(res);

      // Wait for stream to finish
      mp3Stream.on("end", () => {
        logInfo("server/api/download.ts: Stream ended successfully");
        resolve();
      });

      // Handle response close (client disconnected)
      res.on("close", () => {
        logInfo("server/api/download.ts: Client disconnected");
        mp3Stream.destroy();
        resolve();
      });

    } catch (error) {
      logError("server/api/download.ts: Failed to start download:", error);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Download failed");
      }
      reject(error);
    }
  });
});
