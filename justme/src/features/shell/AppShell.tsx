import React, { useState, useEffect, useRef } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

declare global {
  interface Window {
    documentPictureInPicture: {
      requestWindow: (options: { width: number; height: number }) => Promise<Window>
      window: Window | null
    }
  }
}

// Hamburger icon: three horizontal lines
function HamburgerIcon(): React.ReactElement {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  )
}

export default function AppShell(): React.ReactElement {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const pipWindowRef = useRef<Window | null>(null)

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
      React.createElement(NotesEditor, { pipMode: true })
    )

    // Cleanup when PiP window closes
    pipWindow.addEventListener('pagehide', () => {
      root.unmount()
    })
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="flex items-center h-[48px] px-4 bg-white border-b border-gray-200/50 flex-shrink-0">
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <HamburgerIcon />
          </button>
          <span
            className="ml-3 text-xl font-semibold text-gray-900"
            style={{ fontFamily: "'Lora', serif" }}
          >
            JustMe
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button 
              type="button"
              onClick={openPiP}
              className="w-7 h-7 flex items-center justify-center rounded-md border-[0.5px] border-gray-200 bg-transparent text-gray-500 hover:text-[#333] transition-colors"
              title="Float on top"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="2" width="20" height="20" rx="2"/>
                <rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor" stroke="none"/>
              </svg>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
