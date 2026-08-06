import type { FamilyMember } from '$lib/types/familyTypes'

// "Probable" children of a member: siblings of their children, either via an
// explicit sibling relation or by sharing the other parent. NOT unambiguous
// (half-siblings share only one parent), so this only feeds suggestions the
// person confirms with a click — it is never written automatically.
export const suggestedChildren = (
  childrenIds: string[],
  excludedIds: string[],
  members: FamilyMember[]
): FamilyMember[] => {
  const byId = new Map(members.map((member) => [member.id, member]))
  const suggested = new Map<string, FamilyMember>()

  for (const childId of childrenIds) {
    const child = byId.get(childId)
    if (!child) continue

    const siblingIds = [
      ...child.siblings,
      ...child.parents.flatMap((parentId) => byId.get(parentId)?.children ?? [])
    ]

    for (const siblingId of siblingIds) {
      const sibling = byId.get(siblingId)

      if (
        sibling &&
        siblingId !== childId &&
        !childrenIds.includes(siblingId) &&
        !excludedIds.includes(siblingId)
      ) {
        suggested.set(siblingId, sibling)
      }
    }
  }

  return [...suggested.values()]
}

// "Probable" parents of a member: the parents of their siblings (explicit or
// via a shared parent) not already recorded as theirs. Same caveat as above:
// wrong for half-siblings, so it only suggests.
export const suggestedParents = (
  member: FamilyMember,
  excludedIds: string[],
  members: FamilyMember[]
): FamilyMember[] => {
  const byId = new Map(members.map((m) => [m.id, m]))

  const siblingIds = new Set([
    ...member.siblings,
    ...member.parents.flatMap((parentId) => byId.get(parentId)?.children ?? [])
  ])
  siblingIds.delete(member.id)

  const suggested = new Map<string, FamilyMember>()

  for (const siblingId of siblingIds) {
    for (const parentId of byId.get(siblingId)?.parents ?? []) {
      const parent = byId.get(parentId)

      if (parent && !member.parents.includes(parentId) && !excludedIds.includes(parentId)) {
        suggested.set(parentId, parent)
      }
    }
  }

  return [...suggested.values()]
}
