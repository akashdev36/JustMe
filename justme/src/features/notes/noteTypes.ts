// noteTypes.ts — re-exports from shared for backward compatibility within this feature
// Internal files in the notes feature can still import from here
export type {
  NoteFile,
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
} from '../../shared/types'

// Local store type (only used in this feature)
export type NotesStore = {
  notes: import('../../shared/types').NoteFile[]
  activeNoteId: string | null
  isLoading: boolean
  isSaving: boolean
}
