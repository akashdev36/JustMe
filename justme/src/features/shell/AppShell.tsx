import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../auth/useAuthStore'
import { useNotesStore } from '../notes/useNotesStore'

declare global {
  interface Window {
    documentPictureInPicture: {
      requestWindow: (options: { width: number; height: number }) => Promise<Window>
      window: Window | null
    }
  }
}

export default function AppShell(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768)
  const { user, logout } = useAuthStore()
  const { loadNotes } = useNotesStore()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const pipWindowRef = useRef<Window | null>(null)

  // Load notes globally on login — ensures Home + Journal always have up-to-date data
  useEffect(() => {
    if (user) loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.email])

  // PiP broadcast channel
  useEffect(() => {
    const pipChannel = new BroadcastChannel('justme_pip')
    pipChannel.onmessage = (e) => {
      if (e.data?.type === 'RESIZE' && pipWindowRef.current) {
        pipWindowRef.current.resizeTo(e.data.width, e.data.height)
      }
    }
    return () => { pipChannel.close() }
  }, [])

  const handleSignOut = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#f0f4f7]">
      <header className="h-[56px] md:h-[64px] px-4 md:px-6 bg-[#f0f4f7] flex items-center justify-between flex-shrink-0 z-40 border-b border-gray-100/50">
        <div className="flex items-center gap-4 md:gap-6">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex w-[32px] h-[32px] items-center justify-center rounded-lg border border-[#00aeb1] text-[#00aeb1] transition-all active:scale-95 hover:bg-white"
            aria-label="Toggle sidebar"
          >
            <div className="flex flex-col gap-[2.5px]">
              <div className="w-[14px] h-[2px] bg-[#00aeb1] rounded-full" />
              <div className="w-[14px] h-[2px] bg-[#00aeb1] rounded-full" />
              <div className="w-[14px] h-[2px] bg-[#00aeb1] rounded-full" />
            </div>
          </button>
          <span
            className="text-[18px] md:text-[22px] font-bold text-gray-900 leading-none cursor-pointer"
            style={{ fontFamily: "'Lora', serif" }}
            onClick={() => navigate('/home')}
          >
            JustMe
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-[#00aeb1] text-white flex items-center justify-center font-bold text-[13px] md:text-[14px] shadow-sm hover:scale-105 active:scale-95 transition-all overflow-hidden border-2 border-white"
            >
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </button>

            {showProfileMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account</p>
                  <p className="text-[12px] font-medium text-gray-900 truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-4 py-2.5 text-[14px] font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
                  </svg>
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1 overflow-hidden flex flex-col relative">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden h-[56px] bg-white border-t border-gray-100 flex items-center justify-around px-6 z-40 pb-safe">
        <button
          onClick={() => navigate('/home')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            location.pathname === '/home' ? 'text-[#00aeb1]' : 'text-gray-400'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
        </button>

        <button
          onClick={() => navigate('/notes')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            location.pathname === '/notes' ? 'text-[#00aeb1]' : 'text-gray-400'
          }`}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span className="text-[9px] font-bold uppercase tracking-wider">Notes</span>
        </button>
      </nav>
    </div>
  )
}
