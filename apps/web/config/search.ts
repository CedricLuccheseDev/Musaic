// Placeholder phrases for the animated search bar
export const placeholderPhrases = [
  'Neuro dnb similar to Imanu',
  'Melodic dubstep with female vocals',
  'Dark halftime around 86 BPM',
  'Deep dubstep with heavy sub bass',
  'Heavy bass music like Excision',
  'Tracks similar to Subtronics',
  'Liquid dnb with piano and vocals',
  'Emotional dnb with piano',
  'Hard riddim under 3 minutes',
  'Melodic techno similar to Artbat',
  'Underground techno gems',
  'Free download dubstep tracks',
  'Atmospheric drum and bass',
  'Tracks around 174 BPM',
  'Dark techno for late night sets',
  'Minimal dnb like Alix Perez',
  'Dancefloor dnb with rolling bass',
  'Deep house for summer vibes',
  'Bass house party tracks',
  'Garage and 2-step vibes'
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
