// Notes domain types — single source of truth

export interface NoteFile {
  id: string
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[] // Slate content
  pinned?: boolean
  tags?: string[]
  driveId?: string // Google Drive file ID for faster access
  specialDay?: {
    reason: string
    markedAt: string
  }
  videos?: {
    driveFileId: string
    title: string
    uploadedAt: string
  }[]
  createdAt: string // ISO
  updatedAt: string // ISO
}

export interface NotesState {
  notes: NoteFile[]
  activeNoteId: string | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  searchQuery: string
}

export interface NotesActions {
  setNotes: (notes: NoteFile[]) => void
  setActiveNoteId: (id: string | null) => void
  createNote: (title?: string) => Promise<void>
  updateNote: (id: string, changes: Partial<NoteFile>) => void
  deleteNote: (id: string) => Promise<void>
  loadNotes: () => Promise<void>
  findJournalNote: (dateStr: string) => NoteFile | undefined
  createJournalNote: (dateStr: string) => Promise<string>
  setSearchQuery: (query: string) => void
  togglePin: (id: string) => Promise<void>
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}
