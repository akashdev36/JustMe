// Debug utilities for development
export function debugAuthState() {
  const user = localStorage.getItem('justme_user')
  console.log('Debug - Stored user data:', user ? 'EXISTS' : 'NULL')
  
  if (user) {
    try {
      const parsed = JSON.parse(user)
      console.log('Debug - User data structure:', {
        hasEmail: !!parsed.email,
        hasName: !!parsed.name,
        hasToken: !!parsed.token,
        hasTokenExpiry: !!parsed.tokenExpiry,
        tokenExpiry: parsed.tokenExpiry,
        isExpired: parsed.tokenExpiry ? Date.now() >= parsed.tokenExpiry : 'N/A'
      })
    } catch (error) {
      console.error('Debug - Failed to parse user data:', error)
    }
  }
}

// Call this in browser console to debug auth issues
if (import.meta.env.DEV) {
  (window as any).debugAuthState = debugAuthState
  console.log('Debug utilities available. Call debugAuthState() in console')
}
