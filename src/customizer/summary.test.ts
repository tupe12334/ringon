import { afterAll, describe, expect, it } from 'vitest'
import i18n from '../i18n'
import { DEFAULT_SPEC } from '../ring/spec'
import { summary } from './summary'

describe('summary', () => {
  afterAll(() => i18n.changeLanguage('en'))

  it('writes gem and cut names mid-sentence the way each language does', async () => {
    await i18n.changeLanguage('en')
    expect(summary(DEFAULT_SPEC, 'us')).toMatch(/round brilliant diamond/)
    await i18n.changeLanguage('de')
    expect(summary(DEFAULT_SPEC, 'us')).toMatch(/Diamant/)
    await i18n.changeLanguage('chr')
    // No Cherokee small letters (U+AB70–U+ABBF).
    expect(summary(DEFAULT_SPEC, 'us')).not.toMatch(/[ꭰ-ꮿ]/)
  })
})
