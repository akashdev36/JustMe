import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from '../features/auth/useAuthStore'
import { useAuthInit } from '../features/auth/useAuthInit'
import { DEFAULT_PUBLIC_ROUTE } from './routes.config'

// Lazy load AppShell for protected routes
const AppShell = lazy(() => import('../features/shell/AppShell'))

// Lazy load page components
const Home = lazy(() => import('../features/home/Home'))
const NotesPage = lazy(() => import('../features/notes/NotesPage'))
const GoogleLoginButton = lazy(() => import('../features/auth/GoogleLoginButton'))

// Loading fallback component
const RouteLoadingFallback = () => (
  <div className="min-h-screen w-full flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
      <p className="text-gray-600 text-sm">Loading...</p>
    </div>
  </div>
)

// Route guard component for protected routes
interface ProtectedRouteProps {
  children: React.ReactNode
}

function ProtectedRoute({ children }: ProtectedRouteProps): React.ReactElement | null {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  
  // Initialize auth only for protected routes
  useAuthInit()
  
  if (!isLoggedIn) {
    return <Navigate to={DEFAULT_PUBLIC_ROUTE} replace />
  }
  
  return <>{children}</>
}

// Route guard component for public routes
interface PublicRouteProps {
  children: React.ReactNode
}

function PublicRoute({ children }: PublicRouteProps): React.ReactElement | null {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  
  if (isLoggedIn) {
    return <Navigate to="/home" replace />
  }
  
  return <>{children}</>
}

// Main router component
export function AppRouter(): React.ReactElement {
  return (
    <Suspense fallback={<RouteLoadingFallback />}>
      <Routes>
        {/* Public route - Login */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <GoogleLoginButton />
            </PublicRoute>
          } 
        />
        
        {/* Protected routes with AppShell layout */}
        <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route path="/home" element={<Home />} />
          <Route path="/notes" element={<NotesPage />} />
        </Route>
        
        {/* Fallback route for 404 */}
        <Route path="*" element={<Navigate to={DEFAULT_PUBLIC_ROUTE} replace />} />
      </Routes>
    </Suspense>
  )
}

// Export route guards for use in other components
export { ProtectedRoute, PublicRoute }
