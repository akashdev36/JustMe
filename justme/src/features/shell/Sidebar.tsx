import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps): React.ReactElement {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/5 md:hidden backdrop-blur-[2px]"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel — Now a slim Nav Rail */}
      <aside
        className={[
          'h-full bg-[#f0f4f7] border-r border-gray-100 flex flex-col',
          'transition-all duration-300 ease-in-out overflow-hidden',
          'fixed inset-y-0 left-0 z-50 w-[240px] md:w-[64px]', // Even slimmer on desktop
          'md:relative md:z-auto',
          sidebarOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0',
          sidebarOpen ? 'md:opacity-100' : 'md:w-0 md:opacity-0',
        ].join(' ')}
      >
        <div className="flex flex-col h-full w-full relative pt-6 items-center space-y-4">
          <button
            onClick={() => {
              navigate('/home')
              if (window.innerWidth < 768) setSidebarOpen(false)
            }}
            className={[
              'w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 group relative',
              location.pathname === '/home' 
                ? 'bg-[#00aeb1] text-white shadow-md shadow-[#00aeb1]/20 scale-105' 
                : 'text-gray-400 hover:bg-white hover:text-[#00aeb1] hover:shadow-sm'
            ].join(' ')}
            title="Home"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
            {location.pathname === '/home' && (
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00aeb1] rounded-full hidden md:block" />
            )}
            <span className="md:hidden ml-3 font-bold text-base">Home</span>
          </button>

          <button
            onClick={() => {
              navigate('/notes')
              if (window.innerWidth < 768) setSidebarOpen(false)
            }}
            className={[
              'w-11 h-11 flex items-center justify-center rounded-xl transition-all duration-300 group relative',
              location.pathname === '/notes' 
                ? 'bg-[#00aeb1] text-white shadow-md shadow-[#00aeb1]/20 scale-105' 
                : 'text-gray-400 hover:bg-white hover:text-[#00aeb1] hover:shadow-sm'
            ].join(' ')}
            title="Notes"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            {location.pathname === '/notes' && (
              <div className="absolute -right-2 top-1/2 -translate-y-1/2 w-1 h-6 bg-[#00aeb1] rounded-full hidden md:block" />
            )}
            <span className="md:hidden ml-3 font-bold text-base">Notes</span>
          </button>
        </div>
      </aside>
    </>
  )
}
