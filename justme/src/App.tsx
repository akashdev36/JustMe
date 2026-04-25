import React, { useEffect, useRef } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { initTokenClient, silentRefreshToken } from './lib/googleClient'
import { PublicRoute, ProtectedRoute } from './router/index'
import GoogleLoginButton from './features/auth/GoogleLoginButton'
import AppShell from './features/shell/AppShell'
import NotesPage from './features/notes/NotesPage'
import { useAuthStore } from './features/auth/useAuthStore'

export default function App(): React.ReactElement {
  const { user, login, refreshToken, logout } = useAuthStore()
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Schedule a proactive silent refresh before the token expires
  const scheduleRefresh = (tokenExpiry: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    const msUntilExpiry = tokenExpiry - Date.now()
    // Refresh 60s before expiry (or immediately if already past)
    const delay = Math.max(msUntilExpiry - 60_000, 0)

    refreshTimerRef.current = setTimeout(async () => {
      try {
        const { access_token, expires_in } = await silentRefreshToken()
        const newExpiry = Date.now() + (expires_in - 60) * 1000
        refreshToken(access_token, newExpiry)
        scheduleRefresh(newExpiry) // keep the cycle going
      } catch {
        // Google session is gone — force logout
        logout()
      }
    }, delay)
  }

  useEffect(() => {
    // The callback fires every time the user explicitly logs in (consent flow)
    initTokenClient(async (response: any) => {
      const { access_token, expires_in } = response
      if (access_token) {
        try {
          const { fetchUserProfile } = await import('./features/auth/authUtils')
          const profile = await fetchUserProfile(access_token, expires_in ?? 3600)
          login(profile)
          scheduleRefresh(profile.tokenExpiry)
        } catch (err) {
          console.error('Failed fetching user profile', err)
        }
      }
    })

    // On startup: if we have a stored user and their token is expired → silent refresh
    if (user) {
      const isExpired = !user.tokenExpiry || Date.now() >= user.tokenExpiry

      if (isExpired) {
        // Token is expired — try a silent refresh before showing the app
        silentRefreshToken()
          .then(({ access_token, expires_in }) => {
            const newExpiry = Date.now() + (expires_in - 60) * 1000
            refreshToken(access_token, newExpiry)
            scheduleRefresh(newExpiry)
          })
          .catch(() => {
            // Couldn't refresh silently — Google session gone, force login
            logout()
          })
      } else {
        // Token still valid — just schedule the next refresh
        scheduleRefresh(user.tokenExpiry)
      }
    }

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/" element={<GoogleLoginButton />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/notes" element={<NotesPage />} />
        </Route>
      </Route>
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

