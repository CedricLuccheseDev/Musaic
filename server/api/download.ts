// server/api/download.ts
import { defineEventHandler, getQuery } from "h3";
import type { Readable } from "stream";
import { logInfo } from "~/utils/logger";
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
  const mp3Stream: Readable = downloadYoutubeMp3(url);
  mp3Stream.pipe(res);

  // Keep the connection open until the stream ends
  await new Promise<void>((resolve, reject) => {
    mp3Stream.on("end", () => {
      res.end();
      resolve();
    });
    mp3Stream.on("error", reject);
  });
});
