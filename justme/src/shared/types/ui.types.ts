import type { ErrorInfo } from 'react'

// UI State types
export interface LoadingState {
  isLoading: boolean
  message?: string
}

export interface ErrorState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

// Selection types for editor
export interface SelectionState {
  isVisible: boolean
  top: number
  left: number
  text: string
  nodeIndex: number
  childIndex: number
  startOffset: number
  endOffset: number
}

// Component Props types
export interface NotesListProps {
  onNoteSelect?: (id: string) => void
  onNotePreview?: (id: string) => void
  onNoteCreate?: () => void
  isPopup?: boolean
}

export interface ArticleReaderProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[]
  embedded?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onUpdateNote?: (content: any[]) => void
}

export interface NotesEditorProps {
  noteId?: string
  isPopup?: boolean
}
