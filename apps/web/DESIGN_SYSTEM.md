# Design System

Design system moderne dark-mode pour applications Nuxt/Vue.

## Stack Technique

```
Nuxt UI v3       # Composants UI
Tailwind CSS    # Utilitaires CSS
@nuxt/icon      # Icônes (Heroicons, Simple Icons)
@nuxt/fonts     # Gestion des polices
@vueuse/motion  # Animations
```

## Palette de Couleurs

### Couleurs Principales

| Rôle | Couleur | Usage |
|------|---------|-------|
| Primary | `violet` | Actions principales, focus, liens |
| Secondary | `orange` | Actions secondaires, accents |
| Success | `emerald` | États de succès, validations |
| Warning | `amber` | Alertes, statuts premium |
| Info | `cyan` | Informations, highlights |
| Neutral | `zinc` | Textes, fonds, bordures |

### Configuration Nuxt UI

```ts
// app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'violet',
      secondary: 'orange',
      neutral: 'zinc'
    }
  }
})
```

### Échelle d'Opacité

```css
/* Fonds */
bg-neutral-950          /* Base page */
bg-neutral-900          /* Cards */
bg-neutral-800          /* Surfaces élevées */
bg-neutral-800/50       /* Overlay léger */
bg-black/50             /* Modal backdrop */

/* Bordures */
border-neutral-700      /* Standard */
border-neutral-700/50   /* Subtile */
border-violet-500/50    /* Focus */

/* Textes */
text-white              /* Principal */
text-neutral-400        /* Secondaire */
text-neutral-500        /* Désactivé */
text-violet-400         /* Accent/hover */
```

## Typographie

### Police Logo

```css
/* assets/css/main.css */
.font-logo {
  font-family: "Orbitron", sans-serif;
  font-weight: 700;
}
```

### Échelle de Tailles

| Classe | Usage |
|--------|-------|
| `text-xs` | Labels, badges |
| `text-sm` | Texte secondaire, boutons |
| `text-base` | Texte courant |
| `text-lg` | Sous-titres |
| `text-xl` | Titres de section |
| `text-4xl` | Titres de page |
| `text-6xl` | Hero headings |

### Poids

- `font-normal` - Corps de texte
- `font-medium` - Labels, boutons
- `font-semibold` - Titres de cards
- `font-bold` - Navigation, headings

## Composants

### Boutons

```vue
<!-- Primary -->
<UButton color="primary">Action</UButton>

<!-- Secondary -->
<UButton variant="outline" color="neutral">Annuler</UButton>

<!-- Success -->
<UButton color="emerald">Confirmer</UButton>

<!-- Danger -->
<UButton variant="soft" color="orange">Supprimer</UButton>
```

**Classes manuelles :**

```html
<!-- Primary -->
<button class="bg-violet-600 hover:bg-violet-500 text-white rounded-xl px-4 py-2 transition">
  Action
</button>

<!-- Secondary/Ghost -->
<button class="border border-neutral-700 bg-neutral-800/50 hover:border-violet-500 text-white rounded-xl px-4 py-2 transition">
  Annuler
</button>

<!-- Success -->
<button class="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl px-4 py-2 transition">
  Confirmer
</button>
```

### Cards

```html
<div class="rounded-xl border border-neutral-700/50 bg-neutral-900/80 backdrop-blur-sm p-4 transition-all hover:border-violet-500/50">
  <!-- Contenu -->
</div>
```

**Avec états dynamiques :**

```vue
<div :class="[
  'rounded-xl border backdrop-blur-sm p-4 transition-all',
  isActive
    ? 'border-violet-500/50 bg-violet-950/50'
    : 'border-neutral-700/50 bg-neutral-900/80 hover:border-neutral-600'
]">
```

### Inputs

```html
<input
  class="w-full rounded-xl border border-neutral-700/50 bg-neutral-800/50 px-4 py-3 text-white placeholder-neutral-500 outline-none transition focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20"
  placeholder="Rechercher..."
/>
```

### Modals/Overlays

```html
<!-- Backdrop -->
<div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm">
  <!-- Modal -->
  <div class="bg-neutral-900/95 backdrop-blur-xl rounded-2xl border border-neutral-700/50 shadow-2xl">
    <!-- Contenu -->
  </div>
</div>
```

## Animations

### CSS Personnalisé

Ajouter dans `assets/css/main.css` :

```css
/* Gradient Text Animé */
.text-ai-gradient {
  background: linear-gradient(135deg, #8b5cf6, #a855f7, #ec4899);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.animate-magic-text {
  background-size: 200% 200%;
  animation: magic-text 4s ease infinite;
}

@keyframes magic-text {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

/* Floating Elements */
.animate-float {
  animation: float 6s ease-in-out infinite;
}

.animate-float-delayed {
  animation: float 6s ease-in-out infinite;
  animation-delay: 2s;
}

.animate-float-slow {
  animation: float 8s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

/* Particles */
.animate-float-particle {
  animation: float-particle 4s ease-in-out infinite;
}

@keyframes float-particle {
  0%, 100% {
    transform: translateY(0) translateX(0);
    opacity: 0.5;
  }
  50% {
    transform: translateY(-30px) translateX(10px);
    opacity: 1;
  }
}

/* Slow Rotations */
.animate-spin-very-slow {
  animation: spin 60s linear infinite;
}

.animate-spin-slow-reverse {
  animation: spin 45s linear infinite reverse;
}

/* Magic Sparkle */
.animate-magic {
  animation: magic 3s ease-in-out infinite;
}

@keyframes magic {
  0%, 100% {
    filter: drop-shadow(0 0 2px rgba(139, 92, 246, 0.5));
    transform: rotate(0deg);
  }
  50% {
    filter: drop-shadow(0 0 8px rgba(139, 92, 246, 0.8));
    transform: rotate(10deg);
  }
}

/* Wave Animations */
.animate-wave-slow { animation: wave 20s ease-in-out infinite; }
.animate-wave-medium { animation: wave 15s ease-in-out infinite; }
.animate-wave-fast { animation: wave 10s ease-in-out infinite; }

@keyframes wave {
  0%, 100% { transform: translateX(0) translateY(0); }
  25% { transform: translateX(-5%) translateY(2%); }
  50% { transform: translateX(0) translateY(-2%); }
  75% { transform: translateX(5%) translateY(2%); }
}

/* Page Transitions */
.page-enter-active,
.page-leave-active {
  transition: opacity 250ms ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
```

### VueUse Motion

```vue
<script setup>
import { useMotion } from '@vueuse/motion'
</script>

<template>
  <div
    v-motion
    :initial="{ opacity: 0, y: 20 }"
    :enter="{
      opacity: 1,
      y: 0,
      transition: { delay: 200, duration: 500 }
    }"
  >
    Contenu animé
  </div>
</template>
```

## Layout

### Structure de Page

```vue
<!-- layouts/default.vue -->
<template>
  <div class="min-h-screen bg-neutral-950">
    <!-- Header sticky -->
    <header class="sticky top-0 z-50 bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-800/50">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <slot name="header" />
      </div>
    </header>

    <!-- Contenu principal -->
    <main class="max-w-7xl mx-auto px-4 py-8">
      <slot />
    </main>

    <!-- Footer -->
    <footer class="border-t border-neutral-800/50 py-8">
      <slot name="footer" />
    </footer>
  </div>
</template>
```

### Breakpoints Responsives

| Prefix | Min-width | Usage |
|--------|-----------|-------|
| `sm:` | 640px | Mobile large |
| `md:` | 768px | Tablette |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Large desktop |

**Pattern courant :**

```html
<div class="flex flex-col md:flex-row gap-4 md:gap-8">
  <div class="w-full md:w-1/3">Sidebar</div>
  <div class="w-full md:w-2/3">Content</div>
</div>
```

## Icônes

### Configuration

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ['@nuxt/icon'],
  icon: {
    serverBundle: {
      collections: ['heroicons', 'simple-icons']
    }
  }
})
```

### Utilisation

```vue
<!-- Heroicons -->
<UIcon name="i-heroicons-magnifying-glass" class="h-5 w-5" />
<UIcon name="i-heroicons-play-solid" class="h-4 w-4" />
<UIcon name="i-heroicons-sparkles" class="h-6 w-6 text-violet-400" />

<!-- Simple Icons (marques) -->
<UIcon name="i-simple-icons-soundcloud" class="h-5 w-5 text-orange-500" />
```

### Tailles Standards

| Classe | Usage |
|--------|-------|
| `h-3 w-3` | Indicateurs, badges |
| `h-4 w-4` | Boutons compacts |
| `h-5 w-5` | Boutons standards |
| `h-6 w-6` | Navigation |
| `h-8 w-8` | Hero icons |

## Patterns Utiles

### Focus States

```html
<button class="... focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:ring-offset-2 focus:ring-offset-neutral-950">
```

### Hover Effects

```html
<!-- Opacity -->
<div class="opacity-70 hover:opacity-100 transition">

<!-- Scale -->
<div class="hover:scale-105 transition-transform">

<!-- Border color -->
<div class="border border-neutral-700 hover:border-violet-500/50 transition-colors">

<!-- Background -->
<div class="bg-neutral-800/50 hover:bg-neutral-700/50 transition-colors">
```

### Disabled States

```html
<button class="... disabled:opacity-50 disabled:cursor-not-allowed" :disabled="loading">
```

### Gradients

```html
<!-- Background gradient -->
<div class="bg-gradient-to-br from-violet-600 to-violet-800">

<!-- Text gradient -->
<span class="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
```

### Shadows

```html
<!-- Standard -->
<div class="shadow-lg">

<!-- Colored shadow -->
<div class="shadow-xl shadow-violet-500/30">

<!-- Glow effect -->
<div class="shadow-[0_0_30px_rgba(139,92,246,0.3)]">
```

## Structure des Composants Vue

```vue
<script setup lang="ts">
/* --- Props --- */
interface Props {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'primary'
})

/* --- Emits --- */
const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

/* --- States --- */
const isLoading = ref(false)

/* --- Computed --- */
const sizeClasses = computed(() => ({
  sm: 'px-2 py-1 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg'
}[props.size]))

/* --- Methods --- */
function handleClick(event: MouseEvent) {
  emit('click', event)
}
</script>

<template>
  <button
    :class="sizeClasses"
    @click="handleClick"
  >
    <slot />
  </button>
</template>
```

## Installation

### 1. Dépendances

```bash
npm install @nuxt/ui @nuxt/icon @nuxt/fonts @vueuse/motion
```

### 2. Configuration Nuxt

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/icon',
    '@nuxt/fonts'
  ],
  css: ['~/assets/css/main.css'],
  icon: {
    serverBundle: {
      collections: ['heroicons', 'simple-icons']
    }
  }
})
```

### 3. Configuration App

```ts
// app.config.ts
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'violet',
      secondary: 'orange',
      neutral: 'zinc'
    }
  }
})
```

### 4. Styles Globaux

Créer `assets/css/main.css` avec les imports et animations ci-dessus.

## Checklist Nouveau Projet

- [ ] Installer les dépendances
- [ ] Configurer `nuxt.config.ts`
- [ ] Créer `app.config.ts` avec les couleurs
- [ ] Créer `assets/css/main.css` avec les animations
- [ ] Configurer le layout par défaut
- [ ] Tester les composants de base (boutons, cards, inputs)
