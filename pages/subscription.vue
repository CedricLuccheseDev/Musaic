<script setup lang="ts">
import { plans, comparisonFeatures, formatPrice } from '~/config/subscription'

/* --- States --- */
const { t, lang } = useI18n()
const { user, loading } = useAuth()
const { isPremium } = useSubscription()
const router = useRouter()

/* --- Computed --- */
const currentPlan = computed(() => isPremium.value ? 'premium' : 'free')
const freePrice = computed(() => formatPrice(plans.free.priceMonthly, plans.free.currency, lang.value))
const premiumPrice = computed(() => formatPrice(plans.premium.priceMonthly, plans.premium.currency, lang.value))

/* --- Watchers --- */
watch(user, (u) => {
  if (!loading.value && !u) router.push('/login')
}, { immediate: true })
</script>

<template>
  <div class="relative flex min-h-screen flex-col bg-neutral-950 lg:p-8">
    <!-- Background -->
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -left-20 top-1/4 h-64 w-64 animate-float rounded-full bg-violet-600/10 blur-3xl" />
      <div class="absolute -right-20 bottom-1/4 h-80 w-80 animate-float-delayed rounded-full bg-amber-500/5 blur-3xl" />
      <div class="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/5 blur-3xl" />
    </div>

    <!-- Header -->
    <PageHeader class="relative z-10">
      <template #back>
        <button
          type="button"
          class="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-neutral-700 text-neutral-400 transition-all hover:border-violet-500 hover:text-white"
          @click="router.back()"
        >
          <UIcon name="i-heroicons-arrow-left" class="h-4 w-4" />
        </button>
      </template>
    </PageHeader>

    <!-- Main -->
    <main class="relative z-10 flex flex-1 flex-col items-center px-4 py-8 md:py-12">
      <div v-if="loading" class="flex flex-1 items-center justify-center">
        <UIcon name="i-heroicons-arrow-path" class="h-8 w-8 animate-spin text-violet-500" />
      </div>

      <div v-else-if="user" class="w-full max-w-4xl">
        <!-- Title -->
        <div class="mb-10 text-center">
          <h1 class="mb-2 text-3xl font-bold text-white">{{ t.subscriptionTitle }}</h1>
          <p class="text-neutral-400">{{ t.subscriptionSubtitle }}</p>
        </div>

        <!-- Pricing Cards -->
        <div class="mb-12 grid gap-6 md:grid-cols-2">
          <!-- Free Plan -->
          <div
            class="relative flex flex-col overflow-hidden rounded-2xl border border-neutral-800/50 bg-neutral-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-neutral-700/50"
            :class="currentPlan === 'free' ? 'ring-2 ring-violet-500/50' : ''"
          >
            <div class="mb-6">
              <h3 class="mb-1 text-xl font-semibold text-white">{{ t.planFree }}</h3>
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-bold text-white">{{ freePrice }}</span>
                <span class="text-neutral-500">{{ t.planForever }}</span>
              </div>
            </div>

            <ul class="mb-6 space-y-3">
              <li class="flex items-center gap-3 text-sm text-neutral-300">
                <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-green-500" />
                <span>{{ t.featureSearch }}</span>
              </li>
              <li class="flex items-center gap-3 text-sm text-neutral-300">
                <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-green-500" />
                <span>{{ t.featureFreeDl }}</span>
              </li>
              <li class="flex items-center gap-3 text-sm text-neutral-500">
                <UIcon name="i-heroicons-x-circle" class="h-5 w-5 shrink-0 text-neutral-600" />
                <span>{{ t.featureAiLimited }}</span>
              </li>
              <li class="flex items-center gap-3 text-sm text-neutral-500">
                <UIcon name="i-heroicons-x-circle" class="h-5 w-5 shrink-0 text-neutral-600" />
                <span>{{ t.featureWithAds }}</span>
              </li>
            </ul>

            <button
              v-if="currentPlan === 'free'"
              type="button"
              disabled
              class="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-neutral-700 bg-neutral-800/50 px-4 py-3 text-sm font-medium text-neutral-400"
            >
              <UIcon name="i-heroicons-check" class="h-4 w-4" />
              <span>{{ t.currentPlan }}</span>
            </button>
          </div>

          <!-- Premium Plan -->
          <div
            class="relative flex flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-linear-to-br from-amber-950/20 to-neutral-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/50"
            :class="currentPlan === 'premium' ? 'ring-2 ring-amber-500/50' : ''"
          >
            <!-- Premium Badge -->
            <div class="absolute -right-12 top-6 rotate-45 bg-linear-to-r from-amber-500 to-amber-600 px-12 py-1 text-xs font-semibold text-black shadow-lg">
              PREMIUM
            </div>

            <div class="mb-6">
              <h3 class="mb-1 flex items-center gap-2 text-xl font-semibold text-white">
                {{ t.planPremium }}
                <UIcon name="i-heroicons-sparkles" class="h-5 w-5 text-amber-400" />
              </h3>
              <div class="flex items-baseline gap-1">
                <span class="bg-linear-to-r from-amber-400 to-amber-600 bg-clip-text text-4xl font-bold text-transparent">{{ premiumPrice }}</span>
                <span class="text-neutral-500">{{ t.planPerMonth }}</span>
              </div>
            </div>

            <ul class="mb-6 space-y-3">
              <li v-for="featureKey in plans.premium.features" :key="featureKey" class="flex items-center gap-3 text-sm text-neutral-300">
                <UIcon name="i-heroicons-check-circle" class="h-5 w-5 shrink-0 text-amber-500" />
                <span>{{ t[featureKey as keyof typeof t] }}</span>
              </li>
            </ul>

            <button
              v-if="currentPlan === 'free'"
              type="button"
              class="mt-auto flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-linear-to-r from-amber-500 to-amber-600 px-4 py-3 text-sm font-semibold text-black shadow-lg shadow-amber-500/20 transition-all duration-200 hover:from-amber-400 hover:to-amber-500 hover:shadow-amber-500/30"
            >
              <UIcon name="i-heroicons-sparkles" class="h-4 w-4" />
              <span>{{ t.upgradePlan }}</span>
            </button>
            <button
              v-else
              type="button"
              disabled
              class="mt-auto flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-400"
            >
              <UIcon name="i-heroicons-check" class="h-4 w-4" />
              <span>{{ t.currentPlan }}</span>
            </button>
          </div>
        </div>

        <!-- Comparison Table -->
        <div class="rounded-2xl border border-neutral-800/50 bg-neutral-900/30 p-6 backdrop-blur-sm">
          <h2 class="mb-6 text-center text-xl font-semibold text-white">{{ t.compareTitle }}</h2>

          <div class="overflow-x-auto">
            <table class="w-full">
              <thead>
                <tr class="border-b border-neutral-800">
                  <th class="pb-4 text-left text-sm font-medium text-neutral-400" />
                  <th class="pb-4 text-center text-sm font-medium text-neutral-300">{{ t.planFree }}</th>
                  <th class="pb-4 text-center">
                    <span class="inline-flex items-center gap-1 text-sm font-medium text-amber-400">
                      {{ t.planPremium }}
                      <UIcon name="i-heroicons-sparkles" class="h-4 w-4" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(feature, index) in comparisonFeatures"
                  :key="feature.key"
                  class="border-b border-neutral-800/50 transition-colors hover:bg-neutral-800/20"
                  :class="index === comparisonFeatures.length - 1 ? 'border-b-0' : ''"
                >
                  <td class="py-4 text-sm text-neutral-300">{{ t[feature.key as keyof typeof t] }}</td>
                  <td class="py-4 text-center">
                    <div v-if="feature.free" class="flex justify-center">
                      <UIcon name="i-heroicons-check-circle" class="h-5 w-5 text-green-500" />
                    </div>
                    <div v-else-if="feature.freeText" class="text-xs text-neutral-500">
                      {{ t[feature.freeText as keyof typeof t] }}
                    </div>
                    <div v-else class="flex justify-center">
                      <UIcon name="i-heroicons-x-circle" class="h-5 w-5 text-neutral-600" />
                    </div>
                  </td>
                  <td class="py-4 text-center">
                    <div class="flex justify-center">
                      <UIcon name="i-heroicons-check-circle" class="h-5 w-5 text-amber-500" />
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
