import { create } from 'zustand'
import { validateNoteTitle, validateNoteContent } from '../../utils/security'
import type { NoteFile, CustomElement, NotesState as INotesState, NotesActions } from '../../types'
import * as notesService from './notesService'

const OFFLINE_CACHE_KEY = 'justme_notes_cache'
const LAST_NOTE_KEY = 'justme_last_note'
const EMPTY_DOC: CustomElement[] = [{ type: 'paragraph', children: [{ text: '' }] }]

// Debounce manager for auto-save
class AutoSaveManager {
  private timers: Map<string, ReturnType<typeof setTimeout>> = new Map()
  private readonly delay = 1000 // 1 second debounce

  schedule(id: string, callback: () => Promise<void>): void {
    // Clear existing timer for this note
    const existingTimer = this.timers.get(id)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Schedule new timer
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
    for (const timer of this.timers.values()) {
      clearTimeout(timer)
    }
    this.timers.clear()
  }

  hasPending(id: string): boolean {
    return this.timers.has(id)
  }
}

const autoSaveManager = new AutoSaveManager()

interface NotesStore extends INotesState, NotesActions {
  // Additional store-specific methods
  findNoteById: (id: string) => NoteFile | undefined
  getActiveNote: () => NoteFile | undefined
  searchNotes: (query: string) => NoteFile[]
  validateNote: (note: Partial<NoteFile>) => NoteFile
}

function loadFromCache(): NoteFile[] {
  try {
    const cached = localStorage.getItem(OFFLINE_CACHE_KEY)
    if (!cached) return []
    
    const parsed = JSON.parse(cached)
    if (!Array.isArray(parsed)) return []
    
    return parsed.filter(note => 
      note && 
      typeof note === 'object' && 
      typeof note.id === 'string' && 
      typeof note.title === 'string'
    )
  } catch (error) {
    console.error('Failed to load notes from cache:', error)
    localStorage.removeItem(OFFLINE_CACHE_KEY)
    return []
  }
}

function saveToCache(notes: NoteFile[]): void {
  try {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(notes))
  } catch (error) {
    console.error('Failed to save notes to cache:', error)
  }
}

function sanitizeNoteContent(content: unknown): CustomElement[] {
  if (!Array.isArray(content) || content.length === 0) {
    return EMPTY_DOC
  }
  
  try {
    return validateNoteContent(content) as CustomElement[]
  } catch (error) {
    console.warn('Invalid note content, using empty document:', error)
    return EMPTY_DOC
  }
}

export const useNotesStore = create<NotesStore>((set, get) => ({
  // Initial state
  notes: [],
  activeNoteId: null,
  isLoading: false,
  isSaving: false,
  error: null,
  searchQuery: '',

  // Basic actions
  setNotes: (notes: NoteFile[]) => {
    const sanitized = notes.map((note) => ({
      ...note,
      content: sanitizeNoteContent(note.content),
    }))

    // Sort by updatedAt descending
    const sorted = [...sanitized].sort((a, b) => 
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )

    set({ notes: sorted, error: null })
    saveToCache(sorted)
  },

  setActiveNoteId: (id: string | null) => {
    set({ activeNoteId: id })
    if (id) {
      localStorage.setItem(LAST_NOTE_KEY, id)
    } else {
      localStorage.removeItem(LAST_NOTE_KEY)
    }
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query })
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading })
  },

  setError: (error: string | null) => {
    set({ error })
  },

  clearError: () => {
    set({ error: null })
  },

  // CRUD operations
  createNote: async (title?: string) => {
    try {
      set({ isLoading: true, error: null })

      const validatedTitle = validateNoteTitle(title || '')
      const id = crypto.randomUUID()
      const now = new Date().toISOString()

      const newNote: NoteFile = {
        id,
        title: validatedTitle,
        content: EMPTY_DOC,
        createdAt: now,
        updatedAt: now,
      }

      // Optimistic update
      const updatedNotes = [newNote, ...get().notes]
      get().setNotes(updatedNotes)
      get().setActiveNoteId(id)

      // Save to backend
      await notesService.saveNote(newNote)
      
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
      
      if (noteIndex === -1) {
        throw new Error('Note not found')
      }

      const currentNote = currentNotes[noteIndex]
      const now = new Date().toISOString()

      // Validate changes
      let validatedChanges = { ...changes }
      if (changes.title !== undefined) {
        validatedChanges.title = validateNoteTitle(changes.title)
      }
      if (changes.content !== undefined) {
        validatedChanges.content = sanitizeNoteContent(changes.content)
      }

      const updatedNote = { 
        ...currentNote, 
        ...validatedChanges, 
        updatedAt: now 
      }

      // Optimistic update
      const updatedNotes = [...currentNotes]
      updatedNotes[noteIndex] = updatedNote
      
      get().setNotes(updatedNotes)

      // Schedule auto-save
      if (!autoSaveManager.hasPending(id)) {
        set({ isSaving: true })
      }

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

      // Optimistic update
      const updatedNotes = get().notes.filter(n => n.id !== id)
      get().setNotes(updatedNotes)

      // Update active note if necessary
      if (get().activeNoteId === id) {
        const nextNote = updatedNotes[0] || null
        get().setActiveNoteId(nextNote?.id || null)
      }

      // Cancel any pending auto-save for this note
      autoSaveManager.cancel(id)

      // Delete from backend
      await notesService.deleteNote(id)
      
      set({ isLoading: false })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete note'
      set({ error: errorMessage, isLoading: false })
      
      // Rollback optimistic update on failure
      await get().loadNotes()
      throw error
    }
  },

  loadNotes: async () => {
    try {
      set({ isLoading: true, error: null })

      // Load from cache first for immediate UI
      const cachedNotes = loadFromCache()
      if (cachedNotes.length > 0) {
        get().setNotes(cachedNotes)
      }

      // Load from backend
      const notes = await notesService.fetchAllNotes()
      const sanitizedNotes = notes.map(note => ({
        ...note,
        content: sanitizeNoteContent(note.content),
      }))

      get().setNotes(sanitizedNotes)

      // Restore last active note
      const lastId = localStorage.getItem(LAST_NOTE_KEY)
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
      
      // Keep cached notes if backend load fails
      if (get().notes.length === 0) {
        const cachedNotes = loadFromCache()
        if (cachedNotes.length > 0) {
          get().setNotes(cachedNotes)
        }
      }
    }
  },

  // Journal-specific methods
  findJournalNote: (dateStr: string) => {
    return get().notes.find(n => n.title === `journal::${dateStr}`)
  },

  createJournalNote: async (dateStr: string) => {
    try {
      set({ isLoading: true, error: null })

      const id = crypto.randomUUID()
      const now = new Date().toISOString()
      const title = `journal::${dateStr}`

      const newNote: NoteFile = {
        id,
        title,
        content: EMPTY_DOC,
        createdAt: now,
        updatedAt: now,
      }

      // Optimistic update
      const updatedNotes = [newNote, ...get().notes]
      get().setNotes(updatedNotes)
      get().setActiveNoteId(id)

      // Save to backend
      await notesService.saveNote(newNote)
      
      set({ isLoading: false })
      return id
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create journal note'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  // Store-specific utility methods
  findNoteById: (id: string) => {
    return get().notes.find(n => n.id === id)
  },

  getActiveNote: () => {
    const { notes, activeNoteId } = get()
    return activeNoteId ? notes.find(n => n.id === activeNoteId) : undefined
  },

  searchNotes: (query: string) => {
    const { notes } = get()
    if (!query.trim()) return notes

    const searchTerm = query.toLowerCase()
    return notes.filter(note => 
      note.title.toLowerCase().includes(searchTerm) ||
      note.content.some(node => 
        node.children?.some((child: { text?: string }) => 
          'text' in child && child.text?.toLowerCase().includes(searchTerm)
        )
      )
    )
  },

  validateNote: (note: Partial<NoteFile>) => {
    const validated: NoteFile = {
      id: note.id || crypto.randomUUID(),
      title: validateNoteTitle(note.title || ''),
      content: sanitizeNoteContent(note.content || EMPTY_DOC),
      createdAt: note.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      pinned: note.pinned || false,
      tags: note.tags || [],
    }

    return validated
  },
}))

// Selector hooks for better performance
export const useNotes = () => useNotesStore(state => state.notes)
export const useActiveNoteId = () => useNotesStore(state => state.activeNoteId)
export const useActiveNote = () => useNotesStore(state => {
  const { notes, activeNoteId } = state
  return activeNoteId ? notes.find(n => n.id === activeNoteId) : undefined
})
export const useNotesIsLoading = () => useNotesStore(state => state.isLoading)
export const useNotesIsSaving = () => useNotesStore(state => state.isSaving)
export const useNotesError = () => useNotesStore(state => state.error)
export const useNotesSearchQuery = () => useNotesStore(state => state.searchQuery)

// Computed selector for filtered notes
export const useFilteredNotes = () => {
  const notes = useNotes()
  const searchQuery = useNotesSearchQuery()
  
  if (!searchQuery.trim()) return notes

  const searchTerm = searchQuery.toLowerCase()
  return notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm) ||
    note.content.some(node => 
      node.children?.some((child: { text?: string }) => 
        'text' in child && child.text?.toLowerCase().includes(searchTerm)
      )
    )
  )
}

// Cleanup hook for component unmount
export const useNotesCleanup = () => {
  return () => {
    autoSaveManager.cancelAll()
  }
}
