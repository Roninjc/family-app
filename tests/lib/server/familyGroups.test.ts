import { describe, expect, it } from 'vitest'
import {
  buildFamilyGroups,
  resolveActiveFamilyId,
  toRowsFromFamilyData
} from '../../../src/lib/server/familyGroups'
import type { FamilyData } from '$lib/types/familyTypes'

describe('buildFamilyGroups', () => {
  it('groups connected components and keeps isolated members as standalone families', () => {
    const members = [
      { id: 'a', name: 'Ana', family_name: 'Castaño', birth_date: null, photo_url: null },
      { id: 'b', name: 'Beto', family_name: 'Castaño', birth_date: null, photo_url: null },
      { id: 'c', name: 'Cris', family_name: 'Luna', birth_date: null, photo_url: null }
    ]

    const relationships = [{ member_a: 'a', member_b: 'b', type: 'partner' as const }]

    const groups = buildFamilyGroups(members, relationships)

    expect(groups).toHaveLength(2)
    expect(groups[0].memberIds).toEqual(['a', 'b'])
    expect(groups[0].membersCount).toBe(2)
    expect(groups[1].memberIds).toEqual(['c'])
    expect(groups[1].linksCount).toBe(0)
  })
})

describe('resolveActiveFamilyId', () => {
  it('prefers requested family id, then cookie, then first family', () => {
    expect(resolveActiveFamilyId(['f1', 'f2'], 'f2', 'f1')).toBe('f2')
    expect(resolveActiveFamilyId(['f1', 'f2'], 'missing', 'f2')).toBe('f2')
    expect(resolveActiveFamilyId(['f1', 'f2'], null, null)).toBe('f1')
  })
})

describe('toRowsFromFamilyData', () => {
  it('creates normalized unique rows for symmetric relations', () => {
    const data: FamilyData = {
      members: [
        {
          id: 'm1',
          name: 'Ana',
          familyName: 'A',
          parents: [],
          children: [],
          siblings: ['m2'],
          partner: ['m2'],
          previousPartners: []
        },
        {
          id: 'm2',
          name: 'Beto',
          familyName: 'B',
          parents: [],
          children: [],
          siblings: ['m1'],
          partner: ['m1'],
          previousPartners: []
        }
      ]
    }

    const rows = toRowsFromFamilyData(data)

    expect(rows.members).toHaveLength(2)
    expect(rows.relationships).toContainEqual({ member_a: 'm1', member_b: 'm2', type: 'partner' })
    expect(rows.relationships).toContainEqual({ member_a: 'm1', member_b: 'm2', type: 'sibling' })
    expect(rows.relationships).toHaveLength(2)
  })
})
