import type { FamilyData } from '$lib/types/familyTypes'
import type { MemberRow, RelationshipRow } from './familyAdapter'

export interface FamilyGroup {
  id: string
  name: string
  memberIds: string[]
  membersCount: number
  previewMembers: string[]
  linksCount: number
}

const normalizeFamilyName = (value: string | null | undefined) => {
  const trimmed = (value ?? '').trim()
  return trimmed.length > 0 ? trimmed : 'Sin apellido'
}

const guessFamilyLabel = (members: MemberRow[]) => {
  const counts = new Map<string, number>()

  for (const member of members) {
    const key = normalizeFamilyName(member.family_name)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const sorted = [...counts.entries()].sort((a, b) => {
    if (b[1] !== a[1]) return b[1] - a[1]
    return a[0].localeCompare(b[0], 'es')
  })

  return `Familia ${sorted[0]?.[0] ?? 'sin nombre'}`
}

export const buildFamilyGroups = (
  members: MemberRow[],
  relationships: RelationshipRow[]
): FamilyGroup[] => {
  if (members.length === 0) return []

  const order = new Map<string, number>()
  members.forEach((member, index) => order.set(member.id, index))

  const adjacency = new Map<string, Set<string>>()
  for (const member of members) adjacency.set(member.id, new Set())

  for (const relationship of relationships) {
    if (!adjacency.has(relationship.member_a) || !adjacency.has(relationship.member_b)) continue
    adjacency.get(relationship.member_a)?.add(relationship.member_b)
    adjacency.get(relationship.member_b)?.add(relationship.member_a)
  }

  const visited = new Set<string>()
  const membersById = new Map(members.map((member) => [member.id, member]))
  const groups: FamilyGroup[] = []

  for (const member of members) {
    if (visited.has(member.id)) continue

    const queue = [member.id]
    visited.add(member.id)
    const componentIds: string[] = []

    while (queue.length > 0) {
      const current = queue.shift()
      if (!current) continue

      componentIds.push(current)

      for (const next of adjacency.get(current) ?? []) {
        if (visited.has(next)) continue
        visited.add(next)
        queue.push(next)
      }
    }

    componentIds.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0))
    const componentMembers = componentIds
      .map((id) => membersById.get(id))
      .filter((row): row is MemberRow => Boolean(row))

    const idSet = new Set(componentIds)
    const linksCount = relationships.filter(
      (relationship) => idSet.has(relationship.member_a) && idSet.has(relationship.member_b)
    ).length

    groups.push({
      id: componentIds[0],
      name: guessFamilyLabel(componentMembers),
      memberIds: componentIds,
      membersCount: componentIds.length,
      previewMembers: componentMembers.slice(0, 5).map((entry) => entry.name),
      linksCount
    })
  }

  return groups
}

export const resolveActiveFamilyId = (
  validIds: string[],
  requestedFamilyId: string | null,
  cookieFamilyId: string | null
) => {
  if (requestedFamilyId && validIds.includes(requestedFamilyId)) return requestedFamilyId
  if (cookieFamilyId && validIds.includes(cookieFamilyId)) return cookieFamilyId
  return validIds[0] ?? null
}

export const toRowsFromFamilyData = (familyData: FamilyData) => {
  const members: MemberRow[] = familyData.members.map((member) => ({
    id: member.id,
    name: member.name,
    family_name: member.familyName,
    birth_date: member.birthDate ?? null,
    photo_url: null
  }))

  const relationshipMap = new Map<string, RelationshipRow>()
  const addRelationship = (row: RelationshipRow) => {
    relationshipMap.set(`${row.member_a}|${row.member_b}|${row.type}`, row)
  }

  for (const member of familyData.members) {
    for (const parentId of member.parents) {
      addRelationship({ member_a: parentId, member_b: member.id, type: 'parent' })
    }

    for (const partnerId of member.partner) {
      const [memberA, memberB] =
        member.id < partnerId ? [member.id, partnerId] : [partnerId, member.id]
      addRelationship({ member_a: memberA, member_b: memberB, type: 'partner' })
    }

    for (const previousPartnerId of member.previousPartners) {
      const [memberA, memberB] =
        member.id < previousPartnerId
          ? [member.id, previousPartnerId]
          : [previousPartnerId, member.id]
      addRelationship({ member_a: memberA, member_b: memberB, type: 'previous_partner' })
    }

    for (const siblingId of member.siblings) {
      const [memberA, memberB] =
        member.id < siblingId ? [member.id, siblingId] : [siblingId, member.id]
      addRelationship({ member_a: memberA, member_b: memberB, type: 'sibling' })
    }
  }

  return {
    members,
    relationships: [...relationshipMap.values()]
  }
}
