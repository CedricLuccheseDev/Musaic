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
