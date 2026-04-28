import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../features/auth/useAuthStore'
import { useAuthInit } from '../features/auth/useAuthInit'
import { DEFAULT_PUBLIC_ROUTE } from './routes.config'

// Lazy load via feature public APIs
const AppShell = lazy(() => import('../features/shell/AppShell'))
const Home = lazy(() => import('../features/home/Home'))
const NotesPage = lazy(() => import('../features/notes/NotesPage'))
const SignInPage = lazy(() => import('../features/auth/SignInPage'))

// Loading fallback
const RouteLoadingFallback = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
)

// Route guard — protected routes
interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement | null {
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  if (!isLoggedIn) {
    return <Navigate to={DEFAULT_PUBLIC_ROUTE} replace />
  }
  return <>{children}</>
}

// Route guard — public routes
interface PublicRouteProps {
  children: React.ReactNode
}

function PublicRoute({ children }: PublicRouteProps): React.ReactElement | null {
  const isLoggedIn = useAuthStore(state => state.isLoggedIn)
  if (isLoggedIn) {
    return <Navigate to="/home" replace />
  }
  return <>{children}</>
}

// Main router — auth is initialized here so it runs on ALL routes
export function AppRouter(): React.ReactElement {
  useAuthInit()

  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public — Sign In */}
        <Route
          path="/"
          element={
            <PublicRoute>
              <SignInPage />
            </PublicRoute>
          }
        />

        {/* Protected — App Shell wraps all protected pages */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/home" element={<Home />} />
          <Route path="/notes" element={<NotesPage />} />
        </Route>

        {/* 404 fallback */}
        <Route path="*" element={<Navigate to={DEFAULT_PUBLIC_ROUTE} replace />} />
      </Routes>
    </Suspense>
  )
}

export { ProtectedRoute, PublicRoute }
