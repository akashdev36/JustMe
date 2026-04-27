// Storage utilities for managing localStorage data

export const STORAGE_KEYS = {
  USER: 'justme_user',
  NOTES_FOLDER: 'justme_notes_folder_id',
  IMAGES_FOLDER: 'justme_images_folder_id',
  NOTES_CACHE: 'justme_notes_cache',
  LAST_NOTE: 'justme_last_note',
} as const

export function clearAuthStorage(): void {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key)
    })
    console.log('All authentication data cleared from storage')
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

    // Check if data has required fields for new validation
    const hasRequiredFields = parsed && 
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

// Call this function to clean up any invalid data on app startup
export function initializeStorage(): void {
  const cleared = clearInvalidAuthData()
  if (cleared) {
    console.log('Invalid authentication data detected and cleared. Please sign in again.')
  }
}
