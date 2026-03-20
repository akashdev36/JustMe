import React, { useState, useRef, useEffect } from 'react'
import { useNotesStore } from './useNotesStore'
import NotesTopBar from './NotesTopBar'
import ArticleReader from './ArticleReader'

export default function NotesEditor({ onBack, pipMode }: { onBack?: () => void, pipMode?: boolean }): React.ReactElement {
  const { activeNoteId, notes, updateNote } = useNotesStore()
  const activeNote = notes.find((n) => n.id === activeNoteId)
  const [inputText, setInputText] = useState('')
  const [isReadMode, setIsReadMode] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [swipedId, setSwipedId] = useState<string | null>(null)
  const [dragStartX, setDragStartX] = useState<number | null>(null)
  const [dragX, setDragX] = useState<number>(0)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)

  const messages = activeNote?.content || []

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Scroll when messages change
  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Scroll when note changes
  useEffect(() => {
    scrollToBottom()
  }, [activeNoteId])

  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (dragStartX === null) return
      const diff = dragStartX - e.clientX
      setDragX(diff) // allow full drag range
    }

    const handleGlobalMouseUp = (e: MouseEvent) => {
      if (dragStartX === null) return

      if (dragX > 60) {
        setDragX(80) // reveal
      } else if (dragX < -30) {
        setDragX(0)
        setSwipedId(null) // snap back / close
      } else if (Math.abs(dragX) < 10) {
        setDragX(0)
        setSwipedId(null) // treat as click / close if open
      } else {
        setDragX(0)
        setSwipedId(null)
      }
      setDragStartX(null)
    }

    if (dragStartX !== null) {
      window.addEventListener('mousemove', handleGlobalMouseMove)
      window.addEventListener('mouseup', handleGlobalMouseUp)
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove)
      window.removeEventListener('mouseup', handleGlobalMouseUp)
    }
  }, [dragStartX, dragX])

  useEffect(() => {
    if (!pipMode) return

    const handleKeydown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleKeydown)

    return () => {
      window.removeEventListener('keydown', handleKeydown)
    }
  }, [pipMode])

  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-sans">
        Select a note to preview
      </div>
    )
  }

  const handleChipClick = (prefix: string) => {
    const stripped = inputText
      .replace(/^#{1,2}\s/, '')
      .replace(/^-\s/, '')
      .replace(/^>\s/, '')
      .replace(/^\*\*\s/, '')
      .replace(/^`/, '')

    const newValue = `${prefix}${prefix.endsWith(' ') || prefix === '`' ? '' : ' '}${stripped.trimStart()}`
    setInputText(newValue)

    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus()
        const len = inputRef.current.value.length
        inputRef.current.setSelectionRange(len, len)
      }
    }, 0)
  }



  const getBadge = (text: string) => {
    if (text.startsWith('# ')) return 'TITLE'
    if (text.startsWith('## ')) return 'HEADING'
    if (text.startsWith('- ')) return 'BULLET'
    if (text.startsWith('> ')) return 'QUOTE'
    if (text.startsWith('** ')) return 'B BOLD'
    if (text.startsWith('`')) return '<> CODE'
    return null
  }

  const handleSend = () => {
    const text = inputText.trim()
    if (!text) return

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const newMessage = {
      type: 'paragraph' as const,
      children: [{ text }],
      timestamp, // Custom property saved directly on Slate Element node
    }

    const updatedContent = [...messages, newMessage]
    updateNote(activeNoteId!, { content: updatedContent as any })
    setInputText('')
    
    if (inputRef.current) {
      inputRef.current.style.height = '40px'
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f5f5f5] relative font-['Inter', sans-serif]">
      <NotesTopBar 
        noteTitle={activeNote.title} 
        onBack={onBack || (() => { })} 
        pipMode={pipMode} 
        isReadMode={isReadMode}
        setIsReadMode={setIsReadMode}
      />

      {isReadMode && (
        <div className="flex-1 overflow-y-auto">
          <ArticleReader content={activeNote.content} />
        </div>
      )}

      {!isReadMode && (
        <>
          {/* Markdown Shortcut Bar */}
          <div className={`p-[4px_12px] flex items-center gap-1 border-t border-b ${pipMode ? 'border-[#f0f0f0] bg-[#fafafa]' : 'border-[#e5e5e5] bg-white'} flex-shrink-0 animate-fadeIn`}>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => handleChipClick('#')}
            className="px-[7px] py-[2px] border border-[#dddddd] rounded-[20px] bg-white text-[10px] text-[#444] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#f9f9f9]"
          >
            # Title
          </button>
          <button
            type="button"
            onClick={() => handleChipClick('##')}
            className="px-[7px] py-[2px] border border-[#dddddd] rounded-[20px] bg-white text-[10px] text-[#444] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#f9f9f9]"
          >
            ## Heading
          </button>
          <button
            type="button"
            onClick={() => handleChipClick('-')}
            className="px-[7px] py-[2px] border border-[#dddddd] rounded-[20px] bg-white text-[10px] text-[#444] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#f9f9f9]"
          >
            - Bullet
          </button>
          <button
            type="button"
            onClick={() => handleChipClick('>')}
            className="px-[7px] py-[2px] border border-[#dddddd] rounded-[20px] bg-white text-[10px] text-[#444] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#f9f9f9]"
          >
            &gt; Quote
          </button>
          <button
            type="button"
            onClick={() => handleChipClick('**')}
            className="px-[7px] py-[2px] border border-[#dddddd] rounded-[20px] bg-white text-[10px] text-[#444] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#f9f9f9]"
          >
            ** Bold
          </button>
          <button
            type="button"
            onClick={() => handleChipClick('`')}
            className="px-[7px] py-[2px] border border-[#dddddd] rounded-[20px] bg-white text-[10px] text-[#444] cursor-pointer whitespace-nowrap transition-colors hover:bg-[#f9f9f9]"
          >
            ` Code
          </button>
        </div>
      </div>

      {/* 1. Scrollable Messages Area */}
      <div
        onClick={() => setSwipedId(null)}
        className="flex-1 overflow-y-auto p-[16px_12px] flex flex-col gap-3 bg-[#f5f5f5] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] cursor-default"
      >
        {messages
          .filter((msg: any) => (msg.children?.[0]?.text || '').trim() !== '')
          .map((msg: any, index: number) => {
            const text = msg.children?.[0]?.text || ''
            const isRight = index % 2 === 0 // 1st is Index 0 -> Right
            const timestamp = msg.timestamp || 'Just now'

            const badge = getBadge(text)
            const id = `msg-${index}`
            const isSwiped = swipedId === id

            return (
              <div key={index} className={`relative overflow-hidden w-full flex flex-col flex-shrink-0 ${isRight ? 'items-end' : 'items-start'}`}>
                {isSwiped && (
                  <div style={{
                    position: 'absolute', right: 0, top: 0, bottom: 0,
                    width: '80px', display: 'flex', alignItems: 'center',
                    justifyContent: 'flex-end', gap: '8px', paddingRight: '12px',
                    zIndex: 0
                  }}>
                    <button
                      onClick={() => {
                        setEditingId(id)
                        setEditDraft(text)
                        setSwipedId(null)
                        setDragX(0)
                      }}
                      className="text-[#888] hover:text-[#bbb] flex-shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => {
                        setConfirmDeleteId(id)
                        setSwipedId(null)
                        setDragX(0)
                      }}
                      className="text-[#e07070] hover:text-[#ff4d4d] flex-shrink-0"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                )}

                {confirmDeleteId === id ? (
                  <div className="bg-[#1e1e1e] border border-[#2a2a2a] text-[#d1d5db] text-[11px] p-2 px-3 rounded-lg flex items-center gap-2 m-1 animate-fadeIn">
                    <span>Delete message?</span>
                    <button onClick={() => setConfirmDeleteId(null)} className="text-[#888] hover:text-[#f1f1f1] px-1">Cancel</button>
                    <button onClick={() => {
                      const updated = [...messages]
                      updated.splice(index, 1)
                      updateNote(activeNoteId!, { content: updated as any })
                      setConfirmDeleteId(null)
                    }} className="text-[#ef4444] font-medium px-1">Delete</button>
                  </div>
                ) : (
                  <div
                    style={{
                      transform: isSwiped ? `translateX(-${dragX}px)` : undefined,
                      transition: 'transform 0.2s ease'
                    }}
                    className={`flex flex-col ${isRight ? 'items-end' : 'items-start'} transition-transform duration-200 w-full z-10 cursor-pointer`}
                    onMouseDown={(e) => {
                      setDragStartX(e.clientX)
                      setSwipedId(id)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Timestamp Above */}
                    <span className="text-[11px] text-[#aaaaaa] mb-1 px-1 self-end">
                      {timestamp}
                    </span>

                    {badge && (
                      <span className="text-[10px] font-semibold text-[#999999] uppercase tracking-[0.08em] mb-1 select-none">
                        {badge}
                      </span>
                    )}
                    <div
                      className={`p-3 max-w-[70%] text-[14px] leading-[1.5] bg-white text-[#111111] border-[0.5px] border-[#e0e0e0] shadow-[0_1px_2px_rgba(0,0,0,0.06)] ${isRight
                        ? 'rounded-[18px_18px_4px_18px]'
                        : 'rounded-[18px_18px_18px_4px]'
                        }`}
                    >
                      {editingId === id ? (
                        <input
                          value={editDraft}
                          onChange={(e) => setEditDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const updated = [...messages]
                              updated[index] = { ...updated[index], children: [{ text: editDraft }] } as any
                              updateNote(activeNoteId!, { content: updated as any })
                              setEditingId(null)
                            } else if (e.key === 'Escape') setEditingId(null)
                          }}
                          autoFocus
                          className="bg-transparent border-none outline-none text-current w-full p-0 m-0"
                        />
                      ) : (
                        text
                      )}
                    </div >
                  </div>
                )}
              </div>
            )
          })}
        <div ref={messagesEndRef} />
      </div>

      {/* 2. Fixed Input Bar */}
      <div className={`p-[12px_16px] flex items-center gap-2 flex-shrink-0 border-t-0 ${pipMode ? 'bg-[#f5f5f5]' : 'bg-[#ffffff]'}`}>
        <textarea
          ref={inputRef}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value)
            e.target.style.height = 'auto'
            e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a note..."
          rows={1}
          className={`flex-1 resize-none overflow-y-auto min-h-[40px] max-h-[120px] border-[1.5px] border-[#22c55e] rounded-[20px] px-4 py-2 text-[13px] font-['Inter'] leading-[1.4] outline-none bg-[#ffffff] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]`}
        />
        <button
          onClick={handleSend}
          type="button"
          className="w-[44px] h-[44px] rounded-full bg-[#22c55e] shadow-[0_1px_3px_rgba(0,0,0,0.2)] flex items-center justify-center text-white transition-colors flex-shrink-0"
          aria-label="Send"
        >
          <svg className="w-5 h-5 translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
      </>
      )}

      {pipMode && (
        <div style={{
          textAlign: 'center',
          fontSize: '10px',
          color: '#aaa',
          padding: '4px 0 8px',
          background: '#fff'
        }}>
          Floating · resize from edges
        </div>
      )}
    </div>
  )
}
