import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

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
    <div className="flex flex-col h-screen w-full overflow-hidden bg-white">
      {/* Global Header — fixed at top */}
      <header className="h-[60px] px-6 bg-white border-b border-gray-100 flex items-center gap-4 flex-shrink-0 z-40">
        <button
          type="button"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-[38px] h-[38px] flex items-center justify-center rounded-xl border-2 border-gray-900 group transition-all active:scale-95"
          aria-label="Toggle sidebar"
        >
          <div className="flex flex-col gap-[3px]">
            <div className="w-[18px] h-[2.5px] bg-gray-900 rounded-full" />
            <div className="w-[18px] h-[2.5px] bg-gray-900 rounded-full" />
            <div className="w-[18px] h-[2.5px] bg-gray-900 rounded-full" />
          </div>
        </button>
        <span
          className="text-[20px] font-bold text-gray-900 leading-none pb-0.5 cursor-pointer"
          style={{ fontFamily: "'Lora', serif" }}
          onClick={() => navigate('/notes')}
        >
          JustMe
        </span>

        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={openPiP}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white border border-gray-100 text-gray-400 hover:text-gray-900 transition-all shadow-sm"
            title="Float on top"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="2" y="2" width="20" height="20" rx="2" />
              <rect x="12" y="12" width="8" height="6" rx="1" fill="currentColor" stroke="none" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar */}
        <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
