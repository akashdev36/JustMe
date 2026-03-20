const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

let tokenClient: any = null

export function initTokenClient(callback: (response: any) => void): void {
  const tryInit = () => {
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: [
          'https://www.googleapis.com/auth/userinfo.profile',
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/drive.file',
        ].join(' '),
        callback: callback,
      })
    } else {
      setTimeout(tryInit, 200)
    }
  }
  tryInit()
}

export function requestAccessToken(): void {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' })
  } else {
    console.warn('Token client not initialised yet')
  }
}

export function signOut(accessToken: string): void {
  const g = (window as any).google
  if (g?.accounts?.oauth2 && accessToken) {
    g.accounts.oauth2.revoke(accessToken, () => {
      // Done clearing
    })
  }
}
