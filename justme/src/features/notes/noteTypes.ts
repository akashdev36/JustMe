import type { NoteFile } from '../../types'

// Re-export all Slate types from centralized location
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
} from '../../types/slate'

// Re-export NoteFile
export type { NoteFile }

// Local store type (only used in this feature)
export type NotesStore = {
  notes: NoteFile[]
  activeNoteId: string | null
  isLoading: boolean
  isSaving: boolean
}
