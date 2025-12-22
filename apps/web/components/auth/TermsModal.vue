<script setup lang="ts">
/* --- States --- */
const { t } = useI18n()
const open = defineModel<boolean>({ default: false })
</script>

<template>
  <UModal v-model:open="open">
    <template #content>
      <div class="max-h-[80vh] overflow-y-auto rounded-2xl border border-neutral-800/50 bg-neutral-900 p-6">
        <!-- Header -->
        <div class="mb-6 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/20">
              <UIcon name="i-heroicons-document-text" class="h-5 w-5 text-violet-400" />
            </div>
            <h2 class="text-xl font-bold text-white">{{ t.termsTitle }}</h2>
          </div>
          <button
            type="button"
            class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
            @click="open = false"
          >
            <UIcon name="i-heroicons-x-mark" class="h-5 w-5" />
          </button>
        </div>

        <!-- Intro -->
        <p class="mb-6 text-sm text-neutral-400">{{ t.termsIntro }}</p>

        <!-- Sections -->
        <div class="space-y-5">
          <div>
            <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-xs text-violet-400">1</span>
              {{ t.termsSection1Title }}
            </h3>
            <p class="pl-7 text-sm text-neutral-400">{{ t.termsSection1Content }}</p>
          </div>

          <div>
            <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-400">2</span>
              {{ t.termsSection2Title }}
            </h3>
            <p class="pl-7 text-sm text-neutral-400">{{ t.termsSection2Content }}</p>
          </div>

          <div>
            <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-pink-500/20 text-xs text-pink-400">3</span>
              {{ t.termsSection3Title }}
            </h3>
            <p class="pl-7 text-sm text-neutral-400">{{ t.termsSection3Content }}</p>
          </div>

          <div>
            <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-violet-500/20 text-xs text-violet-400">4</span>
              {{ t.termsSection4Title }}
            </h3>
            <p class="pl-7 text-sm text-neutral-400">{{ t.termsSection4Content }}</p>
          </div>

          <div>
            <h3 class="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-purple-500/20 text-xs text-purple-400">5</span>
              {{ t.termsSection5Title }}
            </h3>
            <p class="pl-7 text-sm text-neutral-400">{{ t.termsSection5Content }}</p>
          </div>
        </div>

        <!-- Close button -->
        <div class="mt-8 flex justify-end">
          <button
            type="button"
            class="cursor-pointer rounded-xl bg-violet-600 px-6 py-2.5 font-medium text-white transition-all duration-200 hover:bg-violet-500"
            @click="open = false"
          >
            {{ t.termsClose }}
          </button>
        </div>
      </div>
    </template>
  </UModal>
</template>
