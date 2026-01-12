// Search history composable - localStorage based
// Phase 2 will add Supabase sync for logged-in users

const STORAGE_KEY = 'musaic_search_history'
const MAX_HISTORY = 15

export interface SearchHistoryEntry {
  query: string
  timestamp: number
  queryType: 'url' | 'track' | 'artist' | 'genre' | 'id'
  resultCount?: number
}

export function useSearchHistory() {
  const history = useState<SearchHistoryEntry[]>('searchHistory', () => [])

  // Load history from localStorage on client
  function loadHistory(): SearchHistoryEntry[] {
    if (import.meta.server) return []

    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      const parsed = JSON.parse(stored) as SearchHistoryEntry[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  // Save history to localStorage
  function persistHistory(entries: SearchHistoryEntry[]) {
    if (import.meta.server) return

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    } catch {
      // localStorage might be full or disabled
    }
  }

  // Initialize history on mount
  function initHistory() {
    if (import.meta.server) return
    history.value = loadHistory()
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
    persistHistory(updated)
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
    persistHistory([])
  }

  // Remove a specific entry
  function removeEntry(query: string) {
    const updated = history.value.filter(
      entry => entry.query.toLowerCase() !== query.toLowerCase()
    )
    history.value = updated
    persistHistory(updated)
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
