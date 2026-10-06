// The phone camera as a playing <video>, with an error when it is refused or never starts.

import { useEffect, useState } from 'react'
import i18n from '../i18n'

export type Facing = 'environment' | 'user'

/** How long a granted camera may take to deliver video before we call it stuck. */
const CAMERA_START_TIMEOUT_MS = 15_000

export function useCamera(facing: Facing) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let stream: MediaStream | null = null
    let cancelled = false
    const el = document.createElement('video')
    el.playsInline = true
    el.muted = true
    el.setAttribute('playsinline', '')
    // Kept in the document (invisibly) so browsers never pause it as a background element.
    el.className = 'camera-source'
    document.body.append(el)
    const stop = () => stream?.getTracks().forEach((t) => t.stop())
    // getUserMedia can hang without ever failing (camera held by another app, some browsers).
    // It also waits while the permission prompt is open, so only give up once access is granted.
    // (iOS Safari may keep reporting 'prompt' after the user allowed it: then no message.)
    const stuck = setTimeout(async () => {
      const state = await navigator.permissions?.query({ name: 'camera' as PermissionName }).then((p) => p.state, () => null)
      if (!cancelled && !stream && state === 'granted') setError(i18n.t('tryon.cameraStuck'))
    }, CAMERA_START_TIMEOUT_MS)
    ;(async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error(i18n.t('tryon.noCamera'))
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
        if (cancelled) return stop()
        el.srcObject = stream
        await el.play()
        if (!cancelled) {
          setError('') // a late stream beats an earlier "did not start"
          setVideo(el)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    })()
    return () => {
      clearTimeout(stuck)
      setError('') // the next attempt (e.g. after switching camera) starts clean
      cancelled = true
      stop()
      el.srcObject = null
      el.remove()
      setVideo(null)
    }
  }, [facing])
  return { video, error }
}
