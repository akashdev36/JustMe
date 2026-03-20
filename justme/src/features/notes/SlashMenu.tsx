import React, { useRef, useEffect } from 'react'
import { Editor, Transforms } from 'slate'
import { toggleBlock } from './editorUtils'

interface SlashMenuProps {
  position: { top: number; left: number }
  onClose: () => void
  editor: Editor
}

export default function SlashMenu({ position, onClose, editor }: SlashMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  const handleSelect = (type: string) => {
    const { selection } = editor
    if (selection) {
      // Remove "/" character. Selection is collapsed at "/"
      Transforms.delete(editor, { distance: 1, reverse: true })

      if (type === 'image') {
        fileInputRef.current?.click()
      } else {
        toggleBlock(editor, type)
      }
    }
    onClose()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const imageNode = { type: 'image' as const, url: reader.result, children: [{ text: '' as const }] }
          Transforms.insertNodes(editor, imageNode as any)
        }
      }
      reader.readAsDataURL(file)
    }
    onClose()
  }

  const items = [
    { type: 'heading-one', label: 'Heading 1', desc: 'Large heading', icon: 'H1' },
    { type: 'heading-two', label: 'Heading 2', desc: 'Medium heading', icon: 'H2' },
    { type: 'bulleted-list', label: 'Bullet list', desc: 'Unordered list', icon: '•' },
    { type: 'numbered-list', label: 'Numbered list', desc: 'Ordered list', icon: '1.' },
    { type: 'blockquote', label: 'Blockquote', desc: 'Highlighted quote', icon: '"' },
    { type: 'image', label: 'Insert image', desc: 'Add a photo', icon: 'img' },
  ]

  return (
    <div
      ref={menuRef}
      style={{ top: position.top, left: position.left }}
      className="absolute z-40 bg-white border border-gray-200 rounded-xl shadow-xl py-1 w-48 max-h-48 overflow-y-auto"
    >
      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleFileChange} className="hidden" />
      {items.map((item) => (
        <button
          key={item.type}
          onClick={() => handleSelect(item.type)}
          type="button"
          className="w-full text-left px-3 py-1.5 hover:bg-gray-50 flex items-center gap-3 transition-colors"
        >
          <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-700">
            {item.icon}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium text-gray-900 font-sans">{item.label}</span>
            <span className="text-[10px] text-gray-400 font-sans">{item.desc}</span>
          </div>
        </button>
      ))}
    </div>
  )
}
