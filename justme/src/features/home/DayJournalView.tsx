import React, { useEffect, useState } from 'react'
import { useNotesStore } from '../notes/useNotesStore'
import NotesEditor from '../notes/NotesEditor'
import ArticleReader from '../notes/ArticleReader'

interface DayJournalViewProps {
  dateStr: string // YYYY-MM-DD
  isToday: boolean
  onClose: () => void
}

export default function DayJournalView({ dateStr, isToday, onClose }: DayJournalViewProps): React.ReactElement {
  const { findJournalNote, createJournalNote, isLoading } = useNotesStore()
  const [journalNoteId, setJournalNoteId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const note = findJournalNote(dateStr)

  useEffect(() => {
    async function init() {
      if (note) {
        setJournalNoteId(note.id)
        setIsInitializing(false)
      } else if (isToday) {
        // Create new journal note for today
        const newId = await createJournalNote(dateStr)
        setJournalNoteId(newId)
        setIsInitializing(false)
      } else {
        // Not today and no note exists - should not happen if Home.tsx filters correctly
        setIsInitializing(false)
      }
    }
    init()
  }, [dateStr, isToday])

  // Format date for display
  const displayDate = new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  return (
    <div className="fixed inset-0 z-[70] bg-white flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* Header */}
      <div className="h-[60px] px-6 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 rounded-full hover:bg-gray-50 text-gray-500 transition-all active:scale-90"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[11px] font-bold text-[#00aeb1] uppercase tracking-widest leading-none mb-0.5">Daily Journal</span>
          <span className="text-[15px] font-bold text-gray-900 leading-none">{displayDate}</span>
        </div>
        <div className="w-10" /> {/* Spacer for symmetry */}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {isInitializing || (isToday && !journalNoteId) ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
            <div className="w-8 h-8 border-3 border-teal-100 border-t-[#00aeb1] rounded-full animate-spin" />
          </div>
        ) : journalNoteId && isToday ? (
          <NotesEditor noteId={journalNoteId} />
        ) : note ? (
          <div className="h-full overflow-y-auto">
             <ArticleReader content={note.content} embedded />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8 text-center">
             <p>No entry found for this date.</p>
          </div>
        )}
      </div>
    </div>
  )
}
