// Shared types barrel — import everything from here
export type { DecodedGoogleUser, AuthState, AuthActions } from './auth.types'
export type { NoteFile, NotesState, NotesActions } from './notes.types'
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
  SlateDescendant,
} from './slate.types'
export type {
  LoadingState,
  ErrorState,
  SelectionState,
  NotesListProps,
  ArticleReaderProps,
  NotesEditorProps,
} from './ui.types'
export type {
  GoogleDriveFile,
  GoogleUserInfo,
  GoogleTokenResponse,
  GoogleCredentialResponse,
} from './google.types'

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
