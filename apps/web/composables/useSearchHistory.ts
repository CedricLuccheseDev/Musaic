// Search history composable - localStorage based
// Phase 2 will add Supabase sync for logged-in users

import { useLocalStorage } from '~/composables/utils/useLocalStorage'

const MAX_HISTORY = 15

export interface SearchHistoryEntry {
  query: string
  timestamp: number
  queryType: 'url' | 'track' | 'artist' | 'genre' | 'id'
  resultCount?: number
}

function isValidSearchHistory(value: unknown): value is SearchHistoryEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      entry =>
        typeof entry === 'object' &&
        entry !== null &&
        'query' in entry &&
        'timestamp' in entry &&
        'queryType' in entry &&
        typeof entry.query === 'string' &&
        typeof entry.timestamp === 'number'
    )
  )
}

export function useSearchHistory() {
  const history = useState<SearchHistoryEntry[]>('searchHistory', () => [])

  // Use shared localStorage utility
  const historyStorage = useLocalStorage<SearchHistoryEntry[]>(
    'musaic_search_history',
    [],
    {
      validator: isValidSearchHistory
    }
  )

  // Initialize history on mount
  function initHistory() {
    if (import.meta.server) return
    history.value = historyStorage.load()
  }

  // Save a new search
  function saveSearch(
    query: string,
    queryType: SearchHistoryEntry['queryType'] = 'genre',
    resultCount?: number
  ) {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    // Remove duplicate if exists
    const filtered = history.value.filter(
      entry => entry.query.toLowerCase() !== trimmedQuery.toLowerCase()
    )

    // Add new entry at the beginning
    const newEntry: SearchHistoryEntry = {
      query: trimmedQuery,
      timestamp: Date.now(),
      queryType,
      resultCount
    }

    // Keep only the most recent entries
    const updated = [newEntry, ...filtered].slice(0, MAX_HISTORY)

    history.value = updated
    historyStorage.save(updated)
  }

  // Get recent searches (optionally filtered by partial match)
  function getRecentSearches(limit = 10, filter?: string): SearchHistoryEntry[] {
    let results = history.value

    if (filter) {
      const lowerFilter = filter.toLowerCase()
      results = results.filter(entry =>
        entry.query.toLowerCase().includes(lowerFilter)
      )
    }

    return results.slice(0, limit)
  }

  // Get frequent genres/styles from history
  function getFrequentSearches(): string[] {
    const genreSearches = history.value.filter(e => e.queryType === 'genre')
    return genreSearches.map(e => e.query).slice(0, 5)
  }

  // Clear all history
  function clearHistory() {
    history.value = []
    historyStorage.clear()
  }

  // Remove a specific entry
  function removeEntry(query: string) {
    const updated = history.value.filter(
      entry => entry.query.toLowerCase() !== query.toLowerCase()
    )
    history.value = updated
    historyStorage.save(updated)
  }

  return {
    history: readonly(history),
    initHistory,
    saveSearch,
    getRecentSearches,
    getFrequentSearches,
    clearHistory,
    removeEntry
  }
}
