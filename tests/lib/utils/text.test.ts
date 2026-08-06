import { describe, expect, it } from 'vitest'
import { matchesSearch, normalizeSearchText } from '$lib/utils/text'

describe('normalizeSearchText', () => {
  it('quita tildes y diéresis y pasa a minúsculas', () => {
    expect(normalizeSearchText('Jesús María')).toBe('jesus maria')
    expect(normalizeSearchText('Begoña')).toBe('begona')
    expect(normalizeSearchText('GJELSTEN')).toBe('gjelsten')
  })
})

describe('matchesSearch', () => {
  it('encuentra nombres con tilde escribiendo sin tilde, y al revés', () => {
    expect(matchesSearch('Jesús Castaño Candela', 'jesus')).toBe(true)
    expect(matchesSearch('Jesús Castaño Candela', 'castano')).toBe(true)
    expect(matchesSearch('Maria Elena Costa', 'marÍa')).toBe(true)
    expect(matchesSearch('Jesús Castaño Candela', 'olalla')).toBe(false)
  })
})
