import React from 'react'
import { AppRouter } from './router'
import ErrorBoundary from './shared/components/ErrorBoundary'

// Debug utilities (dev only)
if (import.meta.env.DEV) {
  import('./debug')
}

export default function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  )
}
