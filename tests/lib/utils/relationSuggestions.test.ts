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
  it('suggests the explicit siblings of a registered child', () => {
    const members = [
      member('maribel', { siblings: ['javier', 'eva'] }),
      member('javier', { siblings: ['maribel', 'eva'] }),
      member('eva', { siblings: ['maribel', 'javier'] })
    ]

    const suggested = suggestedChildren(['maribel'], [], members)

    expect(suggested.map(({ id }) => id).sort()).toEqual(['eva', 'javier'])
  })

  it("suggests the other parent's children even without an explicit sibling relation", () => {
    const members = [
      member('luisa', { children: ['maribel', 'javier'] }),
      member('maribel', { parents: ['luisa'] }),
      member('javier', { parents: ['luisa'] })
    ]

    const suggested = suggestedChildren(['maribel'], [], members)

    expect(suggested.map(({ id }) => id)).toEqual(['javier'])
  })

  it('does not suggest existing children, excluded members or the child itself', () => {
    const members = [
      member('luisa', { children: ['maribel', 'javier', 'eva'] }),
      member('maribel', { parents: ['luisa'], siblings: ['javier', 'eva'] }),
      member('javier', { parents: ['luisa'] }),
      member('eva', { parents: ['luisa'] })
    ]

    // javier is already a child; eva is excluded (e.g. selected as partner)
    const suggested = suggestedChildren(['maribel', 'javier'], ['eva'], members)

    expect(suggested).toEqual([])
  })

  it('suggests nothing without selected children', () => {
    expect(suggestedChildren([], [], [member('a', { siblings: ['b'] }), member('b')])).toEqual([])
  })

  it('deduplicates suggestions reached through several children', () => {
    const members = [
      member('mother', { children: ['a', 'b', 'c'] }),
      member('a', { parents: ['mother'] }),
      member('b', { parents: ['mother'] }),
      member('c', { parents: ['mother'] })
    ]

    const suggested = suggestedChildren(['a', 'b'], [], members)

    expect(suggested.map(({ id }) => id)).toEqual(['c'])
  })
})

describe('suggestedParents', () => {
  it("suggests the structural siblings' father (Maribel/Jesús María case)", () => {
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

  it('suggests the parents of siblings with an explicit sibling relation', () => {
    const members = [
      member('ana', { siblings: ['berto'] }),
      member('berto', { siblings: ['ana'], parents: ['carlos'] }),
      member('carlos', { children: ['berto'] })
    ]
    const ana = members.find(({ id }) => id === 'ana')!

    expect(suggestedParents(ana, ['ana'], members).map(({ id }) => id)).toEqual(['carlos'])
  })

  it('does not suggest already registered parents or excluded members', () => {
    const members = [
      member('luisa', { children: ['maribel', 'javier'] }),
      member('jm', { children: ['javier'] }),
      member('maribel', { parents: ['luisa'] }),
      member('javier', { parents: ['luisa', 'jm'] })
    ]
    const maribel = members.find(({ id }) => id === 'maribel')!

    // luisa is already her mother; jm is excluded (e.g. already related some other way)
    expect(suggestedParents(maribel, ['maribel', 'luisa', 'jm'], members)).toEqual([])
  })

  it('suggests nothing without siblings', () => {
    const members = [
      member('onlychild', { parents: ['mother'] }),
      member('mother', { children: ['onlychild'] })
    ]
    const onlyChild = members.find(({ id }) => id === 'onlychild')!

    expect(suggestedParents(onlyChild, ['onlychild', 'mother'], members)).toEqual([])
  })
})
