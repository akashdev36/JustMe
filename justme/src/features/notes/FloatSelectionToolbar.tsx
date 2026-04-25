import React, { useState, useRef, useEffect } from 'react'

interface FloatSelectionToolbarProps {
  position: { top: number; left: number }
  isVisible: boolean
  isEditing: boolean
  setIsEditing: (val: boolean) => void
  onFormat: (type: 'bold' | 'italic' | 'h1' | 'h2' | 'quote' | 'link' | 'comment' | 'delete' | 'edit' | 'list', value?: string) => void
  selectedText: string
}

export default function FloatSelectionToolbar({
  position,
  isVisible,
  isEditing,
  setIsEditing,
  onFormat,
  selectedText
}: FloatSelectionToolbarProps) {
  const [editText, setEditText] = useState(selectedText)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing) {
      setEditText(selectedText)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isEditing, selectedText])

  const handleSaveEdit = () => {
    onFormat('edit', editText)
  }

  if (!isVisible) return null

  return (
    <div
      className="fixed z-[100] transition-opacity duration-200 animate-fadeIn pointer-events-auto"
      style={{
        top: position.top,
        left: position.left,
        transform: 'translate(-50%, -100%) translateY(-12px)'
      }}
    >
      <div className="bg-[#262626] rounded-xl shadow-2xl flex items-center p-1.5 gap-0.5 relative">
        {isEditing ? (
          <div className="flex items-center gap-1 px-1">
            <input
              ref={inputRef}
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit()
                if (e.key === 'Escape') setIsEditing(false)
              }}
              className="bg-transparent text-white text-[14px] outline-none border-none w-[180px] px-2 py-1 font-serif"
              placeholder="Edit selection..."
            />
            <button 
              onClick={handleSaveEdit}
              className="p-1 px-2 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <Button onClick={() => onFormat('bold')} title="Bold">
              <span className="font-bold text-[15px] text-white tracking-tight">B</span>
            </Button>
            <Button onClick={() => onFormat('italic')} title="Italic">
              <span className="italic font-serif text-[16px] text-white">i</span>
            </Button>
            <Button onClick={() => setIsEditing(true)} title="Edit Selection">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </Button>

            <Divider />

            <Button onClick={() => onFormat('list')} title="Bullet List">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </Button>

            <Divider />

            <Button onClick={() => onFormat('h1')} title="Large Heading">
              <span className="text-[17px] font-bold text-white">T</span>
            </Button>
            <Button onClick={() => onFormat('h2')} title="Small Heading">
              <span className="text-[13px] font-bold text-white">T</span>
            </Button>
            <Button onClick={() => onFormat('quote')} title="Quote">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="white">
                <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V14C14.017 14.5523 13.5693 15 13.017 15H12.017C11.4647 15 11.017 14.5523 11.017 14V9C11.017 7.34315 12.3601 6 14.017 6H19.017C20.6739 6 22.017 7.34315 22.017 9V15C22.017 17.6569 20.4498 19.9306 18.1884 20.8758C17.9056 21.0069 17.5818 20.8913 17.4641 20.6134L17.0628 19.6582C16.9451 19.3803 17.0745 19.062 17.3573 18.9309C18.4239 18.4357 19.017 17.4644 19.017 16.4828V16H18.017C16.9124 16 16.017 16.8954 16.017 18V21H14.017ZM3.017 21L3.017 18C3.017 16.8954 3.91243 16 5.017 16H8.017C8.56928 16 9.017 15.5523 9.017 15V9C9.017 8.44772 8.56928 8 8.017 8H4.017C3.46472 8 3.017 8.44772 3.017 9V14C3.017 14.5523 2.56928 15 2.017 15H1.017C0.46472 15 0.017 14.5523 0.017 14V9C0.017 7.34315 1.36015 6 3.017 6H8.017C9.67386 6 11.017 7.34315 11.017 9V15C11.017 17.6569 9.44976 19.9306 7.18838 20.8758C6.9056 21.0069 6.58177 20.8913 6.46408 20.6134L6.06285 19.6582C5.94515 19.3803 6.07447 19.062 6.35725 18.9309C7.42388 18.4357 8.017 17.4644 8.017 16.4828V16H7.017C5.91243 16 5.017 16.8954 5.017 18V21H3.017Z" />
              </svg>
            </Button>

            <Divider />

            <Button onClick={() => onFormat('delete')} title="Delete selection">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </Button>
          </>
        )}
        <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-[#262626]" />
      </div>
    </div>
  )
}

function Button({ children, onClick, title }: { children: React.ReactNode; onClick: () => void; title: string }) {
  return (
    <button
      onMouseDown={(e) => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onClick()
      }}
      title={title}
      className="w-9 h-9 flex items-center justify-center rounded-lg text-white hover:bg-white/10 transition-colors cursor-pointer"
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-[1px] h-6 bg-white/10 mx-1" />
}
