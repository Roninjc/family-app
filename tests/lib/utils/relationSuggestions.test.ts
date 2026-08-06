import { describe, expect, it } from 'vitest'
import type { FamilyMember } from '$lib/types/familyTypes'
import { suggestedChildren, suggestedParents } from '$lib/utils/relationSuggestions'

const member = (id: string, partial: Partial<FamilyMember> = {}): FamilyMember => ({
  id,
  name: id,
  familyName: 'Test',
  parents: [],
  children: [],
  siblings: [],
  partner: [],
  previousPartners: [],
  ...partial
})

describe('suggestedChildren', () => {
  it('sugiere a los hermanos explícitos de un hijo registrado', () => {
    const members = [
      member('maribel', { siblings: ['javier', 'eva'] }),
      member('javier', { siblings: ['maribel', 'eva'] }),
      member('eva', { siblings: ['maribel', 'javier'] })
    ]

    const suggested = suggestedChildren(['maribel'], [], members)

    expect(suggested.map(({ id }) => id).sort()).toEqual(['eva', 'javier'])
  })

  it('sugiere a los hijos del otro progenitor aunque no haya relación sibling explícita', () => {
    const members = [
      member('luisa', { children: ['maribel', 'javier'] }),
      member('maribel', { parents: ['luisa'] }),
      member('javier', { parents: ['luisa'] })
    ]

    const suggested = suggestedChildren(['maribel'], [], members)

    expect(suggested.map(({ id }) => id)).toEqual(['javier'])
  })

  it('no sugiere a quien ya es hijo, ni a excluidos, ni al propio hijo', () => {
    const members = [
      member('luisa', { children: ['maribel', 'javier', 'eva'] }),
      member('maribel', { parents: ['luisa'], siblings: ['javier', 'eva'] }),
      member('javier', { parents: ['luisa'] }),
      member('eva', { parents: ['luisa'] })
    ]

    // javier ya es hijo; eva está excluida (p. ej. seleccionada como pareja)
    const suggested = suggestedChildren(['maribel', 'javier'], ['eva'], members)

    expect(suggested).toEqual([])
  })

  it('sin hijos seleccionados no sugiere nada', () => {
    expect(suggestedChildren([], [], [member('a', { siblings: ['b'] }), member('b')])).toEqual([])
  })

  it('deduplica sugerencias que llegan por varios hijos', () => {
    const members = [
      member('madre', { children: ['a', 'b', 'c'] }),
      member('a', { parents: ['madre'] }),
      member('b', { parents: ['madre'] }),
      member('c', { parents: ['madre'] })
    ]

    const suggested = suggestedChildren(['a', 'b'], [], members)

    expect(suggested.map(({ id }) => id)).toEqual(['c'])
  })
})

describe('suggestedParents', () => {
  it('sugiere al padre de los hermanos estructurales (caso Maribel/Jesús María)', () => {
    const members = [
      member('luisa', { children: ['maribel', 'javier', 'eva'] }),
      member('jm', { children: ['javier', 'eva'] }),
      member('maribel', { parents: ['luisa'] }),
      member('javier', { parents: ['luisa', 'jm'] }),
      member('eva', { parents: ['luisa', 'jm'] })
    ]
    const maribel = members.find(({ id }) => id === 'maribel')!

    const suggested = suggestedParents(maribel, ['maribel', 'luisa'], members)

    expect(suggested.map(({ id }) => id)).toEqual(['jm'])
  })

  it('sugiere a los padres de hermanos con relación sibling explícita', () => {
    const members = [
      member('ana', { siblings: ['berto'] }),
      member('berto', { siblings: ['ana'], parents: ['carlos'] }),
      member('carlos', { children: ['berto'] })
    ]
    const ana = members.find(({ id }) => id === 'ana')!

    expect(suggestedParents(ana, ['ana'], members).map(({ id }) => id)).toEqual(['carlos'])
  })

  it('no sugiere a padres ya registrados ni a excluidos', () => {
    const members = [
      member('luisa', { children: ['maribel', 'javier'] }),
      member('jm', { children: ['javier'] }),
      member('maribel', { parents: ['luisa'] }),
      member('javier', { parents: ['luisa', 'jm'] })
    ]
    const maribel = members.find(({ id }) => id === 'maribel')!

    // luisa ya es su madre; jm excluido (p. ej. ya relacionado de otra forma)
    expect(suggestedParents(maribel, ['maribel', 'luisa', 'jm'], members)).toEqual([])
  })

  it('sin hermanos no sugiere nada', () => {
    const members = [
      member('sola', { parents: ['madre'] }),
      member('madre', { children: ['sola'] })
    ]
    const sola = members.find(({ id }) => id === 'sola')!

    expect(suggestedParents(sola, ['sola', 'madre'], members)).toEqual([])
  })
})
