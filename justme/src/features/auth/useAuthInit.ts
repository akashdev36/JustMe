import { useEffect, useRef, useCallback } from 'react'
import { initTokenClient, silentRefreshToken } from '../../shared/lib/googleClient'
import { useAuthStore } from './useAuthStore'
import { fetchUserProfile } from './authService'

// Token refresh mutex to prevent race conditions
class TokenRefreshMutex {
  private isRefreshing = false
  private pendingRefresh: Promise<void> | null = null

  async acquire(): Promise<void> {
    if (this.isRefreshing) {
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

  const scheduleRefresh = useCallback((tokenExpiry: number) => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current)
    }

    const msUntilExpiry = tokenExpiry - Date.now()
    const delay = Math.max(msUntilExpiry - 5 * 60 * 1000, 0)

    refreshTimerRef.current = setTimeout(async () => {
      try {
        setLoading(true)
        clearError()
        const { access_token, expires_in } = await silentRefreshToken()
        const newExpiry = Date.now() + (expires_in - 60) * 1000
        refreshToken(access_token, newExpiry)
        scheduleRefresh(newExpiry)
      } catch (error) {
        console.error('Token refresh failed:', error)
        setError('Session expired. Please sign in again.')
        setTimeout(() => logout(), 2000)
      } finally {
        setLoading(false)
      }
    }, delay)
  }, [refreshToken, logout, setLoading, setError, clearError])

  const initializeAuth = useCallback(async () => {
    if (isInitializedRef.current) return

    try {
      setLoading(true)
      clearError()

      // Initialize Google token client (returns promise once script is ready)
      await initTokenClient((response) => {
        // Handle token response if one occurs (e.g. from a previous session check)
        if (response?.access_token) {
          fetchUserProfile(response.access_token, response.expires_in || 3600).then(profile => {
            login(profile)
            scheduleRefresh(profile.tokenExpiry)
          })
        }
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
          setTimeout(() => logout(), 2000)
        }
      } else if (currentUser && !currentNeedsRefresh) {
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
    }, 5000)

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
      if (timeoutId) clearTimeout(timeoutId)
      refreshMutexRef.current.reset()
    }
  }, [initializeAuth])
}
