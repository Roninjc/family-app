// @vitest-environment jsdom
import { tick } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Layout from '../../src/routes/+layout.svelte'
import type { LayoutData } from '../../src/routes/$types'
import { resetPage, setPage } from '../mocks/app-stores'

const profile = {
  id: 'profile-1',
  role: 'editor',
  display_name: 'Modo mock'
}

const family = {
  id: 'f1',
  name: 'Familia Demo',
  role: 'editor'
}

const pageData = {
  profile,
  availableFamilies: [family],
  activeFamilyId: family.id,
  activeFamilyName: family.name,
  notifications: []
}

const layoutData = {
  ...pageData,
  displayName: profile.display_name,
  user: { id: 'user-1' },
  supabase: {
    auth: {
      onAuthStateChange: () => ({
        data: { subscription: { unsubscribe: () => {} } }
      })
    }
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  document.body.innerHTML = ''
  setPage('/family/f1', pageData)
})

afterEach(() => {
  resetPage()
  vi.useRealTimers()
})

describe('shared layout header', () => {
  it('keeps one copy mounted while route text fades and swaps', async () => {
    const layout = new Layout({
      target: document.body,
      props: { data: layoutData as unknown as LayoutData, params: { familyId: family.id } }
    })
    await tick()

    const pill = document.querySelector('.header-main-pill') as HTMLElement
    const copy = document.querySelector('.header-main-copy') as HTMLElement

    expect(copy.textContent).toContain('Árbol')
    expect(copy.textContent).toContain(family.name)
    expect(copy.parentElement).toBe(pill)

    setPage('/family/f1/feed', pageData)
    await tick()

    expect(document.querySelector('.header-main-copy')).toBe(copy)
    expect(copy.classList.contains('visible')).toBe(false)
    expect(copy.textContent).toContain('Árbol')
    expect(copy.parentElement).toBe(pill)

    await vi.advanceTimersByTimeAsync(120)
    await tick()

    expect(document.querySelector('.header-main-copy')).toBe(copy)
    expect(copy.classList.contains('visible')).toBe(true)
    expect(copy.textContent).toContain('Novedades familiares')
    expect(copy.parentElement).toBe(pill)

    layout.$destroy()
  })
})
