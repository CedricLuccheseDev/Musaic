import { defineEventHandler } from "h3";
import { downloadYoutube, getYoutubeMeta } from "../services/youtube";

export default defineEventHandler(async (event) => {
  const { url } = getQuery(event) as { url?: string };
  if (!url) {
    event.node.res.statusCode = 400;
    return { error: "Missing url param" };
  }

  console.log("[/api/download: Downloading", url);

  const { title } = await getYoutubeMeta(url);

  const proc = downloadYoutube(url);

  const res = event.node.res;
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("X-Track-Title", encodeURIComponent(title));

  proc.stdout!.pipe(res, { end: true });

  await new Promise<void>((resolve, reject) => {
    proc.stdout!.on("end", resolve);
    proc.stdout!.on("error", reject);
    proc.on("error", reject);
  });
});
