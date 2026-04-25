import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../auth/useAuthStore'
import { useNotesStore } from '../notes/useNotesStore'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
}

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
}: SidebarProps): React.ReactElement {
  const navigate = useNavigate()
  const { logout } = useAuthStore()
  const { notes, activeNoteId, setActiveNoteId, createNote, deleteNote } = useNotesStore()

  const [showNameInput, setShowNameInput] = useState(false)
  const [noteName, setNoteName] = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showNameInput) {
      setTimeout(() => nameInputRef.current?.focus(), 50)
    }
  }, [showNameInput])

  const handleSignOut = () => {
    logout()
    navigate('/')
  }

  const handleClickPlus = () => {
    setNoteName('')
    setShowNameInput(true)
  }

  const handleConfirmCreate = async () => {
    const title = noteName.trim()
    if (!title) return
    setShowNameInput(false)
    setNoteName('')
    await createNote(title)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleConfirmCreate()
    if (e.key === 'Escape') {
      setShowNameInput(false)
      setNoteName('')
    }
  }

  // Width management for integrated pushing
  const sidebarWidth = sidebarOpen ? 'w-[280px]' : 'w-0 invisible'

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/10 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'h-full bg-white border-r border-gray-100 flex flex-col',
          'transition-all duration-300 ease-in-out overflow-hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'fixed inset-y-0 left-0 z-30 md:relative md:z-auto',
          sidebarWidth
        ].join(' ')}
        onTransitionEnd={() => {}}
      >
        <div className="flex flex-col h-full w-[280px]">
          {/* HEADER */}
          <div className="pt-8 pb-4 px-8 flex items-center justify-between flex-shrink-0">
            <span className="text-[12px] font-bold text-gray-400 uppercase tracking-widest">Workspace</span>
            <button
              onClick={handleClickPlus}
              className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-900 transition-all"
              title="New note"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Inline Name Input — appears below header when + is clicked */}
          {showNameInput && (
            <div className="px-4 pb-3 flex-shrink-0">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 shadow-sm">
                <input
                  ref={nameInputRef}
                  type="text"
                  value={noteName}
                  onChange={(e) => setNoteName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={() => setTimeout(() => { setShowNameInput(false); setNoteName('') }, 150)}
                  placeholder="Note name..."
                  className="flex-1 text-[14px] font-medium text-gray-800 bg-transparent outline-none placeholder-gray-400"
                />
                <button
                  onClick={handleConfirmCreate}
                  disabled={!noteName.trim()}
                  className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-900 text-white disabled:opacity-30 transition-opacity hover:bg-gray-700 flex-shrink-0"
                  title="Create"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* NAVIGATION: Note Titles */}
          <nav className="flex-1 px-4 pt-2 overflow-y-auto space-y-1 [&::-webkit-scrollbar]:hidden">
            {notes.map((note) => (
              <div key={note.id} className="relative group px-2">
                <button
                  onClick={() => {
                    setActiveNoteId(note.id)
                    if (window.innerWidth < 768) setSidebarOpen(false)
                  }}
                  className={[
                    'block w-full text-left px-4 py-3 rounded-lg text-[15px] transition-all duration-200 truncate pr-10',
                    activeNoteId === note.id
                      ? 'text-gray-900 font-bold bg-gray-50'
                      : 'text-gray-500 font-medium hover:text-gray-900 hover:bg-gray-50/50'
                  ].join(' ')}
                >
                  {note.title || 'Untitled Story'}
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('Delete this note?')) {
                      deleteNote(note.id)
                    }
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all duration-200"
                  title="Delete note"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                </button>
              </div>
            ))}
            {notes.length === 0 && (
              <p className="px-4 py-10 text-[14px] text-gray-300 italic text-center">Your library is empty.</p>
            )}
          </nav>

          {/* FOOTER: Sign Out */}
          <div className="px-8 py-6 border-t border-gray-50">
            <button
              onClick={handleSignOut}
              className="text-[14px] font-medium text-gray-300 hover:text-gray-600 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
