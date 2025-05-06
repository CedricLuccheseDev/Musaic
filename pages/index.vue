<script setup lang="ts">
import { UButton } from "#components";
import { ref } from "vue";
import type { Results } from "~/shared/types/types";

type Status = "idle" | "pending" | "success" | "error";

interface ResultWithStatus extends Results {
  status: Status;
}

const entry = ref("");
const status = ref<Status>("idle");
const isValidEntry = (entry: string) => {
  const pattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.?be)\/.+$/;
  return pattern.test(entry);
};
const entries = ref<ResultWithStatus[]>([]);

watch(entry, (newEntry) => {
  if (newEntry) {
    status.value = "idle";
  }
});

async function search(entry: string) {
  // Check if the entry is valid
  if (!entry) {
    status.value = "error";
    return;
  }

  // Set state to pending
  status.value = "pending";

  try {
    const resp = await fetch(`/api/search?entry=${encodeURIComponent(entry)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const contentType = resp.headers.get("Content-Type") || "";

    // Check if it's a research
    if (!contentType.includes("application/json")) return;

    const results = await resp.json();
    entries.value = results;
    if (entries.value.length === 0) {
      status.value = "error";
      return;
    }
    status.value = "success";
  } catch (err) {
    console.error("Searching failed", err);
    status.value = "error";
  }
}

async function download(entry: string) {
  // Check if the URL is valid
  if (!entry) {
    status.value = "error";
    return;
  }

  // Set state to pending
  status.value = "pending";

  try {
    const resp = await fetch(`/api/download?url=${encodeURIComponent(entry)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const contentType = resp.headers.get("Content-Type") || "";

    // Check if it's not a research
    if (contentType.includes("application/json")) return;

    const rawTitle = resp.headers.get("X-Track-Title") || "track";
    const title = decodeURIComponent(rawTitle);
    const blob = await resp.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${title}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(downloadUrl);
    status.value = "success";
  } catch (err) {
    console.error("Download failed", err);
    status.value = "error";
  }
}

async function downloadEntry(idx: number) {
  const item = entries.value[idx];
  if (!item.link) return;

  // Set state to pending
  item.status = "pending";

  try {
    const resp = await fetch(
      `/api/download?url=${encodeURIComponent(item.link)}`,
    );
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const contentType = resp.headers.get("Content-Type") || "";

    // Check if it's not a research
    if (contentType.includes("application/json")) return;

    const rawTitle = resp.headers.get("X-Track-Title") || "track";
    const title = decodeURIComponent(rawTitle);
    const blob = await resp.blob();
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `${title}.mp3`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(downloadUrl);
    item.status = "success";
  } catch (err) {
    console.error("Download failed", err);
    item.status = "error";
  }
}
</script>

<template>
  <div class="flex min-h-screen min-w-screen items-center justify-center">
    <div
      class="flex min-h-screen w-full max-w-[1280px] flex-col items-center justify-center gap-8 p-16"
    >
      <div class="flex h-full w-full flex-row gap-4">
        <UInput
          v-model="entry"
          class="pointer-events-auto w-full"
          placeholder="Paste your YouTube link here and press Enter"
          size="xl"
          variant="subtle"
          color="info"
          @keyup.enter="isValidEntry(entry) ? download(entry) : search(entry)"
        />
        <UButton
          class="cursor-pointer"
          size="xl"
          :color="
            status === 'idle'
              ? 'info'
              : status === 'pending'
                ? 'secondary'
                : status === 'error'
                  ? 'error'
                  : 'success'
          "
          :disabled="status === 'pending'"
          :loading="status === 'pending'"
          @click="isValidEntry(entry) ? download(entry) : search(entry)"
        >
          {{
            isValidEntry(entry)
              ? status === "idle"
                ? "Download"
                : status === "pending"
                  ? "Downloading"
                  : status === "success"
                    ? "Downloaded"
                    : "Error"
              : status === "idle"
                ? "Search"
                : status === "pending"
                  ? "Searching"
                  : status === "success"
                    ? "Searched"
                    : "Error"
          }}
        </UButton>
      </div>
      <div class="flex w-full flex-col gap-4">
        <div
          v-for="(result, index) in entries"
          :key="index"
          class="flex w-full flex-row items-center gap-4"
        >
          <img
            v-if="result.thumbnail"
            :src="result.thumbnail"
            alt="thumbnail"
            class="h-16 w-16 rounded-lg object-cover"
          />
          <span class="w-full">
            {{ result.title }}
          </span>
          <span class="w-full">
            {{ result.bitrate }}
          </span>
          <UButton
            v-if="result.link"
            class="cursor-pointer"
            size="sm"
            :color="
              result.status === 'idle'
                ? 'info'
                : result.status === 'pending'
                  ? 'secondary'
                  : result.status === 'error'
                    ? 'error'
                    : 'success'
            "
            :disabled="result.status === 'pending'"
            :loading="result.status === 'pending'"
            @click="downloadEntry(index)"
          >
            Download
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>
