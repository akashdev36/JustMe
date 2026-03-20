import React, { useEffect, useState } from 'react'
import { useNotesStore } from './useNotesStore'
import NotesList from './NotesList'
import NotesEditor from './NotesEditor'
import ArticleReader from './ArticleReader'

export default function NotesPage(): React.ReactElement {
  const { loadNotes, isLoading, activeNoteId, notes } = useNotesStore()
  
  const [previewNoteId, setPreviewNoteId] = useState<string | null>(null)
  const [isReaderFullscreen, setIsReaderFullscreen] = useState(false)

  const [view, setView] = useState<'list' | 'note'>('list')
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list')

  useEffect(() => {
    if (notes.length > 0) {
      setPreviewNoteId(notes[0].id)
    }
  }, [notes])

  const previewNote = notes.find((n) => n.id === previewNoteId)

  useEffect(() => {
    loadNotes()
  }, [loadNotes])

  // Responsive view lock triggers
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
          {/* Subtle spinner */}
          <svg
            className="animate-spin h-4 w-4 text-gray-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Loading notes...
        </div>
      </div>
    )
  }



  return (
    <div className="flex h-full w-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* 1. Desktop Layout (Md and above) */}
      <div className="hidden md:flex flex-row w-full h-full">
        {!isReaderFullscreen && (
          view === 'list' ? (
            <div className="w-[420px] h-full flex flex-col flex-shrink-0 border-r border-[#e5e7eb]">
              <NotesList 
                onNoteSelect={(id) => { setView('note'); setPreviewNoteId(id); }} 
                onNotePreview={(id) => setPreviewNoteId(id)}
                onNoteCreate={() => setView('note')} 
              />
            </div>
          ) : (
            <div className="w-[420px] h-full flex flex-col flex-shrink-0 border-r border-[#e5e7eb]">
              <NotesEditor onBack={() => setView('list')} />
            </div>
          )
        )}

        {/* Right Panel: Article Reader (Always visible) */}
        <div className="flex-1 h-full flex flex-col">
          {/* Header Bar */}
          <div className="h-[52px] bg-white border-b border-[#e5e5e5] flex-shrink-0 flex items-center justify-end px-4">
            <button 
              onClick={() => setIsReaderFullscreen(!isReaderFullscreen)}
              className="w-7 h-7 flex items-center justify-center rounded-md border-none bg-transparent text-[#999] hover:text-[#333] transition-colors"
              title={isReaderFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isReaderFullscreen ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="4,14 10,14 10,20"/>
                  <polyline points="20,10 14,10 14,4"/>
                  <line x1="10" y1="14" x2="3" y2="21"/>
                  <line x1="21" y1="3" x2="14" y2="10"/>
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15,3 21,3 21,9"/>
                  <polyline points="9,21 3,21 3,15"/>
                  <line x1="21" y1="3" x2="14" y2="10"/>
                  <line x1="3" y1="21" x2="10" y2="14"/>
                </svg>
              )}
            </button>
          </div>
          
          {previewNote ? (
            <ArticleReader 
              content={previewNote.content} 
              isReaderFullscreen={isReaderFullscreen}
              onToggleFullscreen={() => setIsReaderFullscreen(!isReaderFullscreen)}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-sans bg-gray-50/50">
              Select a note to preview
            </div>
          )}
        </div>
      </div>

      {/* 2. Mobile Layout (Below md) */}
      <div className="flex md:hidden w-full h-full">
        {mobileView === 'list' ? (
          <div className="w-full h-full flex flex-col">
            <NotesList onNoteSelect={() => setMobileView('editor')} />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col">
            <NotesEditor onBack={() => setMobileView('list')} />
          </div>
        )}
      </div>
    </div>
  )
}
