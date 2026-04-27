import React, { useState, useRef } from 'react'
import { useNotesStore } from './useNotesStore'
import ArticleReader from './ArticleReader'
import * as notesService from './notesService'

export default function NotesEditor({ noteId }: { noteId?: string }): React.ReactElement {
  const { activeNoteId: storeActiveId, notes, updateNote } = useNotesStore()
  const activeNote = notes.find((n) => n.id === (noteId || storeActiveId))
  const currentNoteId = noteId || storeActiveId
  const [inputText, setInputText] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!activeNote) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm font-sans">
        Select a note to preview
      </div>
    )
  }

  const messages = activeNote.content || []

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentNoteId) return

    setIsUploading(true)
    try {
      const fileId = await notesService.uploadImage(file)
      
      const newImageNode = {
        type: 'image',
        fileId,
        url: '', // We'll fetch this authenticated in the reader
        caption: '',
        children: [{ text: '' }],
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }

      const updatedContent = [...messages, newImageNode]
      updateNote(currentNoteId, { content: updatedContent as any })
    } catch (err) {
      console.error('Upload failed', err)
      alert('Failed to upload image to Google Drive')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSend = () => {
    const trimmed = inputText.trim()
    if (!trimmed) return

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const lines = trimmed.split('\n').map(l => l.trim()).filter(l => l.length > 0)

    const newMessages = lines.map(line => {
      let type: any = 'paragraph'
      let content = line

      // 1. Identify Blocks
      if (content.startsWith('# ')) {
        type = 'heading-one'
        content = content.slice(2)
      } else if (content.startsWith('## ')) {
        type = 'heading-two'
        content = content.slice(3)
      } else if (content.startsWith('> ')) {
        type = 'blockquote'
        content = content.slice(2)
      } else if (content.startsWith('- ')) {
        type = 'list-item'
        content = content.slice(2)
      }

      // 2. Parse Inline Marks (basic parser)
      const parts = content.split(/(\*\*.*?\*\*|\*.*?\*)/g)
      const children = parts.map(part => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return { text: part.slice(2, -2), bold: true }
        }
        if (part.startsWith('*') && part.endsWith('*')) {
          return { text: part.slice(1, -1), italic: true }
        }
        return { text: part }
      }).filter(p => p.text !== '')

      return {
        type,
        children: children.length > 0 ? children : [{ text: '' }],
        timestamp
      }
    })

    const updatedContent = [...messages, ...newMessages]
    updateNote(currentNoteId!, { content: updatedContent as any })
    setInputText('')

    if (inputRef.current) {
      inputRef.current.style.height = '40px'
      inputRef.current.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const textarea = e.currentTarget
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
      return
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      const cursorPos = textarea.selectionStart
      const value = textarea.value
      const lineStart = value.lastIndexOf('\n', cursorPos - 1) + 1
      const currentLine = value.slice(lineStart, cursorPos)
      const isBulletLine = currentLine.startsWith('- ')
      const isEmptyBullet = currentLine === '- '

      if (isBulletLine) {
        e.preventDefault()
        if (isEmptyBullet) {
          const newValue = value.slice(0, lineStart).replace(/\n$/, '')
          setInputText(newValue)
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.style.height = 'auto'
              inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
              inputRef.current.setSelectionRange(newValue.length, newValue.length)
            }
          }, 0)
        } else {
          const insertion = '\n- '
          const newValue = value.slice(0, cursorPos) + insertion + value.slice(cursorPos)
          setInputText(newValue)
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.style.height = 'auto'
              inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + 'px'
              const newCursor = cursorPos + insertion.length
              inputRef.current.setSelectionRange(newCursor, newCursor)
            }
          }, 0)
        }
        return
      }
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white relative" style={{ fontFamily: "'Lora', serif" }}>
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto scroll-container py-6 md:py-10 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-4xl mx-auto px-6 w-full min-h-full">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-8 text-center">
              <div className="w-14 h-14 rounded-full bg-[#f0fdf4] flex items-center justify-center mb-6">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              </div>
              <p className="text-[16px] text-[#999] font-normal tracking-tight">Your story starts here...</p>
              <p className="text-[13px] text-[#ccc] mt-2">Just start typing below</p>
            </div>
          ) : (
            <ArticleReader
              content={activeNote.content}
              embedded
              onUpdateNote={(newContent) => updateNote(currentNoteId!, { content: newContent as any })}
            />
          )}
        </div>
      </div>

      {/* Bottom Input Area */}
      <div className="flex-shrink-0 pb-4 md:pb-10 w-full">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div className="w-full bg-white rounded-[24px] border border-[#e5e5e5] shadow-[0_5px_20px_rgba(0,0,0,0.05)] transition-all duration-300 flex items-end">
            
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleImageUpload}
            />

            {/* Plus Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`flex-shrink-0 w-[40px] h-[40px] mb-1 ml-1 flex items-center justify-center rounded-full transition-all ${isUploading ? 'bg-gray-100' : 'hover:bg-gray-100 text-gray-500'}`}
              title="Upload image"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-[#d97757] rounded-full animate-spin" />
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
              )}
            </button>

            <textarea
              ref={inputRef}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value)
                e.target.style.height = 'auto'
                e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px'
              }}
              onKeyDown={handleKeyDown}
              placeholder="Type a note..."
              rows={1}
              className="flex-1 resize-none min-h-[48px] px-3 pt-3 pb-2 font-serif text-[16px] md:text-[21px] leading-[1.6] text-[#292929] placeholder-gray-400 outline-none bg-transparent"
            />
            
            <div className="flex items-center justify-end px-4 pb-3">
              <button
                onClick={handleSend}
                type="button"
                className="w-[34px] h-[34px] flex items-center justify-center rounded-xl bg-[#d97757] hover:bg-[#c2623e] transition-all active:scale-95 text-white shadow-sm"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
