import React, { useEffect, useRef, useState, useCallback } from 'react'
import { useNotesStore } from '../notes/useNotesStore'
import { useAuthStore } from '../auth/useAuthStore'
import NotesEditor from '../notes/NotesEditor'
import ArticleReader from '../notes/ArticleReader'
import { compressVideo, formatFileSize } from './videoService'
import * as notesService from '../notes/notesService'

// Wire up notesService token getter (idempotent — safe to call multiple times)
notesService.configureTokenGetter(() => {
  const token = useAuthStore.getState().getValidToken()
  if (!token) throw new Error('Not authenticated')
  return token
})

interface DayJournalViewProps {
  dateStr: string
  isToday: boolean
  onClose: () => void
}

// ─── Video Player Component ─────────────────────────────────────────────────
function VideoPlayer({ driveFileId, title }: { driveFileId: string; title: string }) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let url = ''
    setIsLoading(true)
    setError(false)

    notesService.getVideoUrl(driveFileId).then((u) => {
      if (u) { url = u; setBlobUrl(u) }
      else setError(true)
    }).catch(() => setError(true))
    .finally(() => setIsLoading(false))

    return () => { if (url) URL.revokeObjectURL(url) }
  }, [driveFileId])

  if (isLoading) return (
    <div className="w-full aspect-video bg-gray-900 rounded-2xl flex items-center justify-center">
      <div className="w-7 h-7 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )

  if (error) return (
    <div className="w-full aspect-video bg-gray-100 rounded-2xl flex items-center justify-center">
      <p className="text-gray-400 text-sm">Failed to load video</p>
    </div>
  )

  return (
    <video
      src={blobUrl!}
      controls
      playsInline
      className="w-full aspect-video rounded-2xl bg-black object-contain"
      style={{
        // Custom native controls look better than YouTube
        maxHeight: '240px',
      }}
      aria-label={title}
    />
  )
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function DayJournalView({ dateStr, isToday, onClose }: DayJournalViewProps): React.ReactElement {
  const { notes, findJournalNote, createJournalNote, updateNote, isLoading: storeLoading } = useNotesStore()
  const [journalNoteId, setJournalNoteId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isClosing, setIsClosing] = useState(false)

  // Special day state
  const [showStarModal, setShowStarModal] = useState(false)
  const [starReason, setStarReason] = useState('')

  // Video state
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'compressing' | 'uploading' | 'done'>('idle')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [pendingFileInfo, setPendingFileInfo] = useState<string | null>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const creationGuard = useRef(false)

  const note = findJournalNote(dateStr)
  const isSpecial = !!note?.specialDay
  const videos = note?.videos || []

  // Init journal
  useEffect(() => {
    let cancelled = false
    async function init() {
      if (storeLoading && notes.length === 0) return
      if (note) {
        if (!cancelled) { setJournalNoteId(note.id); setIsInitializing(false) }
      } else if (isToday && !creationGuard.current && !storeLoading) {
        creationGuard.current = true
        try {
          const newId = await createJournalNote(dateStr)
          if (!cancelled) setJournalNoteId(newId)
        } finally {
          if (!cancelled) setIsInitializing(false)
        }
      } else if (!storeLoading) {
        if (!cancelled) setIsInitializing(false)
      }
    }
    init()
    return () => { cancelled = true }
  }, [dateStr, isToday, note, storeLoading, notes.length])

  // Swipe-down to close
  const touchStartY = useRef<number | null>(null)
  const handleTouchStart = (e: React.TouchEvent) => { touchStartY.current = e.touches[0].clientY }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    if (e.changedTouches[0].clientY - touchStartY.current > 80) handleClose()
    touchStartY.current = null
  }
  const handleClose = () => { setIsClosing(true); setTimeout(onClose, 220) }

  // Special day handlers
  const handleStarClick = () => {
    if (isSpecial) { if (note) updateNote(note.id, { specialDay: undefined }) }
    else { setStarReason(''); setShowStarModal(true) }
  }
  const handleStarConfirm = () => {
    const trimmed = starReason.trim()
    if (!trimmed || !note) return
    updateNote(note.id, { specialDay: { reason: trimmed, markedAt: new Date().toISOString() } })
    setShowStarModal(false); setStarReason('')
  }

  // Video upload: compress then upload to Drive
  const handleVideoFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !note) return
    e.target.value = ''

    setUploadError(null)
    setPendingFileInfo(`${file.name} (${formatFileSize(file.size)})`)

    try {
      // Phase 1: Compress (0–50%)
      setUploadPhase('compressing')
      setUploadProgress(0)
      const compressed = await compressVideo(file, (p) => setUploadProgress(Math.round(p * 0.5)))

      // Phase 2: Upload to Drive (50–100%)
      setUploadPhase('uploading')
      const filename = `journal-${dateStr}-${Date.now()}.webm`
      const driveFileId = await notesService.uploadVideoToDrive(
        compressed,
        filename,
        (p) => setUploadProgress(50 + Math.round(p * 0.5))
      )

      // Save to note
      const updatedVideos = [
        ...(note.videos || []),
        { driveFileId, title: file.name, uploadedAt: new Date().toISOString() },
      ]
      updateNote(note.id, { videos: updatedVideos })
      setUploadPhase('done')
      setTimeout(() => { setUploadPhase('idle'); setPendingFileInfo(null) }, 1500)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Upload failed'
      setUploadError(msg)
      setUploadPhase('idle')
    }
  }, [note, dateStr, updateNote])

  const handleDeleteVideo = (driveFileId: string) => {
    if (!note) return
    updateNote(note.id, { videos: (note.videos || []).filter(v => v.driveFileId !== driveFileId) })
  }

  const displayDate = new Date(`${dateStr}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  })

  const isUploading = uploadPhase === 'compressing' || uploadPhase === 'uploading'

  return (
    <div
      className={[
        'fixed inset-0 z-[70] bg-white flex flex-col',
        isClosing ? 'animate-out slide-out-to-bottom duration-200' : 'animate-in slide-in-from-bottom duration-300',
      ].join(' ')}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="pt-safe flex-shrink-0">
        <div className="h-[56px] px-4 border-b border-gray-100 flex items-center justify-between">
          <button onClick={handleClose} className="p-2 -ml-1 rounded-full hover:bg-gray-50 text-gray-500 transition-all active:scale-90" aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
          </button>

          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold text-[#00aeb1] uppercase tracking-widest leading-none mb-0.5">Daily Journal</span>
            <span className="text-[14px] font-bold text-gray-900 leading-none">{displayDate}</span>
          </div>

          {isToday && journalNoteId ? (
            <div className="flex items-center gap-0.5">
              {/* Video upload button */}
              <input ref={videoInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFileChange} />
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploading}
                className="p-2 rounded-full hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-all active:scale-90 disabled:opacity-40"
                title="Upload video"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
              </button>

              {/* Star button */}
              <button
                onClick={handleStarClick}
                className={`p-2 rounded-full transition-all active:scale-90 ${isSpecial ? 'text-amber-400 hover:bg-amber-50' : 'text-gray-300 hover:bg-gray-50 hover:text-gray-400'}`}
                title={isSpecial ? 'Remove special day' : 'Mark as special day'}
              >
                {isSpecial
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                }
              </button>
            </div>
          ) : (
            <div className="w-10" />
          )}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto scroll-container">

        {/* Upload progress banner */}
        {(isUploading || uploadPhase === 'done') && (
          <div className="mx-4 mt-3 mb-1">
            <div className={`rounded-2xl p-3 border transition-all ${uploadPhase === 'done' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
              <div className="flex items-center gap-2 mb-2">
                {uploadPhase === 'done'
                  ? <span className="text-green-500">✓</span>
                  : <div className="w-3.5 h-3.5 border-2 border-blue-200 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
                }
                <span className={`text-[12px] font-semibold flex-1 ${uploadPhase === 'done' ? 'text-green-700' : 'text-blue-700'}`}>
                  {uploadPhase === 'compressing' && `Compressing video… ${uploadProgress}%`}
                  {uploadPhase === 'uploading' && `Uploading to Drive… ${uploadProgress}%`}
                  {uploadPhase === 'done' && 'Video saved!'}
                </span>
                {pendingFileInfo && <span className="text-[10px] text-gray-400 truncate max-w-[100px]">{pendingFileInfo}</span>}
              </div>
              {uploadPhase !== 'done' && (
                <div className="w-full h-1.5 bg-blue-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Upload error */}
        {uploadError && (
          <div className="mx-4 mt-3 mb-1 bg-red-50 border border-red-200 rounded-2xl p-3 flex items-start gap-2">
            <span className="text-red-500 flex-shrink-0 text-sm">⚠️</span>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-red-700">Upload failed</p>
              <p className="text-[11px] text-red-400 truncate">{uploadError}</p>
            </div>
            <button onClick={() => setUploadError(null)} className="text-red-300 hover:text-red-500 flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* Special Day banner */}
        {isSpecial && note?.specialDay && (
          <div className="mx-4 mt-3 mb-1 flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-300 rounded-2xl">
            <span className="text-base leading-none">✨</span>
            <p className="flex-1 text-[13px] font-medium italic text-amber-700 leading-snug">{note.specialDay.reason}</p>
            {isToday && (
              <button onClick={handleStarClick} className="text-amber-400 hover:text-amber-600 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            )}
          </div>
        )}

        {/* Video Gallery */}
        {videos.length > 0 && (
          <div className="mx-4 mt-3 mb-1 space-y-3">
            {videos.map((v) => (
              <div key={v.driveFileId} className="relative group">
                <VideoPlayer driveFileId={v.driveFileId} title={v.title} />
                <div className="flex items-center justify-between mt-1 px-1">
                  <span className="text-[11px] text-gray-400 truncate max-w-[70%]">{v.title}</span>
                  <span className="text-[10px] text-gray-300">
                    {new Date(v.uploadedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                {isToday && (
                  <button
                    onClick={() => handleDeleteVideo(v.driveFileId)}
                    className="absolute top-2 right-2 w-7 h-7 bg-black/50 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    title="Remove video"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Journal content */}
        <div className={videos.length > 0 || isSpecial ? 'mt-2' : ''}>
          {isInitializing || (isToday && !journalNoteId) ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-teal-100 border-t-[#00aeb1] rounded-full animate-spin" />
            </div>
          ) : journalNoteId && isToday ? (
            <NotesEditor noteId={journalNoteId} />
          ) : note ? (
            <ArticleReader content={note.content} embedded />
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400 px-8 text-center gap-2">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-200">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              <p className="text-[15px] font-medium">No entry for this date</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Special Day Modal ──────────────────────────────────────────── */}
      {showStarModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setShowStarModal(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-[28px] shadow-2xl p-6 animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
            </div>
            <h3 className="text-[17px] font-bold text-gray-900 text-center mb-1">Mark as Special Day</h3>
            <p className="text-[13px] text-gray-400 text-center mb-5">Why is today special?</p>
            <input
              autoFocus type="text" value={starReason}
              onChange={e => setStarReason(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleStarConfirm(); if (e.key === 'Escape') setShowStarModal(false) }}
              placeholder="E.g. First day at new job" maxLength={120}
              className="w-full h-12 px-4 bg-gray-50 border-2 border-transparent focus:border-amber-300 rounded-2xl outline-none text-[14px] transition-all mb-5"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowStarModal(false)} className="flex-1 h-12 rounded-2xl font-semibold text-gray-400 hover:bg-gray-50 transition-all">Cancel</button>
              <button
                onClick={handleStarConfirm} disabled={!starReason.trim()}
                className="flex-1 h-12 rounded-2xl bg-amber-400 text-white font-bold hover:bg-amber-500 disabled:opacity-40 active:scale-95 transition-all"
              >★ Mark Special</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
