export type DecodedGoogleUser = {
  name: string
  email: string
  picture: string
  token: string
}

export async function fetchUserProfile(accessToken: string): Promise<DecodedGoogleUser> {
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
  }
}
