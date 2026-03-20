import { Editor, Transforms, Element, Node, Range } from 'slate'
import type { CustomElement } from './noteTypes'

export const isMarkActive = (editor: Editor, format: string): boolean => {
  const marks = Editor.marks(editor) as Record<string, boolean> | null
  return marks ? marks[format] === true : false
}

export const toggleMark = (editor: Editor, format: string): void => {
  const isActive = isMarkActive(editor, format)
  if (isActive) {
    Editor.removeMark(editor, format)
  } else {
    Editor.addMark(editor, format, true)
  }
}

export const isBlockActive = (editor: Editor, format: string): boolean => {
  const { selection } = editor
  if (!selection) return false

  const [match] = Array.from(
    Editor.nodes(editor, {
      at: Editor.unhangRange(editor, selection),
      match: (n) => !Editor.isEditor(n) && Element.isElement(n) && n.type === format,
    })
  )

  return !!match
}

export const toggleBlock = (editor: Editor, format: string): void => {
  const isActive = isBlockActive(editor, format)
  const isList = format === 'bulleted-list' || format === 'numbered-list'

  // Unwrap any existing list wrappers if toggling to items
  Transforms.unwrapNodes(editor, {
    match: (n) =>
      !Editor.isEditor(n) &&
      Element.isElement(n) &&
      ['bulleted-list', 'numbered-list'].includes(n.type),
    split: true,
  })

  const newProperties: Partial<Element> = {
    type: isActive ? 'paragraph' : isList ? 'list-item' : (format as CustomElement['type']),
  }
  Transforms.setNodes<Element>(editor, newProperties)

  if (!isActive && isList) {
    const block = { type: format as 'bulleted-list' | 'numbered-list', children: [] }
    Transforms.wrapNodes(editor, block)
  }
}

export const withImages = (editor: Editor): Editor => {
  const { isVoid } = editor
  editor.isVoid = (element) => {
    return element.type === 'image' ? true : isVoid(element)
  }
  return editor
}

const SHORTCUTS: Record<string, CustomElement['type']> = {
  '#': 'heading-one',
  '##': 'heading-two',
  '-': 'bulleted-list',
  '1.': 'numbered-list',
  '>': 'blockquote',
}

export const withShortcuts = (editor: Editor): Editor => {
  const { insertText } = editor

  editor.insertText = (text) => {
    const { selection } = editor

    if (text === ' ' && selection && Range.isCollapsed(selection)) {
      const { anchor } = selection
      const block = Editor.above(editor, {
        match: (n) => Element.isElement(n) && Editor.isBlock(editor, n),
      })
      const path = block ? block[1] : []
      const start = Editor.start(editor, path)
      const range = { anchor, focus: start }
      const beforeText = Editor.string(editor, range)
      const type = SHORTCUTS[beforeText]

      if (type) {
        Transforms.select(editor, range)
        Transforms.delete(editor)

        const isList = type === 'bulleted-list' || type === 'numbered-list'

        if (isList) {
          Transforms.setNodes(editor, { type: 'list-item' } as Partial<Element>)
          const listNode = { type, children: [] } as CustomElement
          Transforms.wrapNodes(editor, listNode)
        } else {
          Transforms.setNodes(editor, { type } as Partial<Element>)
        }
        return
      }
    }

    insertText(text)
  }

  return editor
}

export const serializeToPlainText = (nodes: Node[]): string => {
  return nodes.map((n) => Node.string(n)).join('\n')
}
