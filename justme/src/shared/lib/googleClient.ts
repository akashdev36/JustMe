const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string

let tokenClient: any = null

export async function initTokenClient(onTokenResponse?: (response: any) => void): Promise<void> {
  return new Promise((resolve) => {
    const tryInit = () => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: CLIENT_ID,
          scope: [
            'https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/drive.file',
          ].join(' '),
          callback: onTokenResponse || (() => {}),
        })
        resolve()
      } else {
        setTimeout(tryInit, 200)
      }
    }
    tryInit()
  })
}

export function requestAccessToken(): void {
  if (tokenClient) {
    tokenClient.requestAccessToken({ prompt: 'consent' })
  } else {
    console.warn('Token client not initialised yet')
  }
}

/**
 * Silently request a new access token with no popup.
 * Works as long as the user's Google session is still active in the browser.
 */
export function silentRefreshToken(): Promise<{ access_token: string; expires_in: number }> {
  return new Promise((resolve, reject) => {
    const tryRefresh = () => {
      if (!tokenClient) {
        setTimeout(tryRefresh, 200)
        return
      }
      tokenClient.requestAccessToken({
        prompt: '',
        callback: (response: any) => {
          if (response?.error) {
            reject(new Error(response.error))
          } else if (response?.access_token) {
            resolve({
              access_token: response.access_token,
              expires_in: response.expires_in ?? 3600,
            })
          } else {
            reject(new Error('No access token in silent refresh response'))
          }
        },
      })
    }
    tryRefresh()
  })
}

export function signOut(accessToken: string): void {
  const g = (window as any).google
  if (g?.accounts?.oauth2 && accessToken) {
    g.accounts.oauth2.revoke(accessToken, () => {
      // Done clearing
    })
  }
}
