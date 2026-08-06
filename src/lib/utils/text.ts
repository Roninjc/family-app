// Loose matching for the autocompletes: ignores case and diacritics
// (accents, umlauts...), so "jesus" finds "Jesús".
export const normalizeSearchText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const matchesSearch = (haystack: string, needle: string) =>
  normalizeSearchText(haystack).includes(normalizeSearchText(needle))
