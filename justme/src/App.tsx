import React from 'react'
import { AppRouter } from './router'
import ErrorBoundary from './components/ErrorBoundary'
import './debug' // Import debug utilities

export default function App(): React.ReactElement {
  return (
    <ErrorBoundary>
      <AppRouter />
    </ErrorBoundary>
  )
}

