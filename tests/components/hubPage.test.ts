// @vitest-environment jsdom
import { tick } from 'svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import HubPage from '../../src/routes/hub/+page.svelte'

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
      notes: [{ id: 'n1', title: 'Nota 1', body: 'Texto 1' }],
      treeHref: '/?family=f1'
    },
    {
      id: 'f2',
      name: 'Familia Luna',
      membersCount: 2,
      linksCount: 1,
      previewMembers: ['Cris'],
      notes: [{ id: 'n2', title: 'Nota 2', body: 'Texto 2' }],
      treeHref: '/?family=f2'
    }
  ],
  activeFamilyId: 'f1',
  activeFamilyName: 'Familia Castaño',
  pendingInvitations: 0,
  showPendingInvitations: false
}

beforeEach(() => {
  document.body.innerHTML = ''
  document.cookie = 'active_family_id=; max-age=0; path=/'
  window.history.replaceState({}, '', '/hub?family=f1')
})

describe('hub page carousel', () => {
  it('shows one panel per family and updates active family on dot click', async () => {
    new HubPage({
      target: document.body,
      props: { data: baseData }
    })

    await tick()

    expect(document.querySelectorAll('.family-panel')).toHaveLength(2)
    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Castaño')

    const secondDot = [...document.querySelectorAll('.dot')][1] as HTMLButtonElement
    secondDot.click()
    await tick()

    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Luna')
    expect(document.cookie).toContain('active_family_id=f2')
    expect(window.location.search).toContain('family=f2')
  })
})
