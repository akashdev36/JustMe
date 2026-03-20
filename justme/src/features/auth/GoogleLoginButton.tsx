import React from 'react'
import { requestAccessToken } from '../../lib/googleClient'

export default function GoogleLoginButton(): React.ReactElement {
  const handleSignIn = () => {
    requestAccessToken()
  }

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center bg-white px-4"
      style={{ fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 mb-4">
          <h1 className="text-5xl text-gray-900 tracking-tight" style={{ fontFamily: "'Lora', serif" }}>
            JustMe
          </h1>
          <p className="text-base text-gray-500 font-normal">
            Your personal space
          </p>
        </div>

        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400 uppercase tracking-wider">
            Sign in to continue
          </span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <button
          onClick={handleSignIn}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 rounded-xl px-6 py-3.5 shadow-sm hover:bg-gray-50 hover:border-gray-400 transition-all font-sans font-medium text-gray-700 text-sm"
        >
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.75 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.75 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  )
}
