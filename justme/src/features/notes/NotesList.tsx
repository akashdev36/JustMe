import React, { useState, useRef, useEffect } from 'react'
import { useNotesStore } from './useNotesStore'

interface NotesListProps {
  onNoteSelect?: (id: string) => void
  onNotePreview?: (id: string) => void
  onNoteCreate?: () => void
  isPopup?: boolean
}

function formatDate(dateString: string): string {
  if (!dateString) return ''
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()

  if (isSameDay(date, today)) return 'Today'
  if (isSameDay(date, yesterday)) return 'Yesterday'

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function getNotePreview(content: any[]): string {
  if (!content || !Array.isArray(content)) return ''
  for (const node of content) {
    // If paragraph or element node
    if (node.children) {
      for (const child of node.children) {
        if (child.text && child.text.trim() !== '') {
          return child.text.trim()
        }
      }
    }
  }
  return ''
}

function getAvatarBgColor(title: string): string {
  const char = title.trim() === '' ? 'U' : title.trim().charAt(0).toUpperCase()
  // Mapping letters to avoid Pink for 'U' as requested (O-U gets Amber)
  if (char >= 'A' && char <= 'G') return 'bg-[#d8f3dc] text-[#1b4332]'
  if (char >= 'H' && char <= 'N') return 'bg-[#e8f4fd] text-[#185fa5]'
  if (char >= 'O' && char <= 'U') return 'bg-[#faeeda] text-[#854f0b]'
  return 'bg-[#fbeaf0] text-[#993556]'
}

export default function NotesList({ onNoteSelect, onNotePreview, onNoteCreate }: NotesListProps): React.ReactElement {
  const { notes, activeNoteId, createNote, setActiveNoteId } = useNotesStore()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredNotes = searchQuery.trim() === ''
    ? notes
    : notes.filter((note) => {
        const q = searchQuery.toLowerCase()
        const titleMatch = note.title?.toLowerCase().includes(q)
        const contentMatch = note.content?.some((node: any) =>
          node.children?.some((leaf: any) =>
            leaf.text?.toLowerCase().includes(q)
          )
        )
        return titleMatch || contentMatch
      })

  useEffect(() => {
    if (isModalOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isModalOpen])

  const handleCreateClick = () => {
    setNewNoteTitle('')
    setIsModalOpen(true)
  }

  const handleConfirmCreate = async () => {
    const title = newNoteTitle.trim() || 'Untitled'
    await createNote(title)
    setIsModalOpen(false)
    onNoteCreate?.()
  }

  const handleCancelCreate = () => {
    setIsModalOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleConfirmCreate()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelCreate()
    }
  }

  const handleSelect = (id: string) => {
    setActiveNoteId(id)
    onNoteSelect?.(id)
  }

  return (
    <div className="flex flex-col h-full w-full bg-white flex-shrink-0">
      {/* Top Bar */}
      <div className="px-4 py-3 flex items-center justify-between bg-white flex-shrink-0">
        <span className="text-[11px] font-medium text-gray-400 tracking-wider font-sans">
          NOTES
        </span>
        <button
          type="button"
          onClick={handleCreateClick}
          className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#2d6a4f] text-white hover:bg-[#1b4332] transition-colors"
          aria-label="New Note"
        >
          {/* Plus Icon */}
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Search Bar */}
      <div className="px-4 pb-2 flex-shrink-0">
        <div className="relative flex items-center h-[34px]">
          <svg className="absolute left-3 w-3.5 h-3.5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full h-full pl-9 pr-8 border border-gray-200 bg-gray-50/50 rounded-lg text-[13px] text-gray-700 outline-none focus:border-[#2d6a4f] font-sans"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 text-gray-400 hover:text-gray-600 cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* List content - Scrollable */}
      <div className="flex-1 overflow-y-auto px-2">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2">
            <p className="text-gray-400 text-sm font-sans">No notes yet</p>
            <button
              onClick={handleCreateClick}
              type="button"
              className="text-emerald-600 hover:text-emerald-700 text-sm font-medium font-sans"
            >
              New note
            </button>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <span className="text-[13px] text-gray-400 font-sans font-medium">No notes match</span>
            <span className="text-[11px] text-gray-400/80 font-sans italic mt-1">"{searchQuery}"</span>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {filteredNotes.map((note) => {
              const isActive = note.id === activeNoteId
              const titleToShow = note.title.trim() === '' ? 'Untitled' : note.title
              const previewText = getNotePreview(note.content)
              const avatarLetter = titleToShow.charAt(0).toUpperCase()
              const avatarBg = getAvatarBgColor(titleToShow)

              return (
                <button
                  key={note.id}
                  type="button"
                  onClick={() => handleSelect(note.id)}
                  className={[
                    'w-full text-left p-[10px_12px] rounded-lg cursor-pointer flex items-center justify-between gap-3 transition-colors border border-transparent group',
                    isActive
                      ? 'bg-[#f0faf4] border-l-2 border-l-[#2d6a4f] border-gray-100'
                      : 'hover:bg-gray-50 hover:border-gray-100',
                  ].join(' ')}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Left: Avatar */}
                    <div className={`w-[26px] h-[26px] rounded-full flex items-center justify-center text-[11px] font-medium flex-shrink-0 ${avatarBg}`}>
                      {avatarLetter}
                    </div>

                    {/* Right: Info */}
                    <div className="min-w-0 flex-1 flex flex-col gap-0.5">
                      <span className="text-[13px] font-medium text-gray-900 truncate font-sans">
                        {titleToShow}
                      </span>
                      {previewText && (
                        <span className="text-[12px] text-[#888] truncate font-sans">
                          {previewText}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400 font-sans">
                        {formatDate(note.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Eye Icon */}
                  <div 
                    onClick={(e) => {
                      e.stopPropagation()
                      onNotePreview?.(note.id)
                    }}
                    className="opacity-0 group-hover:opacity-50 hover:opacity-100 text-gray-400 hover:text-gray-600 flex-shrink-0 transition-opacity cursor-pointer p-1"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-xl shadow-lg p-5 w-80 max-w-[90vw] border border-gray-100 transform transition-all">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 font-sans">New Note</h3>
            <input
              ref={inputRef}
              type="text"
              value={newNoteTitle}
              onChange={(e) => setNewNoteTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Note name..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2d6a4f]/20 focus:border-[#2d6a4f] transition-all mb-4 font-sans"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelCreate}
                className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors font-sans"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCreate}
                className="px-4 py-2 text-sm font-medium text-white bg-[#2d6a4f] rounded-lg hover:bg-[#1b4332] transition-colors font-sans"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
