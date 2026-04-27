import { create } from 'zustand'
import { validateToken, validateDecodedGoogleUser, isTokenExpired, SecurityError } from '../../utils/security'
import { STORAGE_KEYS, initializeStorage } from '../../utils/storage'
import type { DecodedGoogleUser, AuthState as IAuthState, AuthActions } from '../../types'

interface AuthStore extends IAuthState, AuthActions {
  // Additional store-specific methods
  initializeAuth: () => void
  isTokenExpired: () => boolean
  getValidToken: () => string | null
}

function loadFromStorage(): DecodedGoogleUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER)
    if (!raw) return null
    
    const parsed = JSON.parse(raw)
    
    // Validate the stored user data
    const validated = validateDecodedGoogleUser(parsed)
    if (!validated || !validated.email || !validated.token) {
      localStorage.removeItem(STORAGE_KEYS.USER)
      return null
    }
    
    // Check if token is expired
    if (isTokenExpired(validated.tokenExpiry)) {
      localStorage.removeItem(STORAGE_KEYS.USER)
      return null
    }
    
    return validated
  } catch (error) {
    console.error('Failed to load user from storage:', error)
    // Clear invalid stored data and force re-authentication
    localStorage.removeItem(STORAGE_KEYS.USER)
    return null
  }
}

function saveToStorage(userData: DecodedGoogleUser): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData))
  } catch (error) {
    console.error('Failed to save user to storage:', error)
    throw new SecurityError('STORAGE_ERROR', 'Failed to save authentication data')
  }
}

export const useAuthStore = create<AuthStore>((set, get) => {
  // Initialize storage and clean up any invalid legacy data
  initializeStorage()
  
  // Load initial state once
  const initialUser = loadFromStorage()
  
  return {
    // Initial state
    user: initialUser,
    isLoggedIn: !!initialUser,
    isLoading: false,
    error: null,

    // Auth actions
    login: (userData: DecodedGoogleUser) => {
      try {
        // Validate user data
        const validated = validateDecodedGoogleUser(userData)
        validateToken(validated.token)
        
        saveToStorage(validated)
        set({ 
          user: validated, 
          isLoggedIn: true, 
          error: null,
          isLoading: false 
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Login failed'
        set({ error: errorMessage, isLoading: false })
        throw error
      }
    },

    refreshToken: (token: string, tokenExpiry: number) => {
      try {
        const current = get().user
        if (!current) {
          throw new SecurityError('UNAUTHORIZED', 'No user to refresh token for')
        }

        // Validate new token
        validateToken(token)
        
        const updated = { 
          ...current, 
          token, 
          tokenExpiry 
        }
        
        saveToStorage(updated)
        set({ 
          user: updated, 
          error: null 
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Token refresh failed'
        set({ error: errorMessage })
        // If token refresh fails, log out the user
        get().logout()
        throw error
      }
    },

    logout: () => {
      try {
        // Clear all auth-related storage
        Object.values(STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key)
        })
        
        set({ 
          user: null, 
          isLoggedIn: false, 
          error: null 
        })
      } catch (error) {
        console.error('Error during logout:', error)
        // Force logout even if storage cleanup fails
        set({ 
          user: null, 
          isLoggedIn: false, 
          error: null 
        })
      }
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading })
    },

    setError: (error: string | null) => {
      set({ error })
    },

    clearError: () => {
      set({ error: null })
    },

    // Store-specific methods
    initializeAuth: () => {
      const storedUser = loadFromStorage()
      set({ 
        user: storedUser, 
        isLoggedIn: !!storedUser,
        isLoading: false 
      })
    },

    isTokenExpired: () => {
      const user = get().user
      if (!user) return true
      return isTokenExpired(user.tokenExpiry)
    },

    getValidToken: () => {
      const user = get().user
      if (!user) return null
      
      if (isTokenExpired(user.tokenExpiry)) {
        get().logout()
        return null
      }
      
      return user.token
    },
  }
})

// Selector hooks for better performance
export const useAuthUser = () => useAuthStore(state => state.user)
export const useAuthIsLoggedIn = () => useAuthStore(state => state.isLoggedIn)
export const useAuthIsLoading = () => useAuthStore(state => state.isLoading)
export const useAuthError = () => useAuthStore(state => state.error)

// Computed selector for token validity
export const useAuthValidToken = () => {
  const user = useAuthUser()
  const logout = useAuthStore(state => state.logout)
  
  if (!user) return null
  
  if (isTokenExpired(user.tokenExpiry)) {
    logout()
    return null
  }
  
  return user.token
}

// Auth state checker hook
export const useAuthStatus = () => {
  const isLoggedIn = useAuthIsLoggedIn()
  const isLoading = useAuthIsLoading()
  const error = useAuthError()
  const isTokenExpired = useAuthStore(state => state.isTokenExpired())
  
  return {
    isLoggedIn,
    isLoading,
    error,
    isTokenExpired,
    needsRefresh: isLoggedIn && isTokenExpired,
  }
}

