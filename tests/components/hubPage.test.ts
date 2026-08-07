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
      canManageNotes: true,
      notes: [{ id: 'n1', title: 'Nota 1', body: 'Texto 1', noteType: 'note' as const }],
      treeHref: '/?family=f1'
    },
    {
      id: 'f2',
      name: 'Familia Luna',
      membersCount: 2,
      linksCount: 1,
      previewMembers: ['Cris'],
      canManageNotes: true,
      notes: [{ id: 'n2', title: 'Nota 2', body: 'Texto 2', noteType: 'news' as const }],
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

    const hubMain = document.querySelector('.hub-page') as HTMLElement
    expect(['true', 'false']).toContain(hubMain.getAttribute('aria-busy'))

    expect(document.querySelectorAll('.family-panel')).toHaveLength(2)
    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Castaño')

    const secondDot = [...document.querySelectorAll('.dot')][1] as HTMLButtonElement
    secondDot.click()
    await tick()

    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Luna')
    expect(document.cookie).toContain('active_family_id=f2')
    expect(window.location.search).toContain('family=f2')

    const dots = [...document.querySelectorAll('.dot')] as HTMLButtonElement[]
    expect(dots[0].getAttribute('aria-selected')).toBe('false')
    expect(dots[1].getAttribute('aria-selected')).toBe('true')
  })

  it('supports keyboard navigation in dot indicator', async () => {
    new HubPage({
      target: document.body,
      props: { data: baseData }
    })

    await tick()

    const firstDot = [...document.querySelectorAll('.dot')][0] as HTMLButtonElement
    firstDot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await tick()

    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Luna')
    let dots = [...document.querySelectorAll('.dot')] as HTMLButtonElement[]
    expect(dots[0].getAttribute('tabindex')).toBe('-1')
    expect(dots[1].getAttribute('tabindex')).toBe('0')

    const secondDot = [...document.querySelectorAll('.dot')][1] as HTMLButtonElement
    secondDot.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }))
    await tick()

    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Castaño')

    const firstDotAgain = [...document.querySelectorAll('.dot')][0] as HTMLButtonElement
    firstDotAgain.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await tick()
    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Luna')

    const lastDot = [...document.querySelectorAll('.dot')][1] as HTMLButtonElement
    lastDot.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
    await tick()
    expect(document.querySelector('.dot.active')?.getAttribute('aria-label')).toContain('Castaño')

    dots = [...document.querySelectorAll('.dot')] as HTMLButtonElement[]
    expect(dots[0].getAttribute('tabindex')).toBe('0')
    expect(dots[1].getAttribute('tabindex')).toBe('-1')
  })

  it('shows note create and edit controls only when family allows note management', async () => {
    const data = {
      ...baseData,
      families: [
        {
          ...baseData.families[0],
          canManageNotes: true
        },
        {
          ...baseData.families[1],
          canManageNotes: false
        }
      ]
    }

    new HubPage({
      target: document.body,
      props: { data }
    })

    await tick()

    expect(document.querySelector('.family-panel.active .note-create-toggle')?.textContent).toContain(
      'Nueva nota'
    )
    expect(document.querySelector('.family-panel.active .note-action-btn')?.textContent).toContain(
      'Editar'
    )

    const secondDot = [...document.querySelectorAll('.dot')][1] as HTMLButtonElement
    secondDot.click()
    await tick()

    expect(document.querySelector('.family-panel.active .note-create-toggle')).toBeNull()
    expect(document.querySelector('.family-panel.active .note-action-btn')).toBeNull()
  })

  it('opens create form, opens edit form, and closes edit form on cancel', async () => {
    new HubPage({
      target: document.body,
      props: { data: baseData }
    })

    await tick()

    const createToggle = document.querySelector('.note-create-toggle') as HTMLButtonElement
    expect(createToggle).toBeTruthy()
    createToggle.click()
    await tick()

    expect(document.querySelector('form[action="?/createNote"]')).toBeTruthy()

    const editButton = document.querySelector('.note-action-btn') as HTMLButtonElement
    expect(editButton).toBeTruthy()
    editButton.click()
    await tick()

    expect(document.querySelector('form[action="?/updateNote"]')).toBeTruthy()

    const cancelButton = [...document.querySelectorAll('button')].find(
      (button) => button.textContent?.trim() === 'Cancelar'
    ) as HTMLButtonElement | undefined
    expect(cancelButton).toBeTruthy()
    cancelButton?.click()
    await tick()

    expect(document.querySelector('form[action="?/updateNote"]')).toBeNull()
  })

  it('shows note feedback messages only for the matching family panel', async () => {
    new HubPage({
      target: document.body,
      props: {
        data: baseData,
        form: {
          noteCreated: true,
          noteUpdated: true,
          noteDeleted: true,
          noteError: 'Error de prueba',
          familyId: 'f2'
        }
      }
    })

    await tick()

    // Active panel is f1 at start: no feedback should be visible there
    expect(document.querySelector('.family-panel.active .note-ok')).toBeNull()
    expect(document.querySelector('.family-panel.active .note-error')).toBeNull()

    const secondDot = [...document.querySelectorAll('.dot')][1] as HTMLButtonElement
    secondDot.click()
    await tick()

    const statusMessages = [...document.querySelectorAll('.family-panel.active .note-ok')].map((node) =>
      node.textContent?.trim()
    )

    expect(statusMessages).toContain('Nota creada.')
    expect(statusMessages).toContain('Nota actualizada.')
    expect(statusMessages).toContain('Nota eliminada.')
    expect(document.querySelector('.family-panel.active .note-error')?.textContent).toContain(
      'Error de prueba'
    )
  })

})
