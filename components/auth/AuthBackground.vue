<script setup lang="ts">
const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  delay: Math.random() * 3,
  duration: 3 + Math.random() * 4
}))
</script>

<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    <!-- Animated gradient orbs -->
    <div class="absolute -left-1/4 -top-1/4 h-96 w-96 animate-pulse rounded-full bg-violet-600/20 blur-3xl" style="animation-duration: 8s" />
    <div class="absolute -right-1/4 top-1/3 h-80 w-80 animate-pulse rounded-full bg-purple-500/15 blur-3xl" style="animation-duration: 6s; animation-delay: 1s" />
    <div class="absolute -bottom-1/4 left-1/3 h-96 w-96 animate-pulse rounded-full bg-violet-500/10 blur-3xl" style="animation-duration: 10s; animation-delay: 2s" />

    <!-- Animated waves -->
    <svg
      class="absolute -top-1/4 left-0 h-1/2 w-full opacity-20"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="0 0 1440 400"
    >
      <path
        class="animate-wave-home-1"
        fill="url(#gradient-auth-top)"
        d="M0,200 C240,100 480,300 720,200 C960,100 1200,250 1440,150 L1440,0 L0,0 Z"
      />
      <defs>
        <linearGradient id="gradient-auth-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(139, 92, 246, 0.25)" />
          <stop offset="100%" stop-color="rgba(139, 92, 246, 0.05)" />
        </linearGradient>
      </defs>
    </svg>

    <svg
      class="absolute -bottom-1/4 left-0 h-1/2 w-full opacity-30"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="0 0 1440 400"
    >
      <path
        class="animate-wave-home-2"
        fill="url(#gradient-auth-bottom)"
        d="M0,150 C360,250 720,100 1080,200 C1260,250 1350,180 1440,200 L1440,400 L0,400 Z"
      />
      <defs>
        <linearGradient id="gradient-auth-bottom" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(139, 92, 246, 0.2)" />
          <stop offset="100%" stop-color="rgba(124, 58, 237, 0.1)" />
        </linearGradient>
      </defs>
    </svg>

    <!-- Floating particles -->
    <div class="absolute inset-0">
      <div
        v-for="particle in particles"
        :key="particle.id"
        class="absolute h-1 w-1 animate-pulse rounded-full bg-violet-400/30"
        :style="{
          left: `${particle.left}%`,
          top: `${particle.top}%`,
          animationDelay: `${particle.delay}s`,
          animationDuration: `${particle.duration}s`
        }"
      />
    </div>
  </div>
</template>
