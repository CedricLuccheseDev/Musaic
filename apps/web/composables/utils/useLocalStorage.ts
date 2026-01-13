/**
 * Reusable localStorage composable with SSR safety
 * Provides a consistent pattern for localStorage access across the app
 */

export interface UseLocalStorageOptions<T> {
  /**
   * Custom serializer function (default: JSON.stringify)
   */
  serializer?: (value: T) => string

  /**
   * Custom deserializer function (default: JSON.parse)
   */
  deserializer?: (value: string) => T

  /**
   * Validation function to ensure loaded data is valid
   */
  validator?: (value: unknown) => value is T
}

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  options?: UseLocalStorageOptions<T>
) {
  const {
    serializer = JSON.stringify,
    deserializer = JSON.parse,
    validator
  } = options || {}

  const value = ref<T>(initialValue) as Ref<T>

  /**
   * Load value from localStorage
   * SSR-safe - returns initial value on server
   */
  function load(): T {
    if (import.meta.server) return initialValue

    try {
      const stored = localStorage.getItem(key)
      if (!stored) return initialValue

      const parsed = deserializer(stored)

      // Validate if validator is provided
      if (validator && !validator(parsed)) {
        return initialValue
      }

      return parsed
    } catch (error) {
      // Invalid JSON or deserialization error
      return initialValue
    }
  }

  /**
   * Save value to localStorage
   * SSR-safe - does nothing on server
   */
  function save(newValue?: T) {
    if (import.meta.server) return

    try {
      const valueToSave = newValue !== undefined ? newValue : value.value
      localStorage.setItem(key, serializer(valueToSave))
    } catch (error) {
      // localStorage might be full or disabled - silently fail
    }
  }

  /**
   * Clear value from localStorage
   * SSR-safe - does nothing on server
   */
  function clear() {
    if (import.meta.server) return

    try {
      localStorage.removeItem(key)
      value.value = initialValue
    } catch (error) {
      // Silently fail
    }
  }

  /**
   * Initialize value from localStorage
   * Call this on component mount
   */
  function init() {
    value.value = load()
  }

  return {
    value,
    load,
    save,
    clear,
    init
  }
}
