import React from 'react'
import type { Descendant } from 'slate'

interface ArticleReaderProps {
  content: Descendant[]
  isReaderFullscreen?: boolean
  onToggleFullscreen?: () => void
}

export default function ArticleReader({ content }: ArticleReaderProps): React.ReactElement | null {
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [content])

  if (!content || !Array.isArray(content)) return null

  const renderedElements: React.ReactNode[] = []
  let currentListItems: { text: string; idx: number }[] = []

  const flushList = () => {
    if (currentListItems.length > 0) {
      renderedElements.push(
        <ul key={`list-${renderedElements.length}`} className="list-disc ml-6 mb-[18px] space-y-1 font-serif">
          {currentListItems.map((item) => (
            <li key={item.idx} className="text-[16px] text-gray-800 leading-[1.8]">
              {item.text}
            </li>
          ))}
        </ul>
      )
      currentListItems = []
    }
  }

  content.forEach((node: any, idx: number) => {
    const text = node.children?.[0]?.text || ''

    if (text.trim() === '') return

    if (!text.startsWith('- ')) {
      flushList()
    }

    if (text.startsWith('## ')) {
      renderedElements.push(
        <h2 key={idx} className="text-[20px] font-semibold text-gray-900 mt-[24px] mb-[10px] font-serif leading-snug">
          {text.slice(3).trim()}
        </h2>
      )
    } else if (text.startsWith('# ')) {
      renderedElements.push(
        <h1 key={idx} className="text-[28px] font-bold text-gray-900 mb-[16px] font-serif leading-tight">
          {text.slice(2).trim()}
        </h1>
      )
    } else if (text.startsWith('- ')) {
      currentListItems.push({ text: text.slice(2).trim(), idx })
    } else if (text.startsWith('> ')) {
      renderedElements.push(
        <blockquote key={idx} className="border-l-[3px] border-[#2d6a4f] pl-[18px] italic text-[var(--color-text-secondary,gray-600)] my-4 text-[16px] font-serif leading-relaxed">
          {text.slice(2).trim()}
        </blockquote>
      )
    } else if (text.startsWith('** ')) {
      renderedElements.push(
        <p key={idx} className="text-[16px] text-[var(--color-text-primary,#111827)] mb-[18px] leading-[1.8] font-serif font-bold">
          {text.slice(3).trim()}
        </p>
      )
    } else if (text.startsWith('`')) {
      renderedElements.push(
        <div key={idx} className="bg-gray-50 border border-gray-100 rounded-lg p-[12px_16px] mb-[18px] overflow-x-auto">
          <pre className="font-mono text-[13px] leading-[1.6] text-gray-800 whitespace-pre-wrap">
            <code>{text.slice(1).trim()}</code>
          </pre>
        </div>
      )
    } else {
      renderedElements.push(
        <p key={idx} className="text-[16px] text-[var(--color-text-primary,#111827)] mb-[18px] leading-[1.8] font-serif">
          {text}
        </p>
      )
    }
  })

  flushList()

  return (
    <div className="flex-1 overflow-y-auto bg-[#ffffff] border-l border-[#e5e7eb]">
      <div className="w-full p-[32px_40px]">
        {renderedElements}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
