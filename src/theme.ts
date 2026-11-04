// Colour theme: Emerald (default), Noir or Light. Kept on this device; set as <html data-theme>.

import { useEffect, useState } from 'react'

export const THEMES = ['emerald', 'noir', 'light'] as const
export type Theme = (typeof THEMES)[number]

/** The 3D preview's backdrop per theme (WebGL cannot read CSS variables). */
export const PREVIEW_BACKGROUND: Record<Theme, string> = { emerald: '#173A32', noir: '#1e1b18', light: '#f3f1ee' }

const KEY = 'ringon-theme'

function stored(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    if ((THEMES as readonly string[]).includes(v ?? '')) return v as Theme
  } catch {
    // Storage blocked (private mode): use the default.
  }
  return 'emerald'
}

// Before the first render, so the page never flashes the wrong colours.
if (typeof document !== 'undefined') document.documentElement.dataset.theme = stored()

/** The current theme and a function that moves to the next one. */
export function useTheme() {
  const [theme, setTheme] = useState(stored)
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(KEY, theme)
    } catch {
      // Not saved; the theme still applies until reload.
    }
  }, [theme])
  return [theme, () => setTheme((t) => THEMES[(THEMES.indexOf(t) + 1) % THEMES.length])] as const
}
