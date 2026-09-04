// @vitest-environment jsdom
import { tick } from 'svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import DashboardPage from '../../src/routes/dashboard/+page.svelte'

const baseData = {
  displayName: 'Jesús',
  role: 'editor' as const,
  families: [
    {
      id: 'f1',
      name: 'Familia Castaño',
      membersCount: 5,
      linksCount: 4,
      previewMembers: ['Ana', 'Beto'],
      canManageNotes: true,
      notes: [{ id: 'n1', title: 'Nota 1', body: 'Texto 1', noteType: 'note' as const }],
      treeHref: '/family/f1'
    },
    {
      id: 'f2',
      name: 'Familia Luna',
      membersCount: 2,
      linksCount: 1,
      previewMembers: ['Cris'],
      canManageNotes: true,
      notes: [{ id: 'n2', title: 'Nota 2', body: 'Texto 2', noteType: 'news' as const }],
      treeHref: '/family/f2'
    }
  ],
  activeFamilyId: 'f1',
  activeFamilyName: 'Familia Castaño'
}

beforeEach(() => {
  document.body.innerHTML = ''
  document.cookie = 'active_family_id=; max-age=0; path=/'
  window.history.replaceState({}, '', '/dashboard?family=f1')
})

describe('dashboard page carousel', () => {
  it('shows one panel per family and updates active family on dot click', async () => {
    new DashboardPage({
      target: document.body,
      props: { data: baseData }
    })

    await tick()

    const dashboardMain = document.querySelector('.dashboard-page') as HTMLElement
    expect(['true', 'false']).toContain(dashboardMain.getAttribute('aria-busy'))

    expect(document.querySelectorAll('.family-panel')).toHaveLength(2)
    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Castaño')

    const secondDot = [...document.querySelectorAll('.dot')][1] as HTMLButtonElement
    secondDot.click()
    await tick()
    await tick()

    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Luna')
    expect(document.cookie).toContain('active_family_id=f2')

    const dots = [...document.querySelectorAll('.dot')] as HTMLButtonElement[]
    expect(dots[0].getAttribute('aria-selected')).toBe('false')
    expect(dots[1].getAttribute('aria-selected')).toBe('true')
  })

  it('supports keyboard navigation in dot indicator', async () => {
    new DashboardPage({
      target: document.body,
      props: { data: baseData }
    })

    await tick()

    const firstDot = [...document.querySelectorAll('.dot')][0] as HTMLButtonElement
    firstDot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await tick()
    await tick()

    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Luna')
    let dots = [...document.querySelectorAll('.dot')] as HTMLButtonElement[]
    expect(dots[0].getAttribute('tabindex')).toBe('-1')
    expect(dots[1].getAttribute('tabindex')).toBe('0')

    const secondDot = [...document.querySelectorAll('.dot')][1] as HTMLButtonElement
    secondDot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await tick()
    await tick()

    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Castaño')

    const firstDotAgain = [...document.querySelectorAll('.dot')][0] as HTMLButtonElement
    firstDotAgain.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await tick()
    await tick()
    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Luna')

    const lastDot = [...document.querySelectorAll('.dot')][1] as HTMLButtonElement
    lastDot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    await tick()
    await tick()
    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Castaño')

    dots = [...document.querySelectorAll('.dot')] as HTMLButtonElement[]
    expect(dots[0].getAttribute('tabindex')).toBe('0')
    expect(dots[1].getAttribute('tabindex')).toBe('-1')
  })

  it('renders one family story card per family without legacy note modules', async () => {
    new DashboardPage({
      target: document.body,
      props: { data: baseData }
    })

    await tick()

    expect(document.querySelectorAll('.family-story-card')).toHaveLength(2)
    expect(document.querySelectorAll('.family-panel.active .family-story-card')).toHaveLength(1)
    expect(document.querySelector('.family-panel.active .notes-card')).toBeNull()
    expect(document.querySelector('.family-panel.active .note-action-btn')).toBeNull()
  })

  it('keeps title centered and removes legacy scroll hint text', async () => {
    new DashboardPage({
      target: document.body,
      props: { data: baseData }
    })

    await tick()

    expect(document.querySelector('.families-shell h2')?.textContent?.trim()).toBe('Tus familias')
    expect(document.querySelector('.scroll-hint')).toBeNull()
  })

  it('renders a dynamic preview copy, monogram seal and animated lineage for the active family', async () => {
    const data = {
      ...baseData,
      families: [
        {
          ...baseData.families[0],
          previewMembers: ['Ana', 'Beto', 'Clara']
        },
        ...baseData.families.slice(1)
      ]
    }

    new DashboardPage({
      target: document.body,
      props: { data }
    })

    await tick()

    const previewText = document.querySelector('.family-panel.active .family-preview-copy')
      ?.textContent
    expect(previewText).toContain('Ana, Beto y Clara sostienen el pulso')
    expect(previewText).toContain('Familia Castaño')

    const seal = document.querySelector('.family-panel.active .family-seal span')
    expect(seal?.textContent?.trim()).toBe('FC')

    const lineageItems = document.querySelectorAll('.family-panel.active .lineage-track span')
    expect(lineageItems.length).toBeGreaterThan(6)
    expect([...lineageItems].some((chip) => chip.textContent?.includes('Ana'))).toBe(true)
  })

  it('uses fallback preview text when a family has no preview members', async () => {
    const data = {
      ...baseData,
      families: [
        {
          ...baseData.families[0],
          previewMembers: []
        },
        ...baseData.families.slice(1)
      ]
    }

    new DashboardPage({
      target: document.body,
      props: { data }
    })

    await tick()

    const previewText = document.querySelector('.family-panel.active .family-preview-copy')
      ?.textContent
    expect(previewText).toContain('Entrad para descubrir la huella compartida de Familia Castaño')
  })
})
