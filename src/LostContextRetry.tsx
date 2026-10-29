import { Component, Fragment, type ReactNode } from 'react'

const RETRIES = 3
/** three on a lost context: Safari "…getShaderPrecisionFormat(…).precision", Chrome "reading 'precision'". */
const isLostContext = (error: unknown) => /precision|WebGL context/i.test(String(error instanceof Error ? error.message : error))

type State = { attempt: number; error?: unknown }

/**
 * A browser can hand out an already-lost WebGL context (GPU busy or out of memory) and three
 * throws on it. A new canvas gets a new context: remount the 3D view a few times, then let
 * Crash show the error.
 */
export class LostContextRetry extends Component<{ children: ReactNode }, State> {
  state: State = { attempt: 0 }
  private timer?: ReturnType<typeof setTimeout>

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  private retryable() {
    return this.state.attempt < RETRIES && isLostContext(this.state.error)
  }

  componentDidCatch() {
    if (!this.retryable()) return
    // Give the GPU a moment to free memory.
    this.timer = setTimeout(() => this.setState((s) => ({ attempt: s.attempt + 1, error: undefined })), 300 * (this.state.attempt + 1))
  }

  componentWillUnmount() {
    clearTimeout(this.timer)
  }

  render() {
    const { error, attempt } = this.state
    if (error === undefined) return <Fragment key={attempt}>{this.props.children}</Fragment>
    if (this.retryable()) return null
    throw error
  }
}
