export type DecodedGoogleUser = {
  name: string
  email: string
  picture: string
  token: string
  tokenExpiry: number // Unix ms — when the access token expires
}

export async function fetchUserProfile(
  accessToken: string,
  expiresIn = 3600
): Promise<DecodedGoogleUser> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch user profile: ${res.status}`)
  }

  const parsed = await res.json() as {
    name?: string
    email?: string
    picture?: string
    sub?: string
  }

  return {
    name: parsed.name ?? '',
    email: parsed.email ?? '',
    picture: parsed.picture ?? '',
    token: accessToken,
    // Subtract 60s buffer so we refresh before it actually expires
    tokenExpiry: Date.now() + (expiresIn - 60) * 1000,
  }
}
