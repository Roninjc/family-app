import { describe, expect, it } from 'vitest'
import { rowsToFamilyData, type MemberRow, type RelationshipRow } from '$lib/server/familyAdapter'

const row = (id: string): MemberRow => ({
  id,
  name: id,
  family_name: 'Test',
  birth_date: null,
  photo_url: null
})

describe('rowsToFamilyData', () => {
  it('rebuilds bidirectional arrays for the four relation types', () => {
    const members = [row('a'), row('b'), row('c'), row('d'), row('e')]
    const relationships: RelationshipRow[] = [
      { member_a: 'a', member_b: 'b', type: 'parent' },
      { member_a: 'a', member_b: 'c', type: 'partner' },
      { member_a: 'a', member_b: 'd', type: 'previous_partner' },
      { member_a: 'b', member_b: 'e', type: 'sibling' }
    ]

    const { members: familyMembers } = rowsToFamilyData(members, relationships)
    const byId = new Map(familyMembers.map((m) => [m.id, m]))

    expect(byId.get('a')?.children).toEqual(['b'])
    expect(byId.get('b')?.parents).toEqual(['a'])
    expect(byId.get('a')?.partner).toEqual(['c'])
    expect(byId.get('c')?.partner).toEqual(['a'])
    expect(byId.get('a')?.previousPartners).toEqual(['d'])
    expect(byId.get('d')?.previousPartners).toEqual(['a'])
    expect(byId.get('b')?.siblings).toEqual(['e'])
    expect(byId.get('e')?.siblings).toEqual(['b'])
  })

  it('ignores relationships pointing at nonexistent members', () => {
    const { members } = rowsToFamilyData(
      [row('a')],
      [{ member_a: 'a', member_b: 'ghost', type: 'partner' }]
    )

    expect(members[0].partner).toEqual([])
  })

  it('does not duplicate ids when duplicate rows arrive', () => {
    const { members } = rowsToFamilyData(
      [row('a'), row('b')],
      [
        { member_a: 'a', member_b: 'b', type: 'partner' },
        { member_a: 'a', member_b: 'b', type: 'partner' }
      ]
    )

    expect(members.find((m) => m.id === 'a')?.partner).toEqual(['b'])
  })

  it('converts birth_date null into undefined', () => {
    const withDate = { ...row('a'), birth_date: '1950-01-01' }
    const { members } = rowsToFamilyData([withDate, row('b')], [])

    expect(members.find((m) => m.id === 'a')?.birthDate).toBe('1950-01-01')
    expect(members.find((m) => m.id === 'b')?.birthDate).toBeUndefined()
  })
})
