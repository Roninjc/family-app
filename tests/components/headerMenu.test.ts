// @vitest-environment jsdom
import { tick } from 'svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import HeaderMenu from '../../src/components/ui/headerMenu.svelte'

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('headerMenu', () => {
  it('renders closed by default with the given aria-label and badge', () => {
    new HeaderMenu({
      target: document.body,
      props: { ariaLabel: 'Ver notificaciones', badge: 3 }
    })

    const details = document.querySelector('details')
    expect(details?.hasAttribute('open')).toBe(false)
    expect(document.querySelector('summary')?.getAttribute('aria-label')).toBe('Ver notificaciones')
    expect(document.querySelector('.header-badge')?.textContent).toBe('3')
  })

  it('hides the badge when it is null or zero', () => {
    new HeaderMenu({
      target: document.body,
      props: { ariaLabel: 'Ver notificaciones', badge: 0 }
    })

    expect(document.querySelector('.header-badge')).toBeNull()
  })

  it('forwards the native toggle event to consumers', async () => {
    let toggleCount = 0
    const instance = new HeaderMenu({
      target: document.body,
      props: { ariaLabel: 'Abrir menú' }
    })
    // Svelte 4 native DOM event forwarding (on:toggle with no handler) surfaces as a custom event.
    instance.$on('toggle', () => {
      toggleCount += 1
    })

    const details = document.querySelector('details') as HTMLDetailsElement
    details.open = true
    details.dispatchEvent(new Event('toggle'))
    await tick()

    expect(toggleCount).toBe(1)
  })
})
