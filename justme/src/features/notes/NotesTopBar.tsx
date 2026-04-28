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


  return (
    <div className={`${pipMode ? 'h-[40px] min-h-[40px]' : 'h-[56px] md:h-[64px] min-h-[56px] md:min-h-[64px]'} bg-white px-4 md:px-6 flex items-center justify-between flex-shrink-0 border-b border-gray-100`}>
      {/* Left Side: Back Arrow + Icon + Title */}
      <div className="flex items-center gap-3 md:gap-4 min-w-0">
        {!pipMode && (
          <button 
            onClick={onBack} 
            className="w-[30px] h-[30px] md:w-[34px] md:h-[34px] flex items-center justify-center border-2 border-gray-900 rounded-lg text-gray-900 hover:bg-gray-50 transition-all active:scale-95 flex-shrink-0"
            aria-label="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}
        
        <div className="w-[30px] h-[30px] md:w-[34px] md:h-[34px] rounded-full flex items-center justify-center text-[12px] md:text-[14px] font-bold flex-shrink-0 bg-[#faeeda] text-[#854f0b] shadow-sm">
          {avatarLetter}
        </div>

        <div className="flex items-baseline gap-2 min-w-0">
          {isEditingTitle ? (
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
              className="font-serif text-[18px] md:text-[24px] font-bold text-gray-900 bg-transparent outline-none border-b-2 border-gray-900 pb-0.5 w-full max-w-[200px] md:max-w-[300px]"
            />
          ) : (
            <h1
              onClick={startEditing}
              className="font-serif text-[18px] md:text-[24px] font-bold text-gray-900 truncate max-w-[200px] md:max-w-[400px] cursor-text hover:opacity-80 transition-opacity"
            >
              {titleToShow}
            </h1>
          )}
        </div>
      </div>

      {/* Right Side: Options (Keeping subtle) */}
      {!pipMode && (
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsReadMode?.(!isReadMode)}
            className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all ${
              isReadMode 
                ? 'bg-gray-900 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {isReadMode ? 'Editing' : 'Previewing'}
          </button>
          
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1.5 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-50">
                <button onClick={handleDelete} className="w-full text-left px-4 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors">Delete Note</button>
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
