// videoService.ts — client-side video compression using canvas + MediaRecorder
// Compresses video by downscaling resolution and re-encoding at lower bitrate

export interface ProgressCallback {
  (percent: number): void
}

/**
 * Compress a video file in the browser.
 * - Scales down to max 720p
 * - Re-encodes at ~800kbps video + ~96kbps audio using WebM/VP9
 * - Runs in real-time (takes as long as the video duration)
 */
export async function compressVideo(
  file: File,
  onProgress?: ProgressCallback
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.src = URL.createObjectURL(file)
    video.muted = false
    video.preload = 'metadata'

    video.onloadedmetadata = async () => {
      const MAX_DIM = 720
      let w = video.videoWidth || 1280
      let h = video.videoHeight || 720

      // Scale down if needed
      if (w > MAX_DIM || h > MAX_DIM) {
        const ratio = Math.min(MAX_DIM / w, MAX_DIM / h)
        w = Math.round(w * ratio)
        h = Math.round(h * ratio)
      }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!

      // Canvas video stream (24fps)
      const videoStream = canvas.captureStream(24)

      // Audio passthrough from video element
      let combinedStream: MediaStream
      try {
        const audioCtx = new AudioContext()
        const src = audioCtx.createMediaElementSource(video)
        const dest = audioCtx.createMediaStreamDestination()
        src.connect(dest)
        combinedStream = new MediaStream([
          ...videoStream.getVideoTracks(),
          ...dest.stream.getAudioTracks(),
        ])
      } catch {
        // No audio or AudioContext not supported — video only
        combinedStream = videoStream
      }

      // Pick best available codec
      const mimeTypes = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ]
      const mimeType = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm'

      const recorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 800_000,  // 800 kbps
        audioBitsPerSecond: 96_000,   // 96 kbps
      })

      const chunks: Blob[] = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data)
      }
      recorder.onstop = () => {
        URL.revokeObjectURL(video.src)
        resolve(new Blob(chunks, { type: mimeType }))
      }
      recorder.onerror = (e) => reject(e)

      // Start recording, collect chunks every 500ms
      recorder.start(500)

      // Draw frames
      let animFrame: number
      const drawFrame = () => {
        if (video.ended || video.paused) return
        ctx.drawImage(video, 0, 0, w, h)
        // Report compression progress (0–50% is compression phase)
        const pct = video.duration > 0 ? (video.currentTime / video.duration) * 50 : 0
        onProgress?.(Math.round(pct))
        animFrame = requestAnimationFrame(drawFrame)
      }

      video.onplay = () => { animFrame = requestAnimationFrame(drawFrame) }
      video.onended = () => {
        cancelAnimationFrame(animFrame)
        setTimeout(() => recorder.stop(), 500) // flush last chunk
      }
      video.onerror = (e) => reject(e)

      video.play().catch(reject)
    }

    video.onerror = () => reject(new Error('Failed to load video for compression'))
  })
}

/**
 * Format bytes to human-readable size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
