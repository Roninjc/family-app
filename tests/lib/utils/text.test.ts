import { describe, expect, it } from 'vitest'
import { matchesSearch, normalizeSearchText } from '$lib/utils/text'

describe('normalizeSearchText', () => {
  it('strips accents and diaereses and lowercases', () => {
    expect(normalizeSearchText('Jesús María')).toBe('jesus maria')
    expect(normalizeSearchText('Begoña')).toBe('begona')
    expect(normalizeSearchText('GJELSTEN')).toBe('gjelsten')
  })
})

describe('matchesSearch', () => {
  it('finds accented names typing without accents, and vice versa', () => {
    expect(matchesSearch('Jesús Castaño Candela', 'jesus')).toBe(true)
    expect(matchesSearch('Jesús Castaño Candela', 'castano')).toBe(true)
    expect(matchesSearch('Maria Elena Costa', 'marÍa')).toBe(true)
    expect(matchesSearch('Jesús Castaño Candela', 'olalla')).toBe(false)
  })
})
