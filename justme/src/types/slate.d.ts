// Centralized Slate.js type declarations
// This file should be imported once at the application root

import type { Descendant } from 'slate'

export interface CustomText {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
  code?: boolean
}

export interface ParagraphElement {
  type: 'paragraph'
  children: CustomText[]
}

export interface HeadingOneElement {
  type: 'heading-one'
  children: CustomText[]
}

export interface HeadingTwoElement {
  type: 'heading-two'
  children: CustomText[]
}

export interface BlockquoteElement {
  type: 'blockquote'
  children: CustomText[]
}

export interface ListItemElement {
  type: 'list-item'
  children: CustomText[]
}

export interface BulletListElement {
  type: 'bulleted-list'
  children: ListItemElement[]
}

export interface NumberedListElement {
  type: 'numbered-list'
  children: ListItemElement[]
}

export interface ImageElement {
  type: 'image'
  url: string
  fileId?: string
  caption?: string
  children: [{ text: '' }]
}

export type CustomElement =
  | ParagraphElement
  | HeadingOneElement
  | HeadingTwoElement
  | BlockquoteElement
  | BulletListElement
  | NumberedListElement
  | ListItemElement
  | ImageElement

// Extend Slate's CustomTypes interface
declare module 'slate' {
  interface CustomTypes {
    Element: CustomElement
    Text: CustomText
  }
}

// Re-export Descendant for convenience
export type SlateDescendant = Descendant
