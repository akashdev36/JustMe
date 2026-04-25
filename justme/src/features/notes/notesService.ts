import { useAuthStore } from '../auth/useAuthStore'
import type { NoteFile } from './noteTypes'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'
const FOLDER_CACHE_KEY = 'justme_notes_folder_id'
const IMAGES_FOLDER_CACHE_KEY = 'justme_images_folder_id'
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

/**
 * Ensures a specific folder exists inside a parent (or root if parentId is null).
 */
async function getOrCreateFolder(name: string, parentId?: string): Promise<string> {
  let q = `name = '${name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  if (parentId) {
    q += ` and '${parentId}' in parents`
  } else {
    q += ` and 'root' in parents`
  }

  const res = await driveFetch(`?q=${encodeURIComponent(q)}&fields=files(id)`)
  const data = (await res.json()) as { files: { id: string }[] }
  let folderId = data.files[0]?.id

  if (!folderId) {
    const createRes = await driveFetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    })
    const created = (await createRes.json()) as { id: string }
    folderId = created.id
  }

  return folderId!
}

export async function ensureNotesFolder(): Promise<string> {
  const cachedId = localStorage.getItem(FOLDER_CACHE_KEY)
  if (cachedId) return cachedId

  const rootId = await getOrCreateFolder('JustMe')
  const notesId = await getOrCreateFolder('Notes', rootId)
  localStorage.setItem(FOLDER_CACHE_KEY, notesId)
  return notesId
}

export async function ensureImagesFolder(): Promise<string> {
  const cachedId = localStorage.getItem(IMAGES_FOLDER_CACHE_KEY)
  if (cachedId) return cachedId

  const rootId = await getOrCreateFolder('JustMe')
  const imagesId = await getOrCreateFolder('Images', rootId)
  localStorage.setItem(IMAGES_FOLDER_CACHE_KEY, imagesId)
  return imagesId
}

export async function uploadImage(file: File): Promise<string> {
  const folderId = await ensureImagesFolder()
  
  // Multipart upload (Metadata + Media)
  const boundary = 'justme_upload_boundary'
  const metadata = {
    name: `${Date.now()}_${file.name}`,
    parents: [folderId]
  }

  const metadataPart = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    ''
  ].join('\r\n')

  const mediaHeader = [
    `--${boundary}`,
    `Content-Type: ${file.type}`,
    '',
    ''
  ].join('\r\n')

  const footer = `\r\n--${boundary}--`

  // We use Blob to combine the binary parts correctly without character encoding issues
  const arrayBuffer = await file.arrayBuffer()
  const multipartBlob = new Blob([
    metadataPart,
    mediaHeader,
    arrayBuffer,
    footer
  ], { type: `multipart/related; boundary=${boundary}` })

  const response = await driveFetch(`${UPLOAD_API}?uploadType=multipart`, {
    method: 'POST',
    body: multipartBlob,
  })

  const data = await response.json() as { id: string }
  return data.id
}

export async function getAuthenticatedImageUrl(fileId: string): Promise<string> {
  try {
    const response = await driveFetch(`/${fileId}?alt=media`)
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch (err) {
    console.error('Failed to fetch image from Drive', err)
    return ''
  }
}

export async function fetchAllNotes(): Promise<NoteFile[]> {
  try {
    const folderId = await ensureNotesFolder()
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
  const folderId = await ensureNotesFolder()
  const qStr = `name = '${note.id}.json' and '${folderId}' in parents and trashed = false`
  const checkRes = await driveFetch(`?q=${encodeURIComponent(qStr)}&fields=files(id)`)
  const checkData = (await checkRes.json()) as { files: { id: string }[] }
  const existingFile = checkData.files[0]
  const fileContent = JSON.stringify(note)

  if (existingFile) {
    await driveFetch(`${UPLOAD_API}/${existingFile.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: fileContent,
    })
  } else {
    // Multipart upload for the json file
    const boundary = 'justme_json_boundary'
    const multipartBody = new Blob([
      `--${boundary}\r\n`,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      JSON.stringify({ name: `${note.id}.json`, parents: [folderId] }),
      `\r\n--${boundary}\r\n`,
      'Content-Type: application/json\r\n\r\n',
      fileContent,
      `\r\n--${boundary}--`
    ], { type: `multipart/related; boundary=${boundary}` })

    await driveFetch(`${UPLOAD_API}?uploadType=multipart`, {
      method: 'POST',
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
  const folderId = await ensureNotesFolder()
  const qStr = `name = '${id}.json' and '${folderId}' in parents and trashed = false`
  const checkRes = await driveFetch(`?q=${encodeURIComponent(qStr)}&fields=files(id)`)
  const checkData = (await checkRes.json()) as { files: { id: string }[] }
  const existingFile = checkData.files[0]

  if (existingFile) {
    await driveFetch(`/${existingFile.id}`, { method: 'DELETE' })
  }
}
