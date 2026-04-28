// Auth domain types — single source of truth

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
