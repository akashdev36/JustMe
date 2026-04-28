import React, { useState, useEffect, useRef } from 'react'
import type { Descendant } from 'slate'
import FloatSelectionToolbar from './FloatSelectionToolbar'
import * as notesService from './notesService'

interface ArticleReaderProps {
  content: Descendant[]
  embedded?: boolean
  onUpdateNote?: (content: any[]) => void
}

interface SelectionState {
  isVisible: boolean
  top: number
  left: number
  text: string
  nodeIndex: number
  childIndex: number
  startOffset: number
  endOffset: number
}

function GoogleDriveImage({ fileId, caption }: { fileId: string; caption?: string }) {
  const [imgUrl, setImgUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    let active = true
    const loadImg = async () => {
      try {
        const url = await notesService.getAuthenticatedImageUrl(fileId)
        if (active) setImgUrl(url)
      } catch (err) {
        console.error('Failed to load drive image', err)
      } finally {
        if (active) setIsLoading(false)
      }
    }
    loadImg()
    return () => { 
      active = false 
      if (imgUrl) URL.revokeObjectURL(imgUrl)
    }
  }, [fileId])

  return (
    <>
      <div className="my-6 flex flex-col items-start group">
        <div 
          onClick={() => setIsExpanded(true)}
          className={`w-full max-w-[300px] max-h-[300px] relative rounded-2xl overflow-hidden shadow-sm transition-all duration-700 cursor-zoom-in ${isLoading ? 'bg-gray-50 h-[200px] animate-pulse' : 'bg-white hover:shadow-md'}`}
        >
          {imgUrl && (
            <img 
              src={imgUrl} 
              alt={caption || 'Story image'} 
              className="w-full h-full max-h-[300px] object-cover transition-opacity duration-500 hover:scale-105 transition-transform duration-500"
              style={{ opacity: isLoading ? 0 : 1 }}
              onLoad={() => setIsLoading(false)}
            />
          )}
        </div>
        {caption && (
          <p className="mt-2 text-left text-[12px] font-sans text-gray-400 tracking-tight leading-relaxed max-w-[320px] italic">
            {caption}
          </p>
        )}
      </div>

      {/* Lightbox Overlay */}
      {isExpanded && imgUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setIsExpanded(false)}
        >
          <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
          <img 
            src={imgUrl} 
            alt={caption || 'Expanded image'} 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
          />
          {caption && (
            <p className="mt-4 text-white/70 text-sm font-sans max-w-2xl text-center">{caption}</p>
          )}
        </div>
      )}
    </>
  )
}

export default function ArticleReader({ content, embedded, onUpdateNote }: ArticleReaderProps): React.ReactElement | null {
  const bottomRef = useRef<HTMLDivElement>(null)
  const prevContentLength = useRef(content.length)
  const [isEditing, setIsEditing] = useState(false)
  const [selection, setSelection] = useState<SelectionState>({ 
    isVisible: false, top: 0, left: 0, text: '', nodeIndex: -1, childIndex: -1, startOffset: 0, endOffset: 0 
  })

  useEffect(() => {
    if (content.length > prevContentLength.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
    prevContentLength.current = content.length
  }, [content])

  const handleSelection = () => {
    if (isEditing) return

    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
      setSelection(prev => ({ ...prev, isVisible: false }))
      return
    }

    const range = sel.getRangeAt(0)
    const rect = range.getBoundingClientRect()

    let startNode = range.startContainer as HTMLElement
    if (startNode.nodeType === 3) startNode = startNode.parentElement!
    
    const leafElement = startNode.closest('[data-child-index]')
    const blockElement = startNode.closest('[data-index]')
    
    const nodeIndexStr = blockElement?.getAttribute('data-index')
    const childIndexStr = leafElement?.getAttribute('data-child-index')

    if (nodeIndexStr !== null && childIndexStr !== null) {
      setSelection({
        isVisible: true,
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX + rect.width / 2,
        text: sel.toString(),
        nodeIndex: parseInt(nodeIndexStr!),
        childIndex: parseInt(childIndexStr!),
        startOffset: range.startOffset,
        endOffset: range.endOffset
      })
    }
  }

  const applyFormat = (type: string, value?: string) => {
    if (selection.nodeIndex === -1 || !onUpdateNote) return

    const newContent = JSON.parse(JSON.stringify(content))
    const block = newContent[selection.nodeIndex]
    if (!block || !block.children) return

    // Block-level formatting
    if (type === 'h1' || type === 'h2' || type === 'quote' || type === 'list') {
      const targetType = 
        type === 'h1' ? 'heading-one' : 
        type === 'h2' ? 'heading-two' : 
        type === 'quote' ? 'blockquote' : 
        'list-item'
      
      block.type = (block.type === targetType) ? 'paragraph' : targetType
      
      onUpdateNote(newContent)
      setSelection(prev => ({ ...prev, isVisible: false }))
      return
    }

    // Inline formatting
    if (type === 'bold' || type === 'italic' || type === 'delete' || type === 'edit') {
      const targetChild = block.children[selection.childIndex]
      if (!targetChild) return

      const originalText = targetChild.text
      const start = selection.startOffset
      const end = selection.endOffset

      if (start < 0 || end > originalText.length || start > end) return

      if (type === 'delete') {
        targetChild.text = originalText.substring(0, start) + originalText.substring(end)
      } else if (type === 'edit') {
        const before = originalText.substring(0, start)
        const after = originalText.substring(end)
        targetChild.text = before + (value || '') + after
        setIsEditing(false)
      } else {
        const prop = type === 'bold' ? 'bold' : 'italic'
        const before = originalText.substring(0, start)
        const middle = originalText.substring(start, end)
        const after = originalText.substring(end)

        const newNodes = []
        if (before) newNodes.push({ ...targetChild, text: before })
        newNodes.push({ ...targetChild, text: middle, [prop]: !targetChild[prop] })
        if (after) newNodes.push({ ...targetChild, text: after })

        block.children.splice(selection.childIndex, 1, ...newNodes)
      }

      onUpdateNote(newContent)
      setSelection(prev => ({ ...prev, isVisible: false }))
      window.getSelection()?.removeAllRanges()
    }
  }

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelection)
    return () => document.removeEventListener('selectionchange', handleSelection)
  }, [isEditing])

  const renderLeaf = (leaf: any, childIdx: number) => {
    let content = <span data-child-index={childIdx} className="relative">{leaf.text}</span>
    if (leaf.bold) content = <strong className="font-bold text-gray-900">{content}</strong>
    if (leaf.italic) content = <em className="italic">{content}</em>
    return <React.Fragment key={childIdx}>{content}</React.Fragment>
  }

  if (!content || !Array.isArray(content)) return null

  const renderedElements = content.map((node: any, idx: number) => {
    if (node.type === 'image') {
      return <GoogleDriveImage key={idx} fileId={node.fileId} caption={node.caption} />
    }

    const children = node.children || []
    const isHeading1 = node.type === 'heading-one'
    const isHeading2 = node.type === 'heading-two'
    const isQuote = node.type === 'blockquote'
    const isListItem = node.type === 'list-item'

    const innerContent = children.map((child: any, cIdx: number) => renderLeaf(child, cIdx))

    if (children.length === 1 && children[0].text === '' && !isListItem) {
      return <div key={idx} className="h-8" />
    }

    if (isHeading1) return <h1 key={idx} data-index={idx} className="font-serif text-[28px] md:text-[36px] font-bold text-[#292929] leading-[1.2] mt-8 mb-4 tracking-tight">{innerContent}</h1>
    if (isHeading2) return <h2 key={idx} data-index={idx} className="font-serif text-[22px] md:text-[28px] font-bold text-[#292929] leading-[1.2] mt-6 mb-3 tracking-tight">{innerContent}</h2>
    if (isQuote) return <blockquote key={idx} data-index={idx} className="border-l-[2px] border-gray-900 pl-6 my-8 italic text-[18px] md:text-[22px] text-gray-500 leading-[1.5] font-serif">{innerContent}</blockquote>
    if (isListItem) {
      return (
        <div key={idx} data-index={idx} className="relative pl-6 mb-3 flex items-start group">
          <span className="absolute left-1 top-[11px] w-[5px] h-[5px] rounded-full bg-[#292929]" aria-hidden="true" />
          <div className="font-serif text-[16px] md:text-[18px] leading-[1.5] text-[#292929] tracking-[-0.003em] font-normal antialiased">{innerContent}</div>
        </div>
      )
    }

    return (
      <p key={idx} data-index={idx} className="font-serif text-[16px] md:text-[18px] leading-[1.5] text-[#292929] mb-5 tracking-[-0.003em] font-normal antialiased">
        {innerContent}
      </p>
    )
  })

  const containerClass = embedded ? "w-full px-0 relative" : "flex-1 overflow-y-auto bg-white relative"
  const innerClass = embedded ? "w-full py-6" : "max-w-3xl mx-auto px-6 md:px-8 py-8 md:py-12"

  return (
    <div className={containerClass}>
      <div className={innerClass}>
        {renderedElements}
        <div ref={bottomRef} />
      </div>
      <FloatSelectionToolbar
        isVisible={selection.isVisible}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        position={{ top: selection.top, left: selection.left }}
        onFormat={applyFormat as any}
        selectedText={selection.text}
      />
    </div>
  )
}
