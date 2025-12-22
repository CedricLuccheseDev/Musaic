<script setup lang="ts">
import { howItWorksSections } from '~/config/howItWorks'

/* --- Meta --- */
definePageMeta({
  layoutConfig: {
    showBackButton: true,
    backButtonLink: '/'
  }
})

/* --- States --- */
const { t } = useI18n()
</script>

<template>
  <!-- Content -->
  <main class="mx-auto max-w-3xl px-4 pb-16 md:px-8">
    <!-- Title -->
    <div class="mb-12 text-center">
      <h1 class="mb-3 text-3xl font-bold text-white md:text-4xl">{{ t.hiwTitle }}</h1>
      <p class="text-neutral-400">{{ t.hiwSubtitle }}</p>
    </div>

    <!-- Sections -->
    <div class="space-y-8">
      <section
        v-for="section in howItWorksSections"
        :key="section.titleKey"
        class="rounded-2xl border border-neutral-800/50 bg-neutral-900/50 p-6 backdrop-blur-sm"
      >
        <div class="mb-4 flex items-center gap-3">
          <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20">
            <UIcon :name="section.icon" class="h-5 w-5 text-violet-400" />
          </div>
          <h2 class="text-lg font-semibold text-white">
            {{ t[section.titleKey as keyof typeof t] }}
          </h2>
        </div>

        <p class="mb-4 text-neutral-300">
          {{ t[section.contentKey as keyof typeof t] }}
        </p>

        <ul v-if="section.items" class="space-y-2">
          <li
            v-for="item in section.items"
            :key="item.textKey"
            class="flex items-center gap-3 text-sm text-neutral-400"
          >
            <UIcon :name="item.icon" class="h-4 w-4 shrink-0 text-violet-400" />
            <span>{{ t[item.textKey as keyof typeof t] }}</span>
          </li>
        </ul>
      </section>
    </div>

    <!-- CTA -->
    <div class="mt-12 text-center">
      <NuxtLink
        to="/"
        class="inline-flex items-center gap-2 rounded-full bg-violet-600 px-6 py-3 font-semibold text-white transition-all hover:bg-violet-500"
      >
        <UIcon name="i-heroicons-magnifying-glass" class="h-5 w-5" />
        {{ t.search }}
      </NuxtLink>
    </div>
  </main>
</template>
