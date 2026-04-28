import React, { useState, useMemo } from 'react'
import { useNotesStore } from './useNotesStore'

interface NotesSidebarProps {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
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

  if (isSameDay(date, today)) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }
  if (isSameDay(date, yesterday))
    return 'Yesterday, ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function getNotePreview(content: any[]): string {
  if (!content || !Array.isArray(content)) return ''
  for (const node of content) {
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

function getTagColor(tag: string) {
  const lower = tag.toLowerCase()
  if (lower.includes('work')) return 'bg-blue-50 text-blue-600'
  if (lower.includes('personal')) return 'bg-emerald-50 text-emerald-600'
  if (lower.includes('home')) return 'bg-orange-50 text-orange-600'
  if (lower.includes('travel')) return 'bg-purple-50 text-purple-600'
  return 'bg-gray-50 text-gray-600'
}

function NoteCard({ note, isActive, onClick, onPin }: { note: any; isActive: boolean; onClick: () => void; onPin: () => void }) {
  const snippet = getNotePreview(note.content)
  const date = formatDate(note.updatedAt)

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={[
          'w-full text-left bg-white rounded-[16px] p-4 shadow-sm border-2 transition-all duration-200',
          isActive ? 'border-[#00aeb1] ring-4 ring-[#00aeb1]/5' : 'border-transparent hover:border-gray-100 hover:shadow-md',
        ].join(' ')}
      >
        <div className="flex justify-between items-start mb-1 gap-2">
          <h3 className="text-[15px] font-bold text-gray-900 leading-tight flex-1">
            {note.title || 'Untitled Note'}
          </h3>
          {note.tags?.[0] && (
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold whitespace-nowrap ${getTagColor(note.tags[0])}`}>
              #{note.tags[0]}
            </span>
          )}
        </div>
        <p className="text-[12px] text-gray-500 line-clamp-2 leading-relaxed mb-2">
          {snippet || 'No additional text'}
        </p>
        <div className="text-right">
          <span className="text-[11px] font-medium text-gray-400">{date}</span>
        </div>
      </button>

      <button
        onClick={e => { e.stopPropagation(); onPin() }}
        className={[
          'absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center transition-all active:scale-90 z-10',
          note.pinned ? 'text-amber-500 opacity-100' : 'text-gray-300 opacity-0 group-hover:opacity-100',
          isActive && !note.pinned ? 'opacity-100' : '',
        ].join(' ')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={note.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
          <path d="M21 10c0-1.1-.9-2-2-2h-3L14.45 2.5a1.99 1.99 0 0 0-3.37.7L9.55 8H6c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v7l1 1h8l1-1v-7h1c1.1 0 2-.9 2-2v-2z" />
        </svg>
      </button>
    </div>
  )
}

export default function NotesSidebar({ isOpen, setIsOpen }: NotesSidebarProps) {
  const { 
    notes, 
    activeNoteId, 
    setActiveNoteId, 
    createNote, 
    searchQuery, 
    setSearchQuery,
    togglePin 
  } = useNotesStore()

  const [activeTab, setActiveTab] = useState<'All' | 'Recent' | 'Pinned'>('All')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newNoteTitle, setNewNoteTitle] = useState('')

  const handleCreateConfirm = async () => {
    const trimmed = newNoteTitle.trim()
    if (trimmed) {
      await createNote(trimmed)
      setNewNoteTitle('')
      setShowCreateModal(false)
      if (window.innerWidth < 768) setIsOpen(false)
    }
  }

  const filteredNotes = useMemo(() => {
    let result = notes.filter(n => !n.title.startsWith('journal::'))

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        n => n.title.toLowerCase().includes(q) || getNotePreview(n.content).toLowerCase().includes(q)
      )
    }

    if (activeTab === 'Pinned') {
      result = result.filter(n => n.pinned)
    } else if (activeTab === 'Recent' && !searchQuery.trim()) {
      result = result.slice(0, 5)
    }

    return result
  }, [notes, searchQuery, activeTab])

  const pinnedNotes = filteredNotes.filter(n => n.pinned)
  const otherNotes = filteredNotes.filter(n => !n.pinned)

  return (
    <div 
      className={[
        'h-full bg-[#f8fafc] border-r border-gray-100 flex flex-col relative transition-all duration-300 ease-in-out',
        isOpen ? 'w-full md:w-[320px] opacity-100' : 'w-0 opacity-0 overflow-hidden border-none',
        'fixed inset-0 z-40 md:relative md:z-auto' // Full screen overlay on mobile
      ].join(' ')}
    >
      {/* Toggle Handle (only on desktop) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={[
          'hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-white border border-gray-100 rounded-full shadow-sm z-50 items-center justify-center text-[#00aeb1] hover:scale-110 active:scale-95 transition-all',
          !isOpen && 'rotate-180 left-3 shadow-md border-[#00aeb1]/20'
        ].join(' ')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      {/* SEARCH & FILTERS */}
      <div className="px-4 pt-4 pb-3 space-y-3 flex-shrink-0 w-full md:w-[320px]">
        {/* Header and Search in one line on mobile */}
        <div className="flex items-center gap-3">
           <h2 className="text-[18px] md:text-[20px] font-extrabold text-gray-900 flex-shrink-0">Notes</h2>
           
           <div className="relative flex-1 group">
             <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
               <circle cx="11" cy="11" r="8" />
               <path d="M21 21l-4.35-4.35" />
             </svg>
             <input
               type="text"
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               placeholder="Search..."
               className="w-full h-9 pl-9 pr-3 bg-white border border-gray-100 rounded-full text-[13px] text-gray-900 outline-none focus:border-[#00aeb1]/20 focus:ring-4 focus:ring-[#00aeb1]/5 transition-all"
             />
           </div>
        </div>

        <div className="flex items-center gap-1.5">
          {(['All', 'Recent', 'Pinned'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={[
                'px-4 py-1.5 rounded-full text-[12px] font-bold transition-all',
                activeTab === tab ? 'bg-[#00aeb1] text-white shadow-sm' : 'bg-white text-gray-400 hover:bg-gray-50',
              ].join(' ')}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto scroll-container px-6 py-4 space-y-6 w-full md:w-[380px]">
        {pinnedNotes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b">
                <path d="M21 10c0-1.1-.9-2-2-2h-3L14.45 2.5a1.99 1.99 0 0 0-3.37.7L9.55 8H6c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v7l1 1h8l1-1v-7h1c1.1 0 2-.9 2-2v-2z" />
              </svg>
              <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Pinned</span>
            </div>
            {pinnedNotes.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                isActive={activeNoteId === note.id}
                onPin={() => togglePin(note.id)}
                onClick={() => {
                  setActiveNoteId(note.id)
                  if (window.innerWidth < 768) setIsOpen(false)
                }}
              />
            ))}
          </div>
        )}

        <div className="space-y-3 pb-24">
          {otherNotes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isActive={activeNoteId === note.id}
              onPin={() => togglePin(note.id)}
              onClick={() => {
                setActiveNoteId(note.id)
                if (window.innerWidth < 768) setIsOpen(false)
              }}
            />
          ))}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="absolute bottom-10 right-6 w-14 h-14 bg-[#00aeb1] text-white rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center z-10"
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {/* NEW NOTE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div 
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-[28px] shadow-2xl p-6 animate-in zoom-in-95 slide-in-from-bottom-10 duration-300">
            <h3 className="text-[18px] font-bold text-gray-900 mb-4">Name your note</h3>
            <input
              autoFocus
              type="text"
              value={newNoteTitle}
              onChange={e => setNewNoteTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreateConfirm()
                if (e.key === 'Escape') setShowCreateModal(false)
              }}
              placeholder="E.g. Travel Plans"
              className="w-full h-12 px-5 bg-gray-50 border-2 border-transparent focus:border-[#00aeb1]/20 rounded-2xl outline-none text-[15px] transition-all mb-6"
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 h-12 rounded-2xl font-bold text-gray-400 hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateConfirm}
                className="flex-1 h-12 rounded-2xl bg-[#00aeb1] text-white font-bold shadow-lg shadow-[#00aeb1]/20 hover:scale-105 active:scale-95 transition-all"
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
