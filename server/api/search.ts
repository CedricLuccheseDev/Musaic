import { defineEventHandler } from "h3";
import type { Results } from "~/shared/types/types";
import { searchYoutube } from "../services/youtube";

export default defineEventHandler(async (event) => {
  const { entry } = getQuery(event) as { entry?: string };
  if (!entry) {
    event.node.res.statusCode = 400;
    return { error: "Missing url param" };
  }

  console.log("/api/search: Searching for", entry);
  const results: Results[] = await searchYoutube(entry, 5);
  return results;
});
