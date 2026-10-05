// Plays still photos as the camera: getUserMedia returns a canvas stream, and
// `window.showPhoto(dataUrl | null)` swaps the photo (null = an empty frame).
import { readFileSync } from 'node:fs'
import type { Page } from '@playwright/test'

export const photoDataUrl = (file: string) => `data:image/jpeg;base64,${readFileSync(file).toString('base64')}`

export async function usePhotoCamera(page: Page) {
  await page.addInitScript(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 640
    canvas.height = 480
    const ctx = canvas.getContext('2d')!
    let img: HTMLImageElement | null = null
    // A canvas stream only emits frames when the canvas is painted.
    const paint = () => {
      if (img) ctx.drawImage(img, 0, 0)
      else ctx.fillRect(0, 0, canvas.width, canvas.height)
      requestAnimationFrame(paint)
    }
    paint()
    Object.assign(window, {
      showPhoto: async (src: string | null) => {
        if (!src) return void (img = null)
        const next = new Image()
        next.src = src
        await next.decode()
        canvas.width = next.naturalWidth
        canvas.height = next.naturalHeight
        img = next
      },
    })
    navigator.mediaDevices.getUserMedia = async () => canvas.captureStream(30)
  })
}

declare global {
  interface Window {
    showPhoto: (src: string | null) => Promise<void>
  }
}
