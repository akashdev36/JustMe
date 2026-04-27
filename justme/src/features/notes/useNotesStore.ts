import { create } from 'zustand'
import { validateNoteTitle, validateNoteContent } from '../../shared/utils/security'
import { useAuthStore } from '../auth/useAuthStore'
import type { NoteFile, CustomElement, NotesState as INotesState, NotesActions } from '../../shared/types'
import * as notesService from './notesService'
import { NOTES_STORAGE_KEYS } from './storage'

const EMPTY_DOC: CustomElement[] = [{ type: 'paragraph', children: [{ text: '' }] }]

// Configure notesService token getter once — this is the ONLY place auth touches notes
notesService.configureTokenGetter(() => {
  const token = useAuthStore.getState().getValidToken()
  if (!token) throw new Error('Not authenticated with Google')
  return token
})

// Debounce manager for auto-save
class AutoSaveManager {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private readonly delay = 1000

  schedule(id: string, callback: () => Promise<void>): void {
    const existingTimer = this.timers.get(id)
    if (existingTimer) clearTimeout(existingTimer)

    const timer = setTimeout(async () => {
      try {
        await callback()
      } finally {
        this.timers.delete(id)
      }
    }, this.delay)

    this.timers.set(id, timer)
  }

  cancel(id: string): void {
    const timer = this.timers.get(id)
    if (timer) {
      clearTimeout(timer)
      this.timers.delete(id)
    }
  }

  cancelAll(): void {
    for (const timer of this.timers.values()) clearTimeout(timer)
    this.timers.clear()
  }

  hasPending(id: string): boolean {
    return this.timers.has(id)
  }
}

const autoSaveManager = new AutoSaveManager()

interface NotesStore extends INotesState, NotesActions {
  findNoteById: (id: string) => NoteFile | undefined
  getActiveNote: () => NoteFile | undefined
  searchNotes: (query: string) => NoteFile[]
  validateNote: (note: Partial<NoteFile>) => NoteFile
}

function loadFromCache(): NoteFile[] {
  try {
    const cached = localStorage.getItem(NOTES_STORAGE_KEYS.CACHE)
    if (!cached) return []
    const parsed = JSON.parse(cached)
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      note => note && typeof note === 'object' && typeof note.id === 'string' && typeof note.title === 'string'
    )
  } catch (error) {
    console.error('Failed to load notes from cache:', error)
    localStorage.removeItem(NOTES_STORAGE_KEYS.CACHE)
    return []
  }
}

function saveToCache(notes: NoteFile[]): void {
  try {
    localStorage.setItem(NOTES_STORAGE_KEYS.CACHE, JSON.stringify(notes))
  } catch (error) {
    console.error('Failed to save notes to cache:', error)
  }
}

function sanitizeNoteContent(content: unknown): CustomElement[] {
  if (!Array.isArray(content) || content.length === 0) return EMPTY_DOC
  try {
    return validateNoteContent(content) as CustomElement[]
  } catch (error) {
    console.warn('Invalid note content, using empty document:', error)
    return EMPTY_DOC
  }
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  notes: [],
  activeNoteId: localStorage.getItem(NOTES_STORAGE_KEYS.LAST_NOTE),
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: '',

  setNotes: (notes: NoteFile[]) => {
    const sanitized = notes.map(note => ({
      ...note,
      content: sanitizeNoteContent(note.content),
    }))
    const sorted = [...sanitized].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    set({ notes: sorted, error: null })
    saveToCache(sorted)
  },

  setActiveNoteId: (id: string | null) => {
    set({ activeNoteId: id })
    if (id) {
      localStorage.setItem(NOTES_STORAGE_KEYS.LAST_NOTE, id)
    } else {
      localStorage.removeItem(NOTES_STORAGE_KEYS.LAST_NOTE)
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),
  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),
  clearError: () => set({ error: null }),

  togglePin: async (id: string) => {
    const { notes } = get()
    const note = notes.find(n => n.id === id)
    if (!note) return

    const newPinned = !note.pinned
    // Optimistic update
    const updatedNotes = notes.map(n => n.id === id ? { ...n, pinned: newPinned } : n)
    get().setNotes(updatedNotes)

    try {
      await notesService.saveNote(updatedNotes.find(n => n.id === id)!)
    } catch (error) {
      console.error('Failed to toggle pin:', error)
      // Rollback
      get().setNotes(notes)
    }
  },

  createNote: async (title?: string) => {
    try {
      set({ isLoading: true, error: null })
      const validatedTitle = validateNoteTitle(title || '')
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const newNote: NoteFile = { id, title: validatedTitle, content: EMPTY_DOC, createdAt: now, updatedAt: now }

      const updatedNotes = [newNote, ...get().notes]
      get().setNotes(updatedNotes)
      get().setActiveNoteId(id)
      const driveId = await notesService.saveNote(newNote)
      get().setNotes(get().notes.map(n => n.id === id ? { ...n, driveId } : n))
      set({ isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create note'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  updateNote: (id: string, changes: Partial<NoteFile>) => {
    try {
      const currentNotes = get().notes
      const noteIndex = currentNotes.findIndex(n => n.id === id)
      if (noteIndex === -1) throw new Error('Note not found')

      const currentNote = currentNotes[noteIndex]
      const now = new Date().toISOString()
      const validatedChanges = { ...changes }
      if (changes.title !== undefined) validatedChanges.title = validateNoteTitle(changes.title)
      if (changes.content !== undefined) validatedChanges.content = sanitizeNoteContent(changes.content)

      const updatedNote = { ...currentNote, ...validatedChanges, updatedAt: now }
      const updatedNotes = [...currentNotes]
      updatedNotes[noteIndex] = updatedNote
      get().setNotes(updatedNotes)

      if (!autoSaveManager.hasPending(id)) set({ isSaving: true })

      autoSaveManager.schedule(id, async () => {
        try {
          await notesService.saveNote(updatedNote)
        } catch (error) {
          console.error('Auto-save failed:', error)
          set({ error: 'Failed to save note' })
        } finally {
          set({ isSaving: false })
        }
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update note'
      set({ error: errorMessage })
    }
  },

  deleteNote: async (id: string) => {
    try {
      set({ isLoading: true, error: null })
      const updatedNotes = get().notes.filter(n => n.id !== id)
      get().setNotes(updatedNotes)

      if (get().activeNoteId === id) {
        const nextNote = updatedNotes[0] || null
        get().setActiveNoteId(nextNote?.id || null)
      }

      autoSaveManager.cancel(id)
      await notesService.deleteNote(id)
      set({ isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete note'
      set({ error: errorMessage, isLoading: false })
      await get().loadNotes()
      throw error
    }
  },

  loadNotes: async () => {
    try {
      set({ isLoading: true, error: null })

      // Show cached notes immediately while fetching from Drive
      const cachedNotes = loadFromCache()
      if (cachedNotes.length > 0) set({ notes: cachedNotes })

      // Fetch full note content from Drive (reliable for all existing notes)
      const fetchedNotes = await notesService.fetchAllNotes()
      const sanitizedNotes = fetchedNotes.map(note => ({
        ...note,
        content: sanitizeNoteContent(note.content),
      }))
      get().setNotes(sanitizedNotes)

      const lastId = localStorage.getItem(NOTES_STORAGE_KEYS.LAST_NOTE)
      if (lastId && sanitizedNotes.some(n => n.id === lastId)) {
        get().setActiveNoteId(lastId)
      } else if (sanitizedNotes.length > 0) {
        get().setActiveNoteId(sanitizedNotes[0].id)
      } else {
        get().setActiveNoteId(null)
      }

      set({ isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load notes'
      set({ error: errorMessage, isLoading: false })
      // Fall back to cache on error
      if (get().notes.length === 0) {
        const cachedNotes = loadFromCache()
        if (cachedNotes.length > 0) get().setNotes(cachedNotes)
      }
    }
  },

  findJournalNote: (dateStr: string) => {
    return get().notes.find(n => n.title === `journal::${dateStr}`)
  },

  createJournalNote: async (dateStr: string) => {
    try {
      set({ isLoading: true, error: null })
      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const title = `journal::${dateStr}`
      const newNote: NoteFile = { id, title, content: EMPTY_DOC, createdAt: now, updatedAt: now }

      const updatedNotes = [newNote, ...get().notes]
      get().setNotes(updatedNotes)
      get().setActiveNoteId(id)
      const driveId = await notesService.saveNote(newNote)
      get().setNotes(get().notes.map(n => n.id === id ? { ...n, driveId } : n))
      set({ isLoading: false })
      return id
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create journal note'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  findNoteById: (id: string) => get().notes.find(n => n.id === id),

  getActiveNote: () => {
    const { notes, activeNoteId } = get()
    return activeNoteId ? notes.find(n => n.id === activeNoteId) : undefined
  },

  searchNotes: (query: string) => {
    const { notes } = get()
    if (!query.trim()) return notes
    const searchTerm = query.toLowerCase()
    return notes.filter(
      note =>
        note.title.toLowerCase().includes(searchTerm) ||
        note.content.some(node =>
          node.children?.some(
            (child: { text?: string }) => 'text' in child && child.text?.toLowerCase().includes(searchTerm)
          )
        )
    )
  },

  validateNote: (note: Partial<NoteFile>) => ({
    id: note.id || crypto.randomUUID(),
    title: validateNoteTitle(note.title || ''),
    content: sanitizeNoteContent(note.content || EMPTY_DOC),
    createdAt: note.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    pinned: note.pinned || false,
    tags: note.tags || [],
  }),
}))

// Selector hooks
export const useNotes = () => useNotesStore(state => state.notes)
export const useActiveNoteId = () => useNotesStore(state => state.activeNoteId)
export const useActiveNote = () =>
  useNotesStore(state => {
    const { notes, activeNoteId } = state
    return activeNoteId ? notes.find(n => n.id === activeNoteId) : undefined
  })
export const useNotesIsLoading = () => useNotesStore(state => state.isLoading)
export const useNotesIsSaving = () => useNotesStore(state => state.isSaving)
export const useNotesError = () => useNotesStore(state => state.error)
export const useNotesSearchQuery = () => useNotesStore(state => state.searchQuery)

export const useFilteredNotes = () => {
  const notes = useNotes()
  const searchQuery = useNotesSearchQuery()
  const baseNotes = notes.filter(n => !n.title.startsWith('journal::'))
  if (!searchQuery.trim()) return baseNotes
  const searchTerm = searchQuery.toLowerCase()
  return baseNotes.filter(
    note =>
      note.title.toLowerCase().includes(searchTerm) ||
      note.content.some(node =>
        node.children?.some(
          (child: { text?: string }) => 'text' in child && child.text?.toLowerCase().includes(searchTerm)
        )
      )
  )
}

export const useNotesCleanup = () => () => autoSaveManager.cancelAll()

// Journal-date selector — exposed for the Home feature to use
export const useJournalDates = () =>
  useNotesStore(
    state =>
      state.notes
        .filter(n => n.title.startsWith('journal::'))
        .map(n => n.title.replace('journal::', ''))
        .join(',') // Return a stable string instead of a new Set object
  )

// Special days selector — returns a stable JSON string of { date: reason } for calendar gold stars
export const useSpecialDays = () =>
  useNotesStore(
    state => {
      const map: Record<string, string> = {}
      state.notes
        .filter(n => n.title.startsWith('journal::') && n.specialDay)
        .forEach(n => {
          const date = n.title.replace('journal::', '')
          map[date] = n.specialDay!.reason
        })
      return JSON.stringify(map) // stable string to prevent unnecessary re-renders
    }
  )
