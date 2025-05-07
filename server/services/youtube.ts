import type { ChildProcessWithoutNullStreams } from "child_process";
import { spawn } from "child_process";
import ffmpegPath from "ffmpeg-static";
import type { Readable } from "stream";
import youtubedl from "youtube-dl-exec";
import ytdl from "ytdl-core";
import type { Results } from "~/shared/types/types";

export function downloadYoutubeMp3(youtubeUrl: string): Readable {
  const ytStream = ytdl(youtubeUrl, { filter: "audioonly" });

  const ffmpeg = spawn(
    ffmpegPath!,
    [
      "-i",
      "pipe:0",
      "-vn",
      "-c:a",
      "libmp3lame",
      "-b:a",
      "320k",
      "-f",
      "mp3",
      "-",
    ],
    { stdio: ["pipe", "pipe", "inherit"] },
  );

  ytStream.pipe(ffmpeg.stdin!);
  return ffmpeg.stdout!;
}

export async function getYoutubeMeta(
  youtubeUrl: string,
): Promise<{ title: string; filesize?: number }> {
  const proc = youtubedl.exec(
    youtubeUrl,
    {
      dumpSingleJson: true,
      noWarnings: true,
      noCheckCertificates: true,
      cookies: "/cookies.txt",
    },
    { stdio: ["ignore", "pipe", "inherit"] },
  ) as unknown as ChildProcessWithoutNullStreams;

  let json = "";
  for await (const chunk of proc.stdout!) {
    json += chunk.toString();
  }
  // wait for the process to exit
  await new Promise<void>((res, rej) => {
    proc.on("close", res);
    proc.on("error", rej);
  });

  const meta = JSON.parse(json);
  return {
    title: meta.title as string,
    filesize:
      parseInt(meta.filesize || meta.filesize_approx || "0", 10) || undefined,
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
