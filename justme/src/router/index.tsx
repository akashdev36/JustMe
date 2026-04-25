import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../features/auth/useAuthStore'
import GoogleLoginButton from '../features/auth/GoogleLoginButton'
import AppShell from '../features/shell/AppShell'

function ProtectedRoute(): React.ReactElement {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  if (!isLoggedIn) {
    return <Navigate to="/" replace />
  }
  return <Outlet />
}

function PublicRoute(): React.ReactElement {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  if (isLoggedIn) {
    return <Navigate to="/home" replace />
  }
  return <Outlet />
}

export default function AppRouter(): React.ReactElement {
  return (
    <>
      <PublicRoute />
    </>
  )
}

export { ProtectedRoute, PublicRoute, AppShell, GoogleLoginButton }
