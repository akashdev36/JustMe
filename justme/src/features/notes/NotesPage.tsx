import React, { useEffect, useState } from 'react'
import { useNotesStore } from './useNotesStore'
import NotesList from './NotesList'
import NotesEditor from './NotesEditor'

export default function NotesPage(): React.ReactElement {
  const { loadNotes, isLoading, activeNoteId } = useNotesStore()
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list')

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  useEffect(() => {
    if (activeNoteId) {
      setMobileView('editor')
    } else {
      setMobileView('list')
    }
  }, [activeNoteId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        <div className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Loading notes...
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden">

      {/* ── Desktop Layout (md and above) ── */}
      <div className="hidden md:flex flex-row w-full h-full">
        {/* Right: Document Editor — now the only column next to the sidebar */}
        <div className="flex-1 h-full flex flex-col min-w-0">
          <NotesEditor />
        </div>
      </div>

      {/* ── Mobile Layout (below md) ── */}
      <div className="flex md:hidden w-full h-full">
        {mobileView === 'list' ? (
          <div className="w-full h-full flex flex-col">
            <NotesList onNoteSelect={() => setMobileView('editor')} />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            <NotesEditor />
          </div>
        )}
      </div>

    </div>
  )
}
