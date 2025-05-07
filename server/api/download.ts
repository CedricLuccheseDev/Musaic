// server/api/download.ts
import { defineEventHandler, getQuery } from "h3";
import type { Readable } from "stream";
import { downloadYoutubeMp3, getYoutubeMeta } from "../services/youtube";

export default defineEventHandler(async (event) => {
  const { url } = getQuery(event) as { url?: string };
  if (!url) {
    event.node.res.statusCode = 400;
    return event.node.res.end("Missing url parameter");
  }

  const { title, filesize } = await getYoutubeMeta(url);

  const res = event.node.res;
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Content-Disposition", `attachment; filename="${title}.mp3"`);
  res.setHeader("X-Track-Title", encodeURIComponent(title));
  if (filesize) res.setHeader("Content-Length", filesize);

  // Pipe the MP3 stream directly to the HTTP response
  const mp3Stream: Readable = downloadYoutubeMp3(url);
  mp3Stream.pipe(res);

  // Keep the connection open until the stream ends
  await new Promise<void>((resolve, reject) => {
    mp3Stream.on("end", resolve);
    mp3Stream.on("error", reject);
  });
});
