// Download the try-on view in the background (its JS chunk, MediaPipe's WASM and the hand
// model), so "Try on my hand" doesn't wait on the network.

type TryOnModule = typeof import('./TryOn')

let chunk: Promise<TryOnModule> | null = null

/** The try-on chunk. App's lazy() and the preload share this promise, so it loads once. */
export function importTryOn(): Promise<TryOnModule> {
  chunk ??= import('./TryOn')
  chunk.catch(() => (chunk = null))
  return chunk
}

let preloading: Promise<unknown> | null = null

/** Start the downloads now (the user is reaching for the button, or the page is idle). A failure is retried next call. */
export function preloadTryOn(): void {
  preloading ??= importTryOn()
    .then(() => import('./tracker'))
    .then((t) => t.prefetchHandTracking())
  preloading.catch(() => (preloading = null))
}

interface Connection {
  saveData?: boolean
  effectiveType?: string
}

/** Data saver or a 2G link: don't spend ~20 MB on a view the user may never open. */
export const preloadAllowed = (c?: Connection) => !c?.saveData && !['slow-2g', '2g'].includes(c?.effectiveType ?? '')

/** Preload a few seconds after the page loads, once it is visible and the main thread is idle. */
export function preloadWhenIdle(delayMs = 3000): void {
  if (!preloadAllowed((navigator as Navigator & { connection?: Connection }).connection)) return
  const idle = () => {
    if (document.hidden) return document.addEventListener('visibilitychange', idle, { once: true })
    if (typeof requestIdleCallback === 'function') requestIdleCallback(preloadTryOn, { timeout: 5000 })
    else preloadTryOn() // Safari has no requestIdleCallback
  }
  const later = () => setTimeout(idle, delayMs)
  if (document.readyState === 'complete') later()
  else addEventListener('load', later, { once: true })
}
