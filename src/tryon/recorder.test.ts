import { describe, expect, it } from 'vitest'
import { pickMimeType } from './recorder'

describe('recording format', () => {
  it('prefers MP4 (Safari/iOS can play and share it)', () => {
    expect(pickMimeType(() => true)).toBe('video/mp4;codecs=avc1')
  })
  it('falls back to WebM on browsers without MP4 recording', () => {
    expect(pickMimeType((t) => t.startsWith('video/webm'))).toBe('video/webm;codecs=vp9')
  })
  it('lets the browser choose when nothing matches', () => {
    expect(pickMimeType(() => false)).toBe('')
  })
})
