import type { Descendant } from 'slate'

export type CustomText = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

export type ParagraphElement = { type: 'paragraph'; children: CustomText[] }
export type HeadingOneElement = { type: 'heading-one'; children: CustomText[] }
export type HeadingTwoElement = { type: 'heading-two'; children: CustomText[] }
export type BlockquoteElement = { type: 'blockquote'; children: CustomText[] }
export type BulletListElement = { type: 'bulleted-list'; children: ListItemElement[] }
export type NumberedListElement = { type: 'numbered-list'; children: ListItemElement[] }
export type ListItemElement = { type: 'list-item'; children: CustomText[] }
export type ImageElement = { type: 'image'; url: string; children: [{ text: '' }] }

export type CustomElement =
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | BlockquoteElement
  | BulletListElement
  | NumberedListElement
  | ListItemElement
  | ImageElement

export type NoteFile = {
  id: string
  title: string
  content: Descendant[] // Slate.js custom format
  createdAt: string // ISO
  updatedAt: string // ISO
}

export type NotesStore = {
  notes: NoteFile[]
  activeNoteId: string | null
  isLoading: boolean
  isSaving: boolean
}

// Slate type declarations
declare module 'slate' {
  interface CustomTypes {
    Element: CustomElement
    Text: CustomText
  }
}
