// Declaring Google Identity Services types as a global augmentation

export interface GoogleCredentialResponse {
  credential: string
  select_by?: string
}

interface GoogleAccountsId {
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

declare global {
  interface Window {
    google?: {
      accounts: {
        id: GoogleAccountsId
      }
    }
  }
}
