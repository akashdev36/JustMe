import React, { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { initTokenClient } from './lib/googleClient'
import { PublicRoute, ProtectedRoute } from './router/index'
import GoogleLoginButton from './features/auth/GoogleLoginButton'
import AppShell from './features/shell/AppShell'
import Home from './features/home/Home'
import NotesPage from './features/notes/NotesPage'
import { useAuthStore } from './features/auth/useAuthStore'
// Removed decode import

export default function App(): React.ReactElement {
  useEffect(() => {
    initTokenClient(async (response: any) => {
      const { access_token } = response
      if (access_token) {
        try {
          const { fetchUserProfile } = await import('./features/auth/authUtils')
          const profile = await fetchUserProfile(access_token)
          useAuthStore.getState().login(profile)
        } catch (err) {
          console.error('Failed fetching user profile', err)
        }
      }
    })
  }, [])

  return (
    <Routes>
      <Route element={<PublicRoute />}>
        <Route path="/" element={<GoogleLoginButton />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={<Home />} />
          <Route path="/notes" element={<NotesPage />} />
        </Route>
      </Route>
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
