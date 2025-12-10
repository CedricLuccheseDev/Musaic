<template>
  <div class="pointer-events-none absolute inset-0 overflow-hidden">
    <!-- Top wave -->
    <svg
      class="absolute -top-1/4 left-0 h-1/2 w-full opacity-30"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="0 0 1440 400"
    >
      <path
        class="animate-wave-home-1"
        fill="url(#gradient-top)"
        d="M0,200 C240,100 480,300 720,200 C960,100 1200,250 1440,150 L1440,0 L0,0 Z"
      />
      <defs>
        <linearGradient id="gradient-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="rgba(139, 92, 246, 0.15)" />
          <stop offset="100%" stop-color="rgba(139, 92, 246, 0.05)" />
        </linearGradient>
      </defs>
    </svg>

    <!-- Bottom wave -->
    <svg
      class="absolute -bottom-1/4 left-0 h-1/2 w-full opacity-40"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
      viewBox="0 0 1440 400"
    >
      <path
        class="animate-wave-home-2"
        fill="url(#gradient-bottom-1)"
        d="M0,150 C360,250 720,100 1080,200 C1260,250 1350,180 1440,200 L1440,400 L0,400 Z"
      />
      <path
        class="animate-wave-home-3"
        fill="url(#gradient-bottom-2)"
        d="M0,200 C240,150 480,280 720,180 C960,80 1200,220 1440,160 L1440,400 L0,400 Z"
      />
      <defs>
        <linearGradient id="gradient-bottom-1" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="rgba(139, 92, 246, 0.12)" />
          <stop offset="100%" stop-color="rgba(124, 58, 237, 0.06)" />
        </linearGradient>
        <linearGradient id="gradient-bottom-2" x1="100%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stop-color="rgba(167, 139, 250, 0.08)" />
          <stop offset="100%" stop-color="rgba(139, 92, 246, 0.03)" />
        </linearGradient>
      </defs>
    </svg>

    <!-- Center glow -->
    <div class="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/5 blur-3xl" />
  </div>
</template>
