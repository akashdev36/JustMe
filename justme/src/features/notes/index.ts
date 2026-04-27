// Public API for the notes feature
// Other features and the router ONLY import from here

export { default as NotesPage } from './NotesPage'
export {
  useNotesStore,
  useNotes,
  useActiveNoteId,
  useActiveNote,
  useNotesIsLoading,
  useNotesIsSaving,
  useNotesError,
  useNotesSearchQuery,
  useFilteredNotes,
  useNotesCleanup,
  useJournalDates,
} from './useNotesStore'
