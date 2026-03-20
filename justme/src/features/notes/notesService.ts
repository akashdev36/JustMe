import { useAuthStore } from '../auth/useAuthStore'
import type { NoteFile } from './noteTypes'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'
const FOLDER_CACHE_KEY = 'justme_notes_folder_id'
const OFFLINE_CACHE_KEY = 'justme_notes_cache'

function getToken(): string {
  const user = useAuthStore.getState().user
  if (!user?.token) {
    throw new Error('Not authenticated with Google')
  }
  return user.token
}

async function driveFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken()
  const url = path.startsWith('http') ? path : `${DRIVE_API}${path}`
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  })

  if (!response.ok) {
    if (response.status === 401) {
      useAuthStore.getState().logout()
    }
    throw new Error(`Drive API error: ${response.status} ${await response.text()}`)
  }

  return response
}

export async function ensureFolder(): Promise<string> {
  const cachedId = localStorage.getItem(FOLDER_CACHE_KEY)

  if (cachedId) {
    try {
      await driveFetch(`/${cachedId}?fields=id`)
      return cachedId
    } catch {
      localStorage.removeItem(FOLDER_CACHE_KEY)
    }
  }

  // 1. Check JustMe Folder
  const qStr1 = "name = 'JustMe' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
  const res1 = await driveFetch(`?q=${encodeURIComponent(qStr1)}&fields=files(id)`)
  const data1 = (await res1.json()) as { files: { id: string }[] }
  let justMeId = data1.files[0]?.id

  if (!justMeId) {
    const create1 = await driveFetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'JustMe', mimeType: 'application/vnd.google-apps.folder' }),
    })
    const created1 = (await create1.json()) as { id: string }
    justMeId = created1.id
  }

  // 2. Check Notes Folder inside JustMe
  const qStr2 = `name = 'Notes' and '${justMeId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  const res2 = await driveFetch(`?q=${encodeURIComponent(qStr2)}&fields=files(id)`)
  const data2 = (await res2.json()) as { files: { id: string }[] }
  let notesId = data2.files[0]?.id

  if (!notesId) {
    const create2 = await driveFetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Notes',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [justMeId],
      }),
    })
    const created2 = (await create2.json()) as { id: string }
    notesId = created2.id
  }

  if (notesId) {
    localStorage.setItem(FOLDER_CACHE_KEY, notesId)
    return notesId
  }
  throw new Error('Failed to create or find notes folder')
}

export async function fetchAllNotes(): Promise<NoteFile[]> {
  try {
    const folderId = await ensureFolder()
    const qStr = `'${folderId}' in parents and trashed = false`
    const listRes = await driveFetch(`?q=${encodeURIComponent(qStr)}&fields=files(id,name)`)
    const listData = (await listRes.json()) as { files: { id: string; name: string }[] }

    const notesPromise = listData.files.map(async (f) => {
      try {
        const fileRes = await driveFetch(`/${f.id}?alt=media`)
        return (await fileRes.json()) as NoteFile
      } catch {
        return null
      }
    })

    const results = await Promise.all(notesPromise)
    const validNotes = results.filter((n): n is NoteFile => n !== null)
    return validNotes
  } catch (err) {
    console.error('Failed fetching from Drive, loading local cache fallback.', err)
    const cache = localStorage.getItem(OFFLINE_CACHE_KEY)
    return cache ? (JSON.parse(cache) as NoteFile[]) : []
  }
}

async function _saveNote(note: NoteFile): Promise<void> {
  const folderId = await ensureFolder()
  const qStr = `name = '${note.id}.json' and '${folderId}' in parents and trashed = false`
  const checkRes = await driveFetch(`?q=${encodeURIComponent(qStr)}&fields=files(id)`)
  const checkData = (await checkRes.json()) as { files: { id: string }[] }
  const existingFile = checkData.files[0]

  const fileContent = JSON.stringify(note)

  if (existingFile) {
    // Update
    await driveFetch(`${UPLOAD_API}/${existingFile.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: fileContent,
    })
  } else {
    // Create Multipart
    const boundary = 'foo_bar_boundary'
    const multipartBody = [
      `--${boundary}`,
      'Content-Type: application/json; charset=UTF-8',
      '',
      JSON.stringify({ name: `${note.id}.json`, parents: [folderId] }),
      `--${boundary}`,
      'Content-Type: application/json',
      '',
      fileContent,
      `--${boundary}--`,
    ].join('\r\n')

    await driveFetch(`${UPLOAD_API}?uploadType=multipart`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/related; boundary=${boundary}` },
      body: multipartBody,
    })
  }
}

export async function saveNote(note: NoteFile): Promise<void> {
  try {
    await _saveNote(note)
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      localStorage.removeItem(FOLDER_CACHE_KEY)
      await _saveNote(note)
    } else {
      throw err
    }
  }
}

export async function deleteNote(id: string): Promise<void> {
  const folderId = await ensureFolder()
  const qStr = `name = '${id}.json' and '${folderId}' in parents and trashed = false`
  const checkRes = await driveFetch(`?q=${encodeURIComponent(qStr)}&fields=files(id)`)
  const checkData = (await checkRes.json()) as { files: { id: string }[] }
  const existingFile = checkData.files[0]

  if (existingFile) {
    await driveFetch(`/${existingFile.id}`, { method: 'DELETE' })
  }
}
