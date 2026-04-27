// Route configuration constants

export interface RouteConfig {
  path: string
  element: React.ReactNode
  isPublic: boolean
  children?: RouteConfig[]
  index?: boolean
}

// NOTE: Routes are now defined directly in Router.tsx for better AppShell integration
// This file is kept for shared constants and types
export const routes: RouteConfig[] = []

// Public routes that don't require authentication
export const publicRoutes = ['/']

// Default redirect paths
export const DEFAULT_PUBLIC_ROUTE = '/'
export const DEFAULT_PROTECTED_ROUTE = '/home'
