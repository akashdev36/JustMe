import type { NoteFile } from '../../shared/types'
import { NOTES_STORAGE_KEYS } from './storage'

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'

// ─────────────────────────────────────────────────────────
// Token injection — notesService never imports useAuthStore.
// Call configureTokenGetter() once from useNotesStore.
// ─────────────────────────────────────────────────────────
let _tokenGetter: (() => string) | null = null

export function configureTokenGetter(getter: () => string): void {
  _tokenGetter = getter
}

function getToken(): string {
  if (!_tokenGetter) {
    throw new Error('Notes service: token getter not configured')
  }
  return _tokenGetter()
}

// ─────────────────────────────────────────────────────────
// Drive API helpers
// ─────────────────────────────────────────────────────────
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
      // Token expired — clear it so the app re-authenticates
      _tokenGetter = null
    }
    throw new Error(`Drive API error: ${response.status} ${await response.text()}`)
  }

  return response
}

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
  const cachedId = localStorage.getItem(NOTES_STORAGE_KEYS.FOLDER)
  if (cachedId) return cachedId

  const rootId = await getOrCreateFolder('JustMe')
  const notesId = await getOrCreateFolder('Notes', rootId)
  localStorage.setItem(NOTES_STORAGE_KEYS.FOLDER, notesId)
  return notesId
}

export async function ensureImagesFolder(): Promise<string> {
  const cachedId = localStorage.getItem(NOTES_STORAGE_KEYS.IMAGES_FOLDER)
  if (cachedId) return cachedId

  const rootId = await getOrCreateFolder('JustMe')
  const imagesId = await getOrCreateFolder('Images', rootId)
  localStorage.setItem(NOTES_STORAGE_KEYS.IMAGES_FOLDER, imagesId)
  return imagesId
}

export async function ensureVideosFolder(): Promise<string> {
  const cachedId = localStorage.getItem(NOTES_STORAGE_KEYS.VIDEOS_FOLDER)
  if (cachedId) return cachedId

  const rootId = await getOrCreateFolder('JustMe')
  const videosId = await getOrCreateFolder('Videos', rootId)
  localStorage.setItem(NOTES_STORAGE_KEYS.VIDEOS_FOLDER, videosId)
  return videosId
}

export async function uploadVideoToDrive(
  videoBlob: Blob,
  filename: string,
  onProgress?: (percent: number) => void
): Promise<string> {
  const folderId = await ensureVideosFolder()
  const token = getToken()

  const metadata = {
    name: filename,
    parents: [folderId],
    mimeType: videoBlob.type || 'video/webm',
  }

  // Step 1: initiate resumable upload session
  const initRes = await fetch(
    `${UPLOAD_API}?uploadType=resumable`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': videoBlob.type || 'video/webm',
        'X-Upload-Content-Length': String(videoBlob.size),
      },
      body: JSON.stringify(metadata),
    }
  )

  if (!initRes.ok) throw new Error(`Drive video upload init failed: ${initRes.status}`)
  const uploadUri = initRes.headers.get('Location')
  if (!uploadUri) throw new Error('No upload URI from Drive')

  // Step 2: upload in 5MB chunks
  const CHUNK = 5 * 1024 * 1024
  let offset = 0
  let fileId = ''

  while (offset < videoBlob.size) {
    const end = Math.min(offset + CHUNK, videoBlob.size)
    const chunk = videoBlob.slice(offset, end)
    const currentToken = getToken()

    const chunkRes = await fetch(uploadUri, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${currentToken}`,
        'Content-Range': `bytes ${offset}-${end - 1}/${videoBlob.size}`,
        'Content-Type': videoBlob.type || 'video/webm',
      },
      body: chunk,
    })

    if (chunkRes.status === 200 || chunkRes.status === 201) {
      const data = await chunkRes.json()
      fileId = data.id
      onProgress?.(100)
      break
    } else if (chunkRes.status === 308) {
      const range = chunkRes.headers.get('Range')
      offset = range ? parseInt(range.split('-')[1], 10) + 1 : end
      onProgress?.(Math.round((offset / videoBlob.size) * 95))
    } else {
      throw new Error(`Video upload chunk failed: ${chunkRes.status}`)
    }
  }

  if (!fileId) throw new Error('Upload completed but no file ID returned')
  return fileId
}

export async function getVideoUrl(driveFileId: string): Promise<string> {
  try {
    const response = await driveFetch(`/${driveFileId}?alt=media`)
    const blob = await response.blob()
    return URL.createObjectURL(blob)
  } catch (err) {
    console.error('Failed to fetch video from Drive', err)
    return ''
  }
}

export async function uploadImage(file: File): Promise<string> {
  const folderId = await ensureImagesFolder()

  const boundary = 'justme_upload_boundary'
  const metadata = {
    name: `${Date.now()}_${file.name}`,
    parents: [folderId],
  }

  const metadataPart = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    '',
  ].join('\r\n')

  const mediaHeader = [`--${boundary}`, `Content-Type: ${file.type}`, '', ''].join('\r\n')
  const footer = `\r\n--${boundary}--`

  const arrayBuffer = await file.arrayBuffer()
  const multipartBlob = new Blob([metadataPart, mediaHeader, arrayBuffer, footer], {
    type: `multipart/related; boundary=${boundary}`,
  })

  const response = await driveFetch(`${UPLOAD_API}?uploadType=multipart`, {
    method: 'POST',
    body: multipartBlob,
  })

  const data = (await response.json()) as { id: string }
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
    
    // Step 1: Get the list of files (with driveId)
    const listRes = await driveFetch(`?q=${encodeURIComponent(qStr)}&fields=files(id,name)`)
    const listData = (await listRes.json()) as { files: { id: string; name: string }[] }

    // Step 2: Read each file's actual content (the only reliable source for existing notes)
    const notesPromises = listData.files.map(async (f) => {
      try {
        const fileRes = await driveFetch(`/${f.id}?alt=media`)
        const note = (await fileRes.json()) as NoteFile
        // Attach the Drive file ID for faster future access
        return { ...note, driveId: f.id } as NoteFile
      } catch {
        return null
      }
    })

    const results = await Promise.all(notesPromises)
    return results.filter(Boolean) as NoteFile[]
  } catch (err) {
    console.error('Failed fetching from Drive', err)
    const cache = localStorage.getItem(NOTES_STORAGE_KEYS.CACHE)
    return cache ? (JSON.parse(cache) as NoteFile[]) : []
  }
}

export async function fetchNoteContent(fileId: string): Promise<any[]> {
  const res = await driveFetch(`/${fileId}?alt=media`)
  const data = await res.json()
  return data.content || []
}

async function _saveNote(note: NoteFile): Promise<string> {
  const folderId = await ensureNotesFolder()
  const qStr = `name = '${note.id}.json' and '${folderId}' in parents and trashed = false`
  const checkRes = await driveFetch(`?q=${encodeURIComponent(qStr)}&fields=files(id)`)
  const checkData = (await checkRes.json()) as { files: { id: string }[] }
  const existingFile = checkData.files[0]
  
  const metadata = {
    name: `${note.id}.json`,
    parents: existingFile ? undefined : [folderId],
    appProperties: {
      id: note.id,
      title: note.title,
      pinned: String(!!note.pinned),
      tags: (note.tags || []).join(','),
      updatedAt: note.updatedAt
    }
  }

  const fileContent = JSON.stringify(note)

  if (existingFile) {
    // Update metadata (appProperties)
    await driveFetch(`/${existingFile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ appProperties: metadata.appProperties, name: metadata.name })
    })
    
    // Update content
    await driveFetch(`${UPLOAD_API}/${existingFile.id}?uploadType=media`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: fileContent,
    })
    return existingFile.id
  } else {
    const boundary = 'justme_json_boundary'
    const multipartBody = new Blob(
      [
        `--${boundary}\r\n`,
        'Content-Type: application/json; charset=UTF-8\r\n\r\n',
        JSON.stringify(metadata),
        `\r\n--${boundary}\r\n`,
        'Content-Type: application/json\r\n\r\n',
        fileContent,
        `\r\n--${boundary}--`,
      ],
      { type: `multipart/related; boundary=${boundary}` }
    )

    const res = await driveFetch(`${UPLOAD_API}?uploadType=multipart`, {
      method: 'POST',
      body: multipartBody,
    })
    const data = await res.json()
    return data.id
  }
}

export async function saveNote(note: NoteFile): Promise<string> {
  try {
    return await _saveNote(note)
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      localStorage.removeItem(NOTES_STORAGE_KEYS.FOLDER)
      return await _saveNote(note)
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
