import { writable } from 'svelte/store'

type MockPage = {
  url: URL
  data: Record<string, unknown>
}

const initialPage = (): MockPage => ({
  url: new URL('http://localhost/dashboard?family=f1'),
  data: {}
})

export const page = writable(initialPage())
export const navigating = writable(null)

export function setPage(url: string, data: Record<string, unknown> = {}) {
  page.set({ url: new URL(url, 'http://localhost'), data })
}

export function resetPage() {
  page.set(initialPage())
  navigating.set(null)
}
