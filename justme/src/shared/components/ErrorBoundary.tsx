import React, { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import type { ErrorState } from '../types'

interface Props {
  children: ReactNode
  fallback?: React.ComponentType<{ error: Error; errorInfo: ErrorInfo }>
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State extends ErrorState {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })

    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    this.props.onError?.(error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error!} errorInfo={this.state.errorInfo!} />
    }

    return this.props.children
  }
}

function DefaultErrorFallback({ error, errorInfo }: { error: Error; errorInfo: ErrorInfo }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full mb-4">
          <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>

        <h1 className="text-xl font-semibold text-gray-900 text-center mb-2">Something went wrong</h1>

        <p className="text-gray-600 text-center mb-6">
          We're sorry, but something unexpected happened. The error has been logged and we'll look into it.
        </p>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Page
          </button>

          <button
            onClick={() => window.history.back()}
            className="w-full flex items-center justify-center px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Go Back
          </button>
        </div>

        {import.meta.env.DEV && (
          <details className="mt-6 p-4 bg-gray-100 rounded-lg">
            <summary className="text-sm font-medium text-gray-700 cursor-pointer">
              Error Details (Development Only)
            </summary>
            <div className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
              <strong>Error:</strong> {error.toString()}
              <br />
              <strong>Stack:</strong> {error.stack}
              <br />
              <strong>Component Stack:</strong> {errorInfo?.componentStack || 'No stack trace available'}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; errorInfo: ErrorInfo }>,
  onError?: (error: Error, errorInfo: ErrorInfo) => void
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback} onError={onError}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
