import { create } from 'zustand'
import type { DecodedGoogleUser } from './authUtils'

const STORAGE_KEY = 'justme_user'

interface AuthState {
  user: DecodedGoogleUser | null
  isLoggedIn: boolean
  login: (userData: DecodedGoogleUser) => void
  refreshToken: (token: string, tokenExpiry: number) => void
  logout: () => void
}

function loadFromStorage(): DecodedGoogleUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as DecodedGoogleUser
    if (parsed?.email && parsed?.token) {
      return parsed
    }
    return null
  } catch {
    return null
  }
}

const storedUser = loadFromStorage()

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: storedUser,
  isLoggedIn: storedUser !== null,

  login: (userData: DecodedGoogleUser) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(userData))
    set({ user: userData, isLoggedIn: true })
  },

  refreshToken: (token: string, tokenExpiry: number) => {
    const current = get().user
    if (!current) return
    const updated = { ...current, token, tokenExpiry }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    set({ user: updated })
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('justme_notes_folder_id')
    set({ user: null, isLoggedIn: false })
  },
}))

