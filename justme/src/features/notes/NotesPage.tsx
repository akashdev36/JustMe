import React, { useEffect, useState } from 'react'
import { useNotesStore } from './useNotesStore'
import NotesEditor from './NotesEditor'
import NotesTopBar from './NotesTopBar'
import NotesSidebar from './NotesSidebar'

export default function NotesPage(): React.ReactElement {
  const { 
    loadNotes, 
    isLoading, 
    activeNoteId, 
    setActiveNoteId,
    notes,
    isSaving 
  } = useNotesStore()

  const [notesListOpen, setNotesListOpen] = useState(true)

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  const activeNote = notes.find(n => n.id === activeNoteId)

  // Mobile Back Handler
  const handleBack = () => {
    setNotesListOpen(true) // Opening the list is the mobile "back" equivalent
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm bg-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-100 border-t-[#00aeb1] rounded-full animate-spin" />
          <p className="font-medium">Loading your notes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full bg-white overflow-hidden relative">
      {/* SECONDARY SIDEBAR: Notes List */}
      <NotesSidebar isOpen={notesListOpen} setIsOpen={setNotesListOpen} />

      {/* MAIN CONTENT: Editor or Empty State */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-[#f0f4f7]">
        {activeNote ? (
          <div className="flex-1 flex flex-col h-full min-w-0 bg-white">
            <NotesTopBar 
              noteTitle={activeNote.title}
              onBack={handleBack}
              isReadMode={false}
              setIsReadMode={() => {}} 
            />
            <div className="flex-1 overflow-hidden relative">
              <NotesEditor noteId={activeNote.id} />
              
              {/* SAVING INDICATOR */}
              {isSaving && (
                <div className="absolute top-4 right-6 z-20 flex items-center gap-2 bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-100 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="w-2 h-2 bg-[#00aeb1] rounded-full animate-pulse" />
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Saving</span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <h2 className="text-[20px] font-bold text-gray-900 mb-2">Select a note</h2>
            <p className="text-[15px] text-gray-500 max-w-[280px]">
              Choose a note from the list or create a new one to get started.
            </p>
            
            {/* Mobile-only open list button if somehow it's closed and no note is selected */}
            <button 
              onClick={() => setNotesListOpen(true)}
              className="md:hidden mt-6 px-6 py-3 bg-[#00aeb1] text-white rounded-full font-bold shadow-lg active:scale-95 transition-all"
            >
              Show Notes List
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
