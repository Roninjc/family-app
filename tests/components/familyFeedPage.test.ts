// @vitest-environment jsdom
import { tick } from 'svelte'
import { beforeEach, describe, expect, it } from 'vitest'
import FamilyFeedPage from '../../src/routes/family/[familyId]/feed/+page.svelte'

const baseData = {
  families: [
    {
      id: 'f1',
      name: 'Familia Castaño',
      role: 'editor' as const,
      membersCount: 5,
      linksCount: 4,
      previewMembers: ['Ana', 'Beto'],
      canManageNotes: true,
      notes: [
        {
          id: 'n1',
          title: 'Cena del domingo',
          body: 'Este domingo cenamos todos en casa de la abuela a las 21:00.',
          noteType: 'news' as const
        },
        {
          id: 'n2',
          title: 'Nota interna',
          body: 'Contenido de nota que no debe salir en el carrusel de noticias.',
          noteType: 'note' as const
        }
      ],
      treeHref: '/family/f1'
    }
  ],
  activeFamilyId: 'f1',
  activeFamilyName: 'Familia Castaño'
}

beforeEach(() => {
  document.body.innerHTML = ''
})

describe('family feed page', () => {
  it('keeps family-scoped context in news section and does not render family-switch controls', async () => {
    new FamilyFeedPage({
      target: document.body,
      props: {
        data: baseData
      }
    })

    await tick()

    expect(document.querySelector('.family-feed-header')).toBeNull()
    expect(document.querySelector('.news-section h2')?.textContent).toBe('Noticias')
    expect(document.querySelector('.carousel-dots')).toBeNull()
    expect(document.querySelector('.families-carousel')).toBeNull()
  })

  it('opens news center in detail mode when clicking a news card', async () => {
    new FamilyFeedPage({
      target: document.body,
      props: {
        data: baseData
      }
    })

    await tick()

    const card = document.querySelector('.news-card') as HTMLButtonElement
    expect(card).toBeTruthy()
    card.click()

    await tick()
    await tick()

    expect(document.querySelector('.news-detail h3')?.textContent).toContain('Cena del domingo')
  })

  it('opens news center in list mode when using list action', async () => {
    new FamilyFeedPage({
      target: document.body,
      props: {
        data: baseData
      }
    })

    await tick()

    const listButton = document.querySelector(
      'button[aria-label="Ver lista de noticias"]'
    ) as HTMLButtonElement | null

    expect(listButton).toBeTruthy()
    listButton?.click()

    await tick()
    await tick()

    expect(document.querySelector('.news-center-list')).toBeTruthy()
    expect(document.querySelector('.news-detail')).toBeNull()
  })

  it('shows empty fallback when there is no active family', async () => {
    new FamilyFeedPage({
      target: document.body,
      props: {
        data: {
          families: [],
          activeFamilyId: '',
          activeFamilyName: ''
        }
      }
    })

    await tick()

    expect(document.querySelector('.family-feed-empty h2')?.textContent).toContain(
      'No hay una familia activa'
    )
  })
})
