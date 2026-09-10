import { describe, expect, it } from 'vitest'
import { computeIntroStartOptions } from '$lib/server/introStartOptions'
import { rowsToFamilyData, type MemberRow, type RelationshipRow } from '$lib/server/familyAdapter'

const row = (id: string, name = id): MemberRow => ({
  id,
  name,
  family_name: 'Test',
  birth_date: null,
  photo_url: null
})

describe('computeIntroStartOptions', () => {
  it('clusters a founding couple (both generation-1) into one option', () => {
    const members = [row('a', 'Aurelio'), row('b', 'Benita'), row('c', 'Child')]
    const relationships: RelationshipRow[] = [
      { member_a: 'a', member_b: 'b', type: 'partner' },
      { member_a: 'a', member_b: 'c', type: 'parent' },
      { member_a: 'b', member_b: 'c', type: 'parent' }
    ]

    const options = computeIntroStartOptions(rowsToFamilyData(members, relationships))

    expect(options).toHaveLength(1)
    expect(options[0].id).toBe('a')
    expect(options[0].label).toBe('Aurelio Test y Benita Test')
  })

  it('keeps disconnected generation-1 branches as separate options', () => {
    const members = [row('a', 'Aurelio'), row('c', 'Cosme'), row('d', 'Delia'), row('i', 'Irene')]
    const relationships: RelationshipRow[] = [
      { member_a: 'c', member_b: 'd', type: 'partner' },
      { member_a: 'c', member_b: 'i', type: 'parent' },
      { member_a: 'd', member_b: 'i', type: 'parent' }
    ]

    const options = computeIntroStartOptions(rowsToFamilyData(members, relationships))
    const ids = options.map((option) => option.id).sort()

    expect(ids).toEqual(['a', 'c'])
  })

  it('excludes members with recorded parents (not generation 1)', () => {
    const members = [row('a', 'Aurelio'), row('c', 'Child')]
    const relationships: RelationshipRow[] = [{ member_a: 'a', member_b: 'c', type: 'parent' }]

    const options = computeIntroStartOptions(rowsToFamilyData(members, relationships))

    expect(options.map((option) => option.id)).toEqual(['a'])
  })

  it('excludes an in-law spouse with no recorded parents who married into a deeper generation', () => {
    // Regression: a spouse with no parents *recorded* (e.g. Héctor in the
    // mock family) is not automatically generation 1 - they're only
    // partnered with a generation-2+ member, so their true level matches
    // that partner's, not the founding couple's.
    const members = [
      row('a', 'Aurelio'),
      row('b', 'Benita'),
      row('e', 'Ernesto'),
      row('h', 'Hector')
    ]
    const relationships: RelationshipRow[] = [
      { member_a: 'a', member_b: 'b', type: 'partner' },
      { member_a: 'a', member_b: 'e', type: 'parent' },
      { member_a: 'b', member_b: 'e', type: 'parent' },
      { member_a: 'e', member_b: 'h', type: 'previous_partner' }
    ]

    const options = computeIntroStartOptions(rowsToFamilyData(members, relationships))

    expect(options.map((option) => option.id)).toEqual(['a'])
  })

  it('groups a sibling trio with no parents into a single option', () => {
    const members = [row('a', 'Ana'), row('b', 'Beto'), row('c', 'Coco')]
    const relationships: RelationshipRow[] = [
      { member_a: 'a', member_b: 'b', type: 'sibling' },
      { member_a: 'b', member_b: 'c', type: 'sibling' }
    ]

    const options = computeIntroStartOptions(rowsToFamilyData(members, relationships))

    expect(options).toHaveLength(1)
    expect(options[0].label).toBe('Ana Test y Beto Test y Coco Test')
  })
})
