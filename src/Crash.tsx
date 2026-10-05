import { Component, type ReactNode } from 'react'
import { DEFAULT_SPEC } from './ring/spec'
import { useStore } from './templates/store'

const hasWebGL = () => {
  try {
    return !!document.createElement('canvas').getContext('webgl2')
  } catch {
    return false
  }
}

/** Anything that throws while rendering lands here instead of leaving a blank page. */
export class Crash extends Component<{ children: ReactNode }, { error?: unknown }> {
  state: { error?: unknown } = {}

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (error === undefined) return this.props.children
    // A lazy chunk from the previous deploy is gone: a reload fetches the new version.
    const stale = /dynamically imported module|Importing a module script failed|Failed to fetch/i.test(String(error))
    const message = stale
      ? 'Ringon was updated. Reload to get the new version.'
      : !hasWebGL()
        ? 'This browser cannot draw 3D (WebGL 2 is off or unsupported). Try an up-to-date Chrome, Safari or Firefox.'
        : 'Something went wrong.'
    return (
      <div className="crash" role="alert">
        <h1>Ringon</h1>
        <p>{message}</p>
        <div className="crash-actions">
          <button className="primary" onClick={() => location.reload()}>Reload</button>
          {!stale && (
            <button
              onClick={() => {
                // The design on screen (from a link or saved) can be the cause: drop it, keep saved templates.
                useStore.getState().setSpec(DEFAULT_SPEC)
                location.replace(location.pathname)
              }}
            >
              Start a new design
            </button>
          )}
        </div>
        {!stale && <pre>{String(error instanceof Error ? error.message : error)}</pre>}
      </div>
    )
  }
}
