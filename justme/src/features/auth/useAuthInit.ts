import { useEffect, useRef, useCallback } from 'react'
import { initTokenClient, silentRefreshToken } from '../../lib/googleClient'
import { useAuthStore } from './useAuthStore'

// Token refresh mutex to prevent race conditions
class TokenRefreshMutex {
  private isRefreshing = false
  private pendingRefresh: Promise<void> | null = null

  async acquire(): Promise<void> {
    if (this.isRefreshing) {
      // Wait for the current refresh to complete
      await this.pendingRefresh
      return
    }

    this.isRefreshing = true
    this.pendingRefresh = Promise.resolve()
    
    try {
      await this.pendingRefresh
    } finally {
      this.isRefreshing = false
      this.pendingRefresh = null
    }
  }

  reset(): void {
    this.isRefreshing = false
    this.pendingRefresh = null
  }
}

export function useAuthInit(): void {
  const { login, refreshToken, logout, setLoading, setError, clearError, isTokenExpired, user } = useAuthStore()
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const refreshMutexRef = useRef(new TokenRefreshMutex())
  const isInitializedRef = useRef(false)

  // Schedule a proactive silent refresh before the token expires
  const scheduleRefresh = useCallback((tokenExpiry: number) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }
    
    const msUntilExpiry = tokenExpiry - Date.now()
    // Refresh 5 minutes before expiry (or immediately if already past)
    const delay = Math.max(msUntilExpiry - 5 * 60 * 1000, 0)

    refreshTimerRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        clearError()
        
        const { access_token, expires_in } = await silentRefreshToken()
        const newExpiry = Date.now() + (expires_in - 60) * 1000
        
        refreshToken(access_token, newExpiry)
        
        // Schedule the next refresh
        scheduleRefresh(newExpiry)
      } catch (error) {
        console.error('Token refresh failed:', error)
        setError('Session expired. Please sign in again.')
        
        // Force logout after failed refresh
        setTimeout(() => {
          logout()
        }, 2000)
      } finally {
        setLoading(false)
      }
    }, delay)
  }, [refreshToken, logout, setLoading, setError, clearError])

  // Initialize authentication
  const initializeAuth = useCallback(async () => {
    if (isInitializedRef.current) return
    
    try {
      setLoading(true)
      clearError()

      // Initialize Google token client
      await new Promise<void>((resolve) => {
        initTokenClient(async (response: { access_token?: string; expires_in?: number }) => {
          const { access_token, expires_in } = response
          if (access_token) {
            try {
              const { fetchUserProfile } = await import('./authUtils')
              const profile = await fetchUserProfile(access_token, expires_in ?? 3600)
              login(profile)
              scheduleRefresh(profile.tokenExpiry)
            } catch (err) {
              console.error('Failed fetching user profile', err)
              setError('Failed to load user profile')
            }
          }
          resolve()
        })
      })

      // Check if we need to refresh existing token
      const currentUser = user
      const currentNeedsRefresh = currentUser ? isTokenExpired() : false
      
      if (currentUser && currentNeedsRefresh) {
        try {
          const { access_token, expires_in } = await silentRefreshToken()
          const newExpiry = Date.now() + (expires_in - 60) * 1000
          refreshToken(access_token, newExpiry)
          scheduleRefresh(newExpiry)
        } catch (error) {
          console.error('Silent refresh failed:', error)
          setError('Session expired. Please sign in again.')
          setTimeout(() => {
            logout()
          }, 2000)
        }
      } else if (currentUser && !currentNeedsRefresh) {
        // Token is valid, schedule next refresh
        scheduleRefresh(currentUser.tokenExpiry)
      }
    } catch (error) {
      console.error('Auth initialization failed:', error)
      setError('Authentication failed. Please try again.')
    } finally {
      setLoading(false)
      isInitializedRef.current = true
    }
  }, [login, refreshToken, scheduleRefresh, setLoading, setError, clearError, logout, user, isTokenExpired])

  useEffect(() => {
    initializeAuth()

    // Safety timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      if (!isInitializedRef.current) {
        console.warn('Auth initialization timeout - forcing completion')
        setLoading(false)
        isInitializedRef.current = true
      }
    }, 5000) // 5 second timeout

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current)
      }
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
      refreshMutexRef.current.reset()
    }
  }, [initializeAuth])
}
