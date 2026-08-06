import type { FamilyMember } from '$lib/types/familyTypes'

// Hijos "probables" de un miembro: hermanos de sus hijos, ya sea por relación
// sibling explícita o por compartir el otro progenitor. NO es inequívoco (los
// medio hermanos comparten solo un progenitor), así que esto solo alimenta
// sugerencias que la persona confirma con un clic — nunca se escribe solo.
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

// Padres "probables" de un miembro: los padres de sus hermanos (explícitos o
// por compartir un progenitor) que no constan como padres suyos. Misma
// salvedad que arriba: con medio hermanos no es cierto, así que solo sugiere.
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
