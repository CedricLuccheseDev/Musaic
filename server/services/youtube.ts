import type { ChildProcessWithoutNullStreams } from "child_process";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import type { Readable } from "stream";
import youtubedl from "youtube-dl-exec";
import type { VideoFormat } from "ytdl-core";
import ytdl from "ytdl-core";
import type { Results } from "~/shared/types/types";
import { logInfo, logSuccess } from "~/utils/logger";

export function downloadYoutubeMp3(youtubeUrl: string): Readable {
  logInfo(
    "services/youtube:downloadYoutubeMp3: Downloading MP3 from URL:",
    youtubeUrl,
  );
  const ytStream = ytdl(youtubeUrl, {
    filter: "audioonly",
    quality: "highestaudio",
    highWaterMark: 1 << 25,
  });

  const ffmpeg = spawn(
    ffmpegPath!,
    [
      "-fflags",
      "+genpts",
      "-i",
      "pipe:0",
      "-vn",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "320k",
      "-f",
      "mp3",
      "pipe:1",
    ],
    { stdio: ["pipe", "pipe", "inherit"] },
  );

  logInfo(
    "services/youtube:downloadYoutubeMp3: Spawning ffmpeg process with path:",
    ffmpegPath,
  );

  ytStream.pipe(ffmpeg.stdin!);
  return ffmpeg.stdout!;
}

export async function getYoutubeMeta(
  youtubeUrl: string,
): Promise<{ title: string; filesize?: number }> {
  logInfo(
    "services/youtube:getYoutubeMeta: Fetching metadata for URL:",
    youtubeUrl,
  );
  const info = await ytdl.getInfo(youtubeUrl);

  const audioFormats = ytdl.filterFormats(
    info.formats,
    "audioonly",
  ) as VideoFormat[];
  const chosen = audioFormats.find((f) => f.contentLength) || audioFormats[0];
  const filesize = chosen.contentLength
    ? parseInt(chosen.contentLength, 10)
    : undefined;

  logSuccess(
    "services/youtube:getYoutubeMeta: Metadata fetched successfully:",
    info.videoDetails.title,
    " - ",
    filesize,
  );

  return {
    title: info.videoDetails.title as string,
    filesize: filesize,
  };
}

export async function searchYoutube(
  query: string,
  maxResults = 5,
): Promise<Results[]> {
  const searchString = `ytsearch${maxResults}:${query}`;

  const proc = youtubedl.exec(
    searchString,
    {
      dumpSingleJson: true,
      noPlaylist: true,
      skipDownload: true,
      // flatPlaylist: true, //Optimisation
      noWarnings: true,
      noCheckCertificates: true,
    },
    { stdio: ["ignore", "pipe", "inherit"] },
  ) as unknown as ChildProcessWithoutNullStreams;

  let json = "";
  for await (const chunk of proc.stdout!) {
    json += chunk.toString();
  }
  await new Promise<void>((res, rej) => {
    proc.on("close", res);
    proc.on("error", rej);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meta = JSON.parse(json) as { entries: any[] };
  return meta.entries.map((entry) => ({
    id: { videoId: entry.id },
    title: entry.title,
    uploader: entry.uploader,
    duration: Number(entry.duration),
    thumbnail: entry.thumbnail,
    link: entry.webpage_url,
  }));
}
