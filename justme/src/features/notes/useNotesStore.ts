import { create } from 'zustand'
import type { NoteFile } from './noteTypes'
import * as notesService from './notesService'

const OFFLINE_CACHE_KEY = 'justme_notes_cache'
const LAST_NOTE_KEY = 'justme_last_note'

const EMPTY_DOC = [{ type: 'paragraph', children: [{ text: '' }] }]

let saveTimer: ReturnType<typeof setTimeout> | null = null

interface NotesState {
  notes: NoteFile[]
  activeNoteId: string | null
  isLoading: boolean
  isSaving: boolean

  setNotes: (notes: NoteFile[]) => void
  setActiveNoteId: (id: string | null) => void
  createNote: (title?: string) => Promise<void>
  updateNote: (id: string, changes: Partial<NoteFile>) => void
  deleteNote: (id: string) => Promise<void>
  loadNotes: () => Promise<void>
}

export const useNotesStore = create<NotesState>((set, get) => ({
  notes: [],
  activeNoteId: null,
  isLoading: false,
  isSaving: false,

  setNotes: (notes) => {
    const sanitized = notes.map((note) => ({
      ...note,
      content: Array.isArray(note.content) && note.content.length > 0
        ? note.content
        : (EMPTY_DOC as any),
    }))

    // Sort by updatedAt descending immediately
    const sorted = [...sanitized].sort((a, b) => {
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
    set({ notes: sorted })
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(sorted))
  },

  setActiveNoteId: (id) => {
    set({ activeNoteId: id })
    if (id) {
      localStorage.setItem(LAST_NOTE_KEY, id)
    }
  },

  createNote: async (title?: string) => {
    const id = crypto.randomUUID()
    const now = new Date().toISOString()
    const newNote: NoteFile = {
      id,
      title: title || '',
      content: [{ type: 'paragraph', children: [{ text: '' }] }],
      createdAt: now,
      updatedAt: now,
    }

    const updatedNotes = [newNote, ...get().notes]
    get().setNotes(updatedNotes)
    get().setActiveNoteId(id)

    try {
      await notesService.saveNote(newNote)
    } catch (err) {
      console.error('Failed to create file in Drive', err)
    }
  },

  updateNote: (id, changes) => {
    const now = new Date().toISOString()
    const updatedNotes = get().notes.map((n) => {
      if (n.id === id) {
        return { ...n, ...changes, updatedAt: now }
      }
      return n
    })

    get().setNotes(updatedNotes)

    // Debounce save to Drive by 1 second
    if (saveTimer) clearTimeout(saveTimer)
    set({ isSaving: true })

    saveTimer = setTimeout(async () => {
      const noteToSave = get().notes.find((n) => n.id === id)
      if (noteToSave) {
        try {
          await notesService.saveNote(noteToSave)
        } catch (err) {
          console.error('Auto-save failed', err)
        } finally {
          set({ isSaving: false })
        }
      } else {
        set({ isSaving: false })
      }
    }, 1000)
  },

  deleteNote: async (id) => {
    const updatedNotes = get().notes.filter((n) => n.id !== id)
    get().setNotes(updatedNotes)

    if (get().activeNoteId === id) {
      const firstNote = updatedNotes[0] || null
      get().setActiveNoteId(firstNote ? firstNote.id : null)
    }

    try {
      await notesService.deleteNote(id)
    } catch (err) {
      console.error('Failed deleting from Drive', err)
    }
  },

  loadNotes: async () => {
    set({ isLoading: true })
    try {
      const notes = await notesService.fetchAllNotes()
      const sanitized = notes.map((note) => ({
        ...note,
        content: Array.isArray(note.content) && note.content.length > 0
          ? note.content
          : (EMPTY_DOC as any),
      }))
      get().setNotes(sanitized)

      const lastId = localStorage.getItem(LAST_NOTE_KEY)
      if (lastId && notes.some((n) => n.id === lastId)) {
        get().setActiveNoteId(lastId)
      } else if (notes.length > 0) {
        get().setActiveNoteId(notes[0].id)
      } else {
        get().setActiveNoteId(null)
      }
    } catch (err) {
      console.error('Failed to load notes from service', err)
    } finally {
      set({ isLoading: false })
    }
  },
}))
