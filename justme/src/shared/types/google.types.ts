// Google API response types

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

export interface GoogleCredentialResponse {
  credential: string
  select_by?: string
}

// Global window augmentation for Google Identity Services
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string
            callback: (response: GoogleCredentialResponse) => void
            auto_select?: boolean
            cancel_on_tap_outside?: boolean
          }) => void
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: string
              size?: string
              width?: number | string
              text?: string
              shape?: string
            }
          ) => void
          prompt: () => void
          disableAutoSelect: () => void
        }
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: { access_token?: string; expires_in?: number; error?: string }) => void
          }) => {
            requestAccessToken: (options?: { prompt?: string; callback?: (response: any) => void }) => void
          }
          revoke: (token: string, callback: () => void) => void
        }
      }
    }
  }
}
