import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAuthStore } from '../auth/useAuthStore'

declare global {
  interface Window {
    documentPictureInPicture: {
      requestWindow: (options: { width: number; height: number }) => Promise<Window>
      window: Window | null
    }
  }
}

// Header is gone, HamburgerIcon no longer needed

export default function AppShell(): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { user, logout } = useAuthStore()
  const [showProfileMenu, setShowProfileMenu] = useState(false)
  const pipWindowRef = useRef<Window | null>(null)

  const handleSignOut = () => {
    logout()
    navigate('/')
  }

  useEffect(() => {
    const pipChannel = new BroadcastChannel('justme_pip')

    pipChannel.onmessage = (e) => {
      if (e.data?.type === 'RESIZE' && pipWindowRef.current) {
        pipWindowRef.current.resizeTo(e.data.width, e.data.height)
      }
    }

    return () => {
      pipChannel.close()
    }
  }, [])



  const openPiP = async () => {
    if (!('documentPictureInPicture' in window)) {
      alert('Picture-in-Picture is not supported in this browser. Please use Chrome 116+')
      return
    }

    const pipWindow = await window.documentPictureInPicture.requestWindow({
      width: 420,
      height: 680,
    })
    pipWindowRef.current = pipWindow

      // Copy all styles from main window to PiP window
      ;[...document.styleSheets].forEach(sheet => {
        try {
          const cssRules = [...sheet.cssRules].map(rule => rule.cssText).join('')
          const style = document.createElement('style')
          style.textContent = cssRules
          pipWindow.document.head.appendChild(style)
        } catch {
          const link = document.createElement('link')
          link.rel = 'stylesheet'
          link.href = (sheet as CSSStyleSheet).href ?? ''
          pipWindow.document.head.appendChild(link)
        }
      })

    pipWindow.document.body.style.margin = '0'
    pipWindow.document.body.style.padding = '0'
    pipWindow.document.body.style.background = '#ffffff'
    pipWindow.document.documentElement.style.background = '#ffffff'

    // Mount the chat component into PiP window
    const container = document.createElement('div')
    container.id = 'pip-root'
    container.style.cssText = 'width:100%;height:100vh;overflow:hidden;background:#ffffff;'
    pipWindow.document.body.appendChild(container)

    // Render NotesEditor into PiP window with isPopup=true
    const { createRoot } = await import('react-dom/client')
    const { default: NotesEditor } = await import('../notes/NotesEditor')
    const React = (await import('react')).default

    const root = createRoot(container)
    root.render(
      React.createElement(NotesEditor, {})
    )

    // Cleanup when PiP window closes
    pipWindow.addEventListener('pagehide', () => {
      root.unmount()
    })
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-[#f0f4f7]">
      {/* Global Header */}
      <header className="h-[80px] px-6 bg-[#f0f4f7] flex items-center justify-between flex-shrink-0 z-40">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex w-[38px] h-[38px] items-center justify-center rounded-xl border-2 border-[#00aeb1] text-[#00aeb1] transition-all active:scale-95"
            aria-label="Toggle sidebar"
          >
            <div className="flex flex-col gap-[3px]">
              <div className="w-[18px] h-[2.5px] bg-[#00aeb1] rounded-full" />
              <div className="w-[18px] h-[2.5px] bg-[#00aeb1] rounded-full" />
              <div className="w-[18px] h-[2.5px] bg-[#00aeb1] rounded-full" />
            </div>
          </button>
          <span
            className="text-[28px] font-bold text-gray-900 leading-none cursor-pointer"
            style={{ fontFamily: "'Lora', serif" }}
            onClick={() => navigate('/home')}
          >
            JustMe
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={openPiP}
            className="hidden md:flex w-10 h-10 items-center justify-center rounded-full bg-white border border-gray-100 text-gray-400 hover:text-gray-900 transition-all shadow-sm"
            title="Float on top"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor" stroke="none" />
            </svg>
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="w-10 h-10 rounded-full border-2 border-[#00aeb1] p-0.5 overflow-hidden active:scale-95 transition-transform"
            >
              <div className="w-full h-full rounded-full bg-teal-50 flex items-center justify-center text-[#00aeb1] font-bold text-sm uppercase">
                {user?.email?.charAt(0) || 'J'}
              </div>
            </button>
            
            {showProfileMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-50 mb-1">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account</p>
                    <p className="text-[13px] font-medium text-gray-900 truncate">{user?.email}</p>
                  </div>
                  <button 
                    onClick={() => { setShowProfileMenu(false); handleSignOut(); }} 
                    className="w-full text-left px-4 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                  >
                    Log out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-[#f0f4f7] pb-[70px] md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Bottom Taskbar — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-[70px] bg-white/80 backdrop-blur-md border-t border-gray-100 flex items-center justify-around px-6 z-[60] pb-safe">
        <button
          onClick={() => {
            navigate('/home')
            setSidebarOpen(false)
          }}
          className={`flex flex-col items-center gap-1 transition-all ${
            location.pathname === '/home' ? 'text-[#00aeb1] scale-110' : 'text-gray-400'
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Home</span>
        </button>

        <button
          onClick={() => {
            navigate('/notes')
            setSidebarOpen(true)
          }}
          className={`flex flex-col items-center gap-1 transition-all ${
            location.pathname === '/notes' ? 'text-[#00aeb1] scale-110' : 'text-gray-400'
          }`}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span className="text-[10px] font-bold uppercase tracking-wider">Notes</span>
        </button>
      </nav>
    </div>
  )
}
