/**
 * Musical key notation system with Camelot wheel colors and conversions
 */

export type KeyNotation = 'standard' | 'camelot'

interface KeyInfo {
  standard: string
  camelot: string
  color: string
  colorClass: string
}

// Camelot wheel mapping with colors
// Colors follow the Camelot wheel color scheme (warm to cool)
const KEY_MAP: Record<string, KeyInfo> = {
  // Minor keys (A column in Camelot)
  'A minor': { standard: 'Am', camelot: '8A', color: '#22c55e', colorClass: 'text-green-500' },
  'E minor': { standard: 'Em', camelot: '9A', color: '#14b8a6', colorClass: 'text-teal-500' },
  'B minor': { standard: 'Bm', camelot: '10A', color: '#06b6d4', colorClass: 'text-cyan-500' },
  'F# minor': { standard: 'F#m', camelot: '11A', color: '#0ea5e9', colorClass: 'text-sky-500' },
  'C# minor': { standard: 'C#m', camelot: '12A', color: '#3b82f6', colorClass: 'text-blue-500' },
  'G# minor': { standard: 'G#m', camelot: '1A', color: '#6366f1', colorClass: 'text-indigo-500' },
  'D# minor': { standard: 'D#m', camelot: '2A', color: '#8b5cf6', colorClass: 'text-violet-500' },
  'A# minor': { standard: 'A#m', camelot: '3A', color: '#a855f7', colorClass: 'text-purple-500' },
  'F minor': { standard: 'Fm', camelot: '4A', color: '#d946ef', colorClass: 'text-fuchsia-500' },
  'C minor': { standard: 'Cm', camelot: '5A', color: '#ec4899', colorClass: 'text-pink-500' },
  'G minor': { standard: 'Gm', camelot: '6A', color: '#f43f5e', colorClass: 'text-rose-500' },
  'D minor': { standard: 'Dm', camelot: '7A', color: '#ef4444', colorClass: 'text-red-500' },

  // Major keys (B column in Camelot)
  'C major': { standard: 'C', camelot: '8B', color: '#22c55e', colorClass: 'text-green-500' },
  'G major': { standard: 'G', camelot: '9B', color: '#14b8a6', colorClass: 'text-teal-500' },
  'D major': { standard: 'D', camelot: '10B', color: '#06b6d4', colorClass: 'text-cyan-500' },
  'A major': { standard: 'A', camelot: '11B', color: '#0ea5e9', colorClass: 'text-sky-500' },
  'E major': { standard: 'E', camelot: '12B', color: '#3b82f6', colorClass: 'text-blue-500' },
  'B major': { standard: 'B', camelot: '1B', color: '#6366f1', colorClass: 'text-indigo-500' },
  'F# major': { standard: 'F#', camelot: '2B', color: '#8b5cf6', colorClass: 'text-violet-500' },
  'C# major': { standard: 'C#', camelot: '3B', color: '#a855f7', colorClass: 'text-purple-500' },
  'G# major': { standard: 'G#', camelot: '4B', color: '#d946ef', colorClass: 'text-fuchsia-500' },
  'D# major': { standard: 'D#', camelot: '5B', color: '#ec4899', colorClass: 'text-pink-500' },
  'A# major': { standard: 'A#', camelot: '6B', color: '#f43f5e', colorClass: 'text-rose-500' },
  'F major': { standard: 'F', camelot: '7B', color: '#ef4444', colorClass: 'text-red-500' },

  // Enharmonic equivalents (flat notation)
  'Bb minor': { standard: 'Bbm', camelot: '3A', color: '#a855f7', colorClass: 'text-purple-500' },
  'Eb minor': { standard: 'Ebm', camelot: '2A', color: '#8b5cf6', colorClass: 'text-violet-500' },
  'Ab minor': { standard: 'Abm', camelot: '1A', color: '#6366f1', colorClass: 'text-indigo-500' },
  'Db minor': { standard: 'Dbm', camelot: '12A', color: '#3b82f6', colorClass: 'text-blue-500' },
  'Gb minor': { standard: 'Gbm', camelot: '11A', color: '#0ea5e9', colorClass: 'text-sky-500' },
  'Bb major': { standard: 'Bb', camelot: '6B', color: '#f43f5e', colorClass: 'text-rose-500' },
  'Eb major': { standard: 'Eb', camelot: '5B', color: '#ec4899', colorClass: 'text-pink-500' },
  'Ab major': { standard: 'Ab', camelot: '4B', color: '#d946ef', colorClass: 'text-fuchsia-500' },
  'Db major': { standard: 'Db', camelot: '3B', color: '#a855f7', colorClass: 'text-purple-500' },
  'Gb major': { standard: 'Gb', camelot: '2B', color: '#8b5cf6', colorClass: 'text-violet-500' }
}

/* --- State --- */
const STORAGE_KEY = 'musaic_key_notation'
const notation = ref<KeyNotation>('standard')

function loadNotation() {
  if (import.meta.server) return
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'standard' || stored === 'camelot') {
    notation.value = stored
  }
}

function saveNotation() {
  if (import.meta.server) return
  localStorage.setItem(STORAGE_KEY, notation.value)
}

export function useKeyNotation() {
  /* --- Methods --- */
  function getKeyInfo(key: string | null): KeyInfo | null {
    if (!key) return null
    return KEY_MAP[key] || null
  }

  function formatKey(key: string | null): string {
    if (!key) return '-'
    const info = KEY_MAP[key]
    if (!info) return key
    return notation.value === 'camelot' ? info.camelot : info.standard
  }

  function getKeyColor(key: string | null): string {
    if (!key) return '#9ca3af' // neutral gray
    const info = KEY_MAP[key]
    return info?.color || '#9ca3af'
  }

  function getKeyColorClass(key: string | null): string {
    if (!key) return 'text-neutral-400'
    const info = KEY_MAP[key]
    return info?.colorClass || 'text-neutral-400'
  }

  function setNotation(value: KeyNotation) {
    notation.value = value
    saveNotation()
  }

  function toggleNotation() {
    notation.value = notation.value === 'standard' ? 'camelot' : 'standard'
    saveNotation()
  }

  // Load on first use
  loadNotation()

  return {
    notation: readonly(notation),
    formatKey,
    getKeyInfo,
    getKeyColor,
    getKeyColorClass,
    setNotation,
    toggleNotation
  }
}
