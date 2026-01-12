// Placeholder phrases for the animated search bar
export const placeholderPhrases = [
  'Find me some chill lofi beats',
  'Melodic dubstep with female vocals',
  'Dark techno for late night coding',
  'Uplifting trance from 2024',
  'Heavy bass music like Excision',
  'Tracks similar to Subtronics',
  'Deep house for summer vibes',
  'Emotional dnb with piano',
  'Hard riddim under 3 minutes',
  'Ambient music for focus',
  'Progressive house bangers',
  'Free download dubstep tracks',
  'Melodic bass with drops',
  'Tracks with 140 BPM',
  'Chill electronic for studying',
  'Festival trap anthems',
  'Underground techno gems',
  'Synthwave with retro vibes',
  'Bass house party tracks',
  'Atmospheric drum and bass'
]

// Ad display interval (show ad every N tracks)
export const AD_INTERVAL = 10

// Search tag definitions
export interface SearchTag {
  id: string
  label: string
  category: 'mood'
  icon?: string
  filter?: {
    field: string
    operator: 'gt' | 'lt'
    value: number
  }
}

// Mood tags - mapped to audio analysis features
export const moodTags: SearchTag[] = [
  {
    id: 'energetic',
    label: 'Energetic',
    category: 'mood',
    icon: 'i-heroicons-bolt',
    filter: { field: 'energy', operator: 'gt', value: 0.7 }
  },
  {
    id: 'chill',
    label: 'Chill',
    category: 'mood',
    icon: 'i-heroicons-moon',
    filter: { field: 'energy', operator: 'lt', value: 0.4 }
  },
  {
    id: 'dark',
    label: 'Dark',
    category: 'mood',
    icon: 'i-heroicons-eye-slash',
    filter: { field: 'spectral_centroid', operator: 'lt', value: 1500 }
  },
  {
    id: 'bright',
    label: 'Bright',
    category: 'mood',
    icon: 'i-heroicons-sun',
    filter: { field: 'spectral_centroid', operator: 'gt', value: 3000 }
  },
  {
    id: 'happy',
    label: 'Happy',
    category: 'mood',
    icon: 'i-heroicons-face-smile',
    filter: { field: 'valence', operator: 'gt', value: 0.7 }
  }
]

// Natural language prompt suggestions (ChatGPT-style)
export const naturalPrompts = [
  // House & Techno
  'Deep house groovy pour une soirée',
  'Techno hypnotique style Berlin',
  'Tech house avec une bonne bassline',
  'Progressive house mélodique',
  'Minimal techno pour le club',
  // Trance & Melodic
  'Trance uplifting avec des breakdowns épiques',
  'Progressive trance atmosphérique',
  'Melodic techno émotionnelle',
  // Bass & Dubstep
  'Dubstep mélodique avec des vocals',
  'Drum and bass liquide',
  'Future bass chill',
  // Chill & Ambient
  'Ambient électronique pour travailler',
  'Downtempo relaxant',
  'Lo-fi house pour chiller',
  // Other styles
  'Disco house funky',
  'Afro house tribal',
  'Breaks old school',
  'IDM expérimental',
  'Synthwave rétro 80s'
]

// Get random prompts for display
export function getRandomPrompts(count = 4): string[] {
  const shuffled = [...naturalPrompts].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, count)
}
