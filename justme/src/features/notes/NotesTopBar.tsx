import React, { useState, useEffect, useRef } from 'react'
import { useNotesStore } from './useNotesStore'

interface NotesTopBarProps {
  noteTitle: string
  onBack: () => void
  pipMode?: boolean
  isReadMode?: boolean
  setIsReadMode?: (val: boolean) => void
}



export default function NotesTopBar({
  noteTitle,
  onBack,
  pipMode,
  isReadMode,
  setIsReadMode,
}: NotesTopBarProps): React.ReactElement {
  const { deleteNote, activeNoteId, updateNote } = useNotesStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)

  const titleToShow = noteTitle.trim() === '' ? 'Untitled' : noteTitle
  const avatarLetter = titleToShow.charAt(0).toUpperCase()

  const startEditing = () => {
    setTitleDraft(noteTitle)
    setIsEditingTitle(true)
  }

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [isEditingTitle])

  const handleTitleSave = (newTitle: string) => {
    const trimmed = newTitle.trim()
    if (trimmed && trimmed !== noteTitle && activeNoteId) {
      updateNote(activeNoteId, { title: trimmed })
    }
    setIsEditingTitle(false)
  }

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [menuOpen])

  const handleDelete = async () => {
    if (activeNoteId) {
      await deleteNote(activeNoteId)
      onBack()
    }
  }

  const handleShare = () => {
    // Placeholder
    setMenuOpen(false)
  }

  return (
    <div className={`${pipMode ? 'h-[40px] min-h-[40px]' : 'h-[52px] min-h-[52px]'} bg-[#ffffff] px-4 flex items-center justify-between flex-shrink-0 animate-fadeIn ${pipMode ? 'border-b-[0.5px] border-[#f0f0f0]' : 'border-b border-[#e5e5e5]'}`}>
      {/* Left Side */}
      <div className={`flex items-center gap-3 min-w-0 ${pipMode ? 'flex-1 justify-center' : ''}`}>
        {!pipMode && (
          <button onClick={onBack} className="text-[#333] hover:text-[#111] flex-shrink-0 transition-colors" aria-label="Back to list">
            <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        {!pipMode && (
          <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 bg-[#d8f3dc] text-[#2d6a4f]">
            {avatarLetter}
          </div>
        )}
        <div className="flex items-baseline gap-2 min-w-0">
          {isEditingTitle ? (
            <div className="relative inline-flex min-w-[80px] max-w-[200px]">
              <div className="invisible font-sans text-[13px] font-medium px-0.5 whitespace-nowrap truncate">
                {titleDraft || ' '}
              </div>
              <input
                ref={titleInputRef}
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={() => handleTitleSave(titleDraft)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave(titleDraft)
                  else if (e.key === 'Escape') setIsEditingTitle(false)
                }}
                className="absolute inset-0 font-['Inter'] text-[16px] font-medium text-[#111111] border-0 border-b border-[#2d6a4f] bg-transparent outline-none p-0 m-0 w-full"
              />
            </div>
          ) : (
            <span
              onClick={startEditing}
              className={`font-['Inter'] ${pipMode ? 'text-[13px] font-medium' : 'text-[16px] font-weight-[500]'} text-[#111111] truncate max-w-[200px] cursor-text hover:underline hover:decoration-dashed hover:decoration-gray-400`}
            >
              {titleToShow}
            </span>
          )}
        </div>
      </div>

      {/* Right Side */}
      {!pipMode && (
        <div className="flex items-center gap-2">
          {/* Read Mode Toggle Button */}
          {setIsReadMode && (
            <button
              onClick={() => setIsReadMode(!isReadMode)}
              className={`w-[30px] h-[30px] rounded-lg items-center justify-center border transition-colors ${pipMode ? 'flex' : 'md:hidden flex'} ${
                isReadMode 
                  ? 'bg-[#f0faf4] text-[#2d6a4f] border-[#2d6a4f]' 
                  : 'bg-transparent text-[#999] border-gray-200/50 hover:bg-gray-100/80'
              }`}
              title={isReadMode ? "Switch to Write Mode" : "Switch to Read Mode"}
            >
              {isReadMode ? (
                /* Write icon - edit */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              ) : (
                /* Read icon - book */
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
                </svg>
              )}
            </button>
          )}

          {/* Three-dot menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-[28px] h-[28px] rounded-full flex items-center justify-center text-[#999] hover:bg-[#f5f5f5] transition-colors"
              aria-label="Menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1.5"></circle>
                <circle cx="12" cy="5" r="1.5"></circle>
                <circle cx="12" cy="19" r="1.5"></circle>
              </svg>
            </button>

            {/* Dropdown Menu */}
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-36 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-lg overflow-hidden py-1 z-50">
                <button
                  onClick={handleShare}
                  className="w-full text-left px-4 py-2 text-[13px] font-sans text-[#f1f1f1] hover:bg-[#262626] transition-colors"
                >
                  Share
                </button>
              <button
                onClick={handleDelete}
                className="w-full text-left px-4 py-2 text-[13px] font-sans text-[#ef4444] hover:bg-[#262626] transition-colors"
              >
                Delete
              </button>
            </div>
          )}
        </div>
        </div>
      )}

      {pipMode && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <button 
              onClick={() => {
                const channel = new BroadcastChannel('justme_pip')
                channel.postMessage({ type: 'RESIZE', width: 320, height: 520 })
                channel.close()
              }} 
              title="Small" 
              className="px-1.5 py-0.5 text-[11px] font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors"
            >
              S
            </button>
            <button 
              onClick={() => {
                const channel = new BroadcastChannel('justme_pip')
                channel.postMessage({ type: 'RESIZE', width: 420, height: 680 })
                channel.close()
              }} 
              title="Medium" 
              className="px-1.5 py-0.5 text-[11px] font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors"
            >
              M
            </button>
            <button 
              onClick={() => {
                const channel = new BroadcastChannel('justme_pip')
                channel.postMessage({ type: 'RESIZE', width: 520, height: 800 })
                channel.close()
              }} 
              title="Large" 
              className="px-1.5 py-0.5 text-[11px] font-medium border border-gray-300 rounded bg-white hover:bg-gray-50 transition-colors"
            >
              L
            </button>
          </div>
          <button onClick={() => window.close()} title="Close PiP" className="text-gray-400 hover:text-gray-600 text-[14px] px-1 font-sans">✕</button>
        </div>
      )}
    </div>
  )
}
