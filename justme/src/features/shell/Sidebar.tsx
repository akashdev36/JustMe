import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { signOut } from '../../lib/googleClient'
import { useAuthStore } from '../auth/useAuthStore'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

// Hand-crafted SVG icon: house shape
function HomeIcon(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Roof */}
      <polyline points="3 10 12 3 21 10" />
      {/* Walls */}
      <rect x="5" y="10" width="14" height="11" rx="1" />
      {/* Door */}
      <rect x="9" y="15" width="6" height="6" rx="0.5" />
    </svg>
  )
}

// Hand-crafted SVG icon: door with exit arrow
function SignOutIcon(): React.ReactElement {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {/* Door frame */}
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      {/* Arrow pointing right */}
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}

const AVATAR_COLORS = [
  'bg-indigo-500',
  'bg-emerald-500',
  'bg-rose-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-violet-500',
]

function getAvatarColor(email: string): string {
  let code = 0
  for (let i = 0; i < email.length; i++) {
    code += email.charCodeAt(i)
  }
  return AVATAR_COLORS[code % AVATAR_COLORS.length]
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
}: SidebarProps): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()

  const handleSignOut = () => {
    signOut(user?.token || '')
    logout()
    navigate('/')
  }

  const handleNavHome = () => {
    navigate('/home')
    setSidebarOpen(false)
  }

  const isHomeActive = location.pathname === '/home'
  const avatarLetter = user?.name
    ? user.name.charAt(0).toUpperCase()
    : user?.email
    ? user.email.charAt(0).toUpperCase()
    : 'U'
  const avatarColor = user?.email ? getAvatarColor(user.email) : 'bg-indigo-500'

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed top-0 left-0 z-30 h-full w-[260px] bg-white border-r border-gray-300',
          'flex flex-col transition-transform duration-300 ease-in-out',
          sidebarOpen ? 'translate-x-0 md:static md:z-auto' : '-translate-x-full md:hidden',
        ].join(' ')}
        aria-label="Sidebar navigation"
      >
        {/* TOP: User profile */}
        {user && (
          <div className="h-[48px] flex items-center px-6 border-b border-gray-200/50">
            <div className="flex items-center gap-3 min-w-0 w-full">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full ${avatarColor} flex items-center justify-center text-white text-xs font-semibold`}
              >
                {avatarLetter}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* MIDDLE: Navigation */}
        <nav className="flex-1 px-5 py-6 overflow-y-auto space-y-2">
          {/* Home */}
          <button
            type="button"
            onClick={handleNavHome}
            className={[
              'w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-sm font-medium transition-colors',
              isHomeActive
                ? 'bg-[#f0faf4] text-[#2d5a0e]'
                : 'text-[#6a6a68] hover:bg-gray-100',
            ].join(' ')}
            aria-current={isHomeActive ? 'page' : undefined}
          >
            <HomeIcon />
            <span>Home</span>
          </button>

          {/* Notes */}
          <button
            type="button"
            onClick={() => { navigate('/notes'); setSidebarOpen(false) }}
            className={[
              'w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-sm font-medium transition-colors',
              location.pathname === '/notes'
                ? 'bg-[#f0faf4] text-[#2d5a0e]'
                : 'text-[#6a6a68] hover:bg-gray-100'
            ].join(' ')}
          >
            <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <circle cx="9" cy="9" r="0.5" fill="currentColor" />
            </svg>
            <span>Notes</span>
          </button>
        </nav>

        {/* BOTTOM: Sign Out */}
        <div className="px-6 py-6 border-t border-gray-100">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <SignOutIcon />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  )
}
