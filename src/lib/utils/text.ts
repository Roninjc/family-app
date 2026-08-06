// Búsqueda laxa para los autocompletados: ignora mayúsculas y diacríticos
// (tildes, diéresis...), de forma que "jesus" encuentre a "Jesús".
export const normalizeSearchText = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const matchesSearch = (haystack: string, needle: string) =>
  normalizeSearchText(haystack).includes(normalizeSearchText(needle))
