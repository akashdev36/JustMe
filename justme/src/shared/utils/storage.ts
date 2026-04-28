// Storage utilities — auth-layer keys only
// Notes-specific keys live in src/features/notes/storage.ts

export const STORAGE_KEYS = {
  USER: 'justme_user',
} as const

export function clearAuthStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.USER)
    console.log('Authentication data cleared from storage')
  } catch (error) {
    console.error('Failed to clear auth storage:', error)
  }
}

export function clearInvalidAuthData(): boolean {
  try {
    const userData = localStorage.getItem(STORAGE_KEYS.USER)
    if (!userData) return false

    let parsed
    try {
      parsed = JSON.parse(userData)
    } catch {
      localStorage.removeItem(STORAGE_KEYS.USER)
      return true
    }

    const hasRequiredFields =
      parsed &&
      typeof parsed === 'object' &&
      parsed.email &&
      parsed.name &&
      parsed.token &&
      parsed.tokenExpiry

    if (!hasRequiredFields) {
      localStorage.removeItem(STORAGE_KEYS.USER)
      console.log('Cleared invalid legacy authentication data')
      return true
    }

    return false
  } catch (error) {
    console.error('Error checking auth data:', error)
    localStorage.removeItem(STORAGE_KEYS.USER)
    return true
  }
}

export function getStorageInfo(): Record<string, boolean> {
  const info: Record<string, boolean> = {}
  Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
    info[key] = localStorage.getItem(storageKey) !== null
  })
  return info
}

// Call on app startup to clean up invalid data
export function initializeStorage(): void {
  const cleared = clearInvalidAuthData()
  if (cleared) {
    console.log('Invalid authentication data detected and cleared. Please sign in again.')
  }
}
