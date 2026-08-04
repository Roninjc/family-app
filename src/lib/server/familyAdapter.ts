import type { FamilyData, FamilyMember } from '$lib/types/familyTypes'

export interface MemberRow {
  id: string
  name: string
  family_name: string
  birth_date: string | null
  photo_url: string | null
}

export interface RelationshipRow {
  member_a: string
  member_b: string
  type: 'parent' | 'partner' | 'previous_partner' | 'sibling'
}

// Rebuilds the in-app FamilyData shape (bidirectional relation arrays) from
// the normalized DB rows, so the tree engine keeps working unchanged.
export const rowsToFamilyData = (
  members: MemberRow[],
  relationships: RelationshipRow[]
): FamilyData => {
  const byId = new Map<string, FamilyMember>()

  members.forEach((row) => {
    byId.set(row.id, {
      id: row.id,
      name: row.name,
      familyName: row.family_name,
      birthDate: row.birth_date ?? undefined,
      parents: [],
      children: [],
      siblings: [],
      partner: [],
      previousPartners: []
    })
  })

  const push = (list: string[], id: string) => {
    if (!list.includes(id)) list.push(id)
  }

  for (const rel of relationships) {
    const a = byId.get(rel.member_a)
    const b = byId.get(rel.member_b)

    if (!a || !b) continue

    switch (rel.type) {
      case 'parent':
        push(a.children, b.id)
        push(b.parents, a.id)
        break
      case 'partner':
        push(a.partner, b.id)
        push(b.partner, a.id)
        break
      case 'previous_partner':
        push(a.previousPartners, b.id)
        push(b.previousPartners, a.id)
        break
      case 'sibling':
        push(a.siblings, b.id)
        push(b.siblings, a.id)
        break
    }
  }

  return { members: [...byId.values()] }
}
