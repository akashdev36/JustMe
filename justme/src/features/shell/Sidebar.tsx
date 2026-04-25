import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../auth/useAuthStore'
import { useNotesStore } from '../notes/useNotesStore'

interface SidebarProps {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
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
  if (isSameDay(date, yesterday)) return 'Yesterday, ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

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

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
}: SidebarProps): React.ReactElement {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const { notes, activeNoteId, setActiveNoteId, createNote, updateNote } = useNotesStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'All' | 'Recent' | 'Pinned'>('All')
  const [showProfileMenu, setShowProfileMenu] = useState(false)

  const filteredNotes = useMemo(() => {
    let result = [...notes]

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(n => 
        (n.title.toLowerCase().includes(q) || 
        getNotePreview(n.content).toLowerCase().includes(q)) &&
        !n.title.startsWith('journal::')
      )
    } else {
      result = result.filter(n => !n.title.startsWith('journal::'))
    }

    if (activeTab === 'Pinned') {
      result = result.filter(n => n.pinned)
    } else if (activeTab === 'Recent') {
      // Sort by updatedAt, already done in store, but maybe filter by "last 24h" or just top 5
      result = result.slice(0, 5)
    }

    return result
  }, [notes, searchQuery, activeTab])

  const pinnedNotes = filteredNotes.filter(n => n.pinned)
  const otherNotes = filteredNotes.filter(n => !n.pinned)

  const handleSignOut = () => {
    logout()
    navigate('/')
  }

  const handleCreateNote = async () => {
    await createNote()
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  const sidebarWidth = sidebarOpen ? 'w-full md:w-[380px]' : 'w-0 invisible'

  return (
    <>
      {/* Mobile overlay - subtle blur */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/5 md:hidden backdrop-blur-[2px]"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'h-full bg-[#f0f4f7] border-r border-gray-100 flex flex-col',
          'transition-all duration-300 ease-in-out overflow-hidden',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          'fixed inset-y-0 left-0 z-50 md:relative md:z-auto',
          sidebarWidth
        ].join(' ')}
      >
        <div className="flex flex-col h-full w-full md:w-[380px] relative">
          
          {/* HEADER */}
          <div className="pt-6 pb-4 px-6 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="text-[28px] font-bold text-gray-900 leading-none" style={{ fontFamily: "'Lora', serif" }}>
                JustMe
              </h1>
            </div>
            <div className="relative">
               <button 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="w-10 h-10 rounded-full border-2 border-[#00aeb1] p-0.5 overflow-hidden active:scale-95 transition-transform"
               >
                  <div className="w-full h-full rounded-full bg-teal-50 flex items-center justify-center text-[#00aeb1] font-bold text-sm uppercase">
                    {user?.email?.charAt(0) || 'J'}
                  </div>
              </button>
              
              {/* Profile Dropdown Menu */}
              {showProfileMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowProfileMenu(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-gray-50 mb-1">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Account</p>
                      <p className="text-[13px] font-medium text-gray-900 truncate">{user?.email}</p>
                    </div>
                    <button 
                      onClick={() => {
                        setShowProfileMenu(false)
                        handleSignOut()
                      }} 
                      className="w-full text-left px-4 py-2 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SEARCH & FILTERS */}
          <div className="px-6 py-2 space-y-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 group">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes..."
                  className="w-full h-12 pl-12 pr-4 bg-[#e7edf2] border-transparent rounded-[20px] text-[15px] text-gray-900 outline-none shadow-none focus:bg-white focus:ring-2 focus:ring-[#00aeb1]/20 transition-all placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {['All', 'Recent', 'Pinned'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={[
                    'px-5 py-2 rounded-full text-[14px] font-bold transition-all',
                    activeTab === tab 
                      ? 'bg-[#00aeb1] text-white shadow-md' 
                      : 'bg-white text-gray-500 hover:bg-gray-50'
                  ].join(' ')}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* LIST */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6 [&::-webkit-scrollbar]:hidden">
            
            {/* PINNED SECTION */}
            {pinnedNotes.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-1">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="#f59e0b" stroke="#f59e0b">
                    <path d="M21 10c0-1.1-.9-2-2-2h-3L14.45 2.5a1.99 1.99 0 0 0-3.37.7L9.55 8H6c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v7l1 1h8l1-1v-7h1c1.1 0 2-.9 2-2v-2z" />
                  </svg>
                  <span className="text-[11px] font-extrabold text-gray-400 uppercase tracking-widest">Pinned</span>
                </div>
                {pinnedNotes.map((note) => (
                   <NoteCard 
                    key={note.id} 
                    note={note} 
                    isActive={activeNoteId === note.id} 
                    onPin={() => updateNote(note.id, { pinned: !note.pinned })}
                    onClick={() => {
                      setActiveNoteId(note.id)
                      if (window.innerWidth < 768) setSidebarOpen(false)
                    }}
                  />
                ))}
              </div>
            )}

            {/* GENERAL SECTION */}
            <div className="space-y-3 pb-24">
              <h2 className="text-[20px] font-bold text-gray-900 px-1">Notes</h2>
              {otherNotes.length === 0 && pinnedNotes.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-400 text-sm italic">No notes found.</p>
                </div>
              ) : (
                otherNotes.map((note) => (
                  <NoteCard 
                    key={note.id} 
                    note={note} 
                    isActive={activeNoteId === note.id} 
                    onPin={() => updateNote(note.id, { pinned: !note.pinned })}
                    onClick={() => {
                      setActiveNoteId(note.id)
                      if (window.innerWidth < 768) setSidebarOpen(false)
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* FAB */}
          <button
            onClick={handleCreateNote}
            className="absolute bottom-28 md:bottom-8 right-6 w-[60px] h-[60px] rounded-full bg-[#00aeb1] text-white flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all z-20 group"
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  )
}

function NoteCard({ note, isActive, onClick, onPin }: { note: any, isActive: boolean, onClick: () => void, onPin: () => void }) {
  const snippet = getNotePreview(note.content)
  const date = formatDate(note.updatedAt)

  // Random color for mock tags if none exist
  const tagColorClass = note.tags?.[0] ? getTagColor(note.tags[0]) : 'bg-emerald-50 text-emerald-600'
  const tagName = note.tags?.[0] || 'Work' // Mock 'Work' for demo

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={[
          'w-full text-left bg-white rounded-[24px] p-5 shadow-sm border-2 transition-all duration-200',
          isActive ? 'border-[#00aeb1] ring-4 ring-[#00aeb1]/5' : 'border-transparent hover:border-gray-100 hover:shadow-md'
        ].join(' ')}
      >
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="text-[16px] font-bold text-gray-900 leading-tight flex-1">
            {note.title || 'Untitled Note'}
          </h3>
          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${tagColorClass}`}>
            #{tagName}
          </span>
        </div>
        <p className="text-[13px] text-gray-500 line-clamp-2 leading-relaxed mb-3">
          {snippet || 'No additional text'}
        </p>
        <div className="text-right">
          <span className="text-[11px] font-medium text-gray-400">{date}</span>
        </div>
      </button>

      {/* Pin Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onPin()
        }}
        className={[
          'absolute -top-1 -right-1 w-8 h-8 rounded-full bg-white shadow-md border border-gray-100 flex items-center justify-center transition-all active:scale-90 z-10',
          note.pinned ? 'text-amber-500 opacity-100' : 'text-gray-300 opacity-0 group-hover:opacity-100 group-active:opacity-100',
          isActive && !note.pinned ? 'opacity-100' : ''
        ].join(' ')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill={note.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2.5">
          <path d="M21 10c0-1.1-.9-2-2-2h-3L14.45 2.5a1.99 1.99 0 0 0-3.37.7L9.55 8H6c-1.1 0-2 .9-2 2v2c0 1.1.9 2 2 2h1v7l1 1h8l1-1v-7h1c1.1 0 2-.9 2-2v-2z" />
        </svg>
      </button>
    </div>
  )
}

function getTagColor(tag: string) {
  const lower = tag.toLowerCase()
  if (lower.includes('work')) return 'bg-blue-50 text-blue-600'
  if (lower.includes('personal')) return 'bg-emerald-50 text-emerald-600'
  if (lower.includes('home')) return 'bg-orange-50 text-orange-600'
  if (lower.includes('travel')) return 'bg-purple-50 text-purple-600'
  return 'bg-gray-50 text-gray-600'
}
