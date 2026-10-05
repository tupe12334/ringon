// Records the try-on canvas (camera image + ring) as a video clip, or grabs a photo.

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'

export interface Capture {
  kind: 'video' | 'photo'
  blob: Blob
  url: string
}

/** First container the browser can record: MP4 on Safari, WebM elsewhere. */
export function pickMimeType(isSupported: (t: string) => boolean = (t) => MediaRecorder.isTypeSupported(t)) {
  return ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find(isSupported) ?? ''
}

export function useRecorder(canvasRef: RefObject<HTMLCanvasElement | null>) {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const [result, setResult] = useState<Capture | null>(null)
  const rec = useRef<MediaRecorder | null>(null)
  const supported = typeof MediaRecorder !== 'undefined' && typeof HTMLCanvasElement.prototype.captureStream === 'function'

  const show = useCallback((c: Capture) => {
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return c
    })
  }, [])

  const start = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || !supported) return
    const mimeType = pickMimeType()
    const r = new MediaRecorder(canvas.captureStream(30), mimeType ? { mimeType, videoBitsPerSecond: 6_000_000 } : undefined)
    const chunks: Blob[] = []
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    r.onstop = () => {
      const blob = new Blob(chunks, { type: r.mimeType || 'video/webm' })
      show({ kind: 'video', blob, url: URL.createObjectURL(blob) })
    }
    r.start(250)
    rec.current = r
    setSeconds(0)
    setRecording(true)
  }, [canvasRef, supported, show])

  const stop = useCallback(() => {
    rec.current?.stop()
    rec.current = null
    setRecording(false)
  }, [])

  useEffect(() => {
    if (!recording) return
    const id = setInterval(() => setSeconds((s) => s + 1), 1000)
    // Keep clips short enough to share.
    const limit = setTimeout(stop, 60_000)
    return () => {
      clearInterval(id)
      clearTimeout(limit)
    }
  }, [recording, stop])

  useEffect(() => () => rec.current?.stop(), [])

  const snapshot = useCallback(() => {
    canvasRef.current?.toBlob((blob) => blob && show({ kind: 'photo', blob, url: URL.createObjectURL(blob) }), 'image/jpeg', 0.92)
  }, [canvasRef, show])

  const share = useCallback(async () => {
    if (!result) return
    const ext = result.kind === 'photo' ? 'jpg' : result.blob.type.includes('mp4') ? 'mp4' : 'webm'
    const file = new File([result.blob], `ringon-try-on.${ext}`, { type: result.blob.type })
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'My Ringon ring' })
        return
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return // user closed the share sheet
      }
    }
    const a = document.createElement('a')
    a.href = result.url
    a.download = file.name
    a.click()
  }, [result])

  const dismiss = useCallback(() => {
    setResult((prev) => {
      if (prev) URL.revokeObjectURL(prev.url)
      return null
    })
  }, [])

  return { supported, recording, seconds, start, stop, snapshot, result, share, dismiss }
}
