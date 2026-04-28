// Public API for the auth feature
// Other features and the router ONLY import from here — never from internal files

export { default as SignInPage } from './SignInPage'
export {
  useAuthStore,
  useAuthUser,
  useAuthIsLoggedIn,
  useAuthIsLoading,
  useAuthError,
  useAuthValidToken,
  useAuthStatus,
} from './useAuthStore'
export { useAuthInit } from './useAuthInit'
export { fetchUserProfile } from './authService'
