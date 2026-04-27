// Core application types with strict TypeScript

export interface DecodedGoogleUser {
  name: string
  email: string
  picture: string
  token: string
  tokenExpiry: number // Unix ms — when the access token expires
}

export interface AuthState {
  user: DecodedGoogleUser | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null
}

export interface AuthActions {
  login: (userData: DecodedGoogleUser) => void
  refreshToken: (token: string, tokenExpiry: number) => void
  logout: () => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

// Re-export Slate types from centralized location
export type {
  CustomText,
  CustomElement,
  ParagraphElement,
  HeadingOneElement,
  HeadingTwoElement,
  BlockquoteElement,
  BulletListElement,
  NumberedListElement,
  ListItemElement,
  ImageElement,
  SlateDescendant
} from './slate'

export interface NoteFile {
  id: string
  title: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  content: any[] // Slate content - using any to avoid circular type issues
  pinned?: boolean
  tags?: string[]
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
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
}

// UI State types
export interface LoadingState {
  isLoading: boolean
  message?: string
}

export interface ErrorState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
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

// API Response types
export interface GoogleDriveFile {
  id: string
  name: string
  mimeType?: string
  parents?: string[]
}

export interface GoogleUserInfo {
  name?: string
  email?: string
  picture?: string
  sub?: string
}

export interface GoogleTokenResponse {
  access_token: string
  expires_in: number
  scope?: string
  token_type?: string
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// Error types
export interface AppError {
  code: string
  message: string
  details?: Record<string, unknown>
  timestamp: number
}

export interface ValidationError extends AppError {
  field: string
  value: unknown
}

export class ValidationErrorClass extends Error {
  public readonly code: string
  public readonly field: string
  public readonly value: unknown
  public readonly timestamp: number

  constructor(code: string, message: string, field: string, value: unknown) {
    super(message)
    this.name = 'ValidationError'
    this.code = code
    this.field = field
    this.value = value
    this.timestamp = Date.now()
  }
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

// Environment types
export interface EnvConfig {
  VITE_GOOGLE_CLIENT_ID: string
  VITE_APP_NAME: string
  VITE_API_BASE_URL?: string
}
