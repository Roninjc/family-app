import type { FamilyData, FamilyMember } from '$lib/types/familyTypes'

export interface IntroStartOption {
  id: string
  label: string
}

// Per-member generation, oldest = 1, normalized per connected component -
// same semantics as familyTree.dfsLevels()/getNodesGeneration() in
// src/stores/tree.ts (children go one level down, parents one level up,
// partners/previous partners/siblings stay level), reimplemented as a pure
// function over plain FamilyMember[] since that store is a client-only
// singleton unsafe to reuse from a server loader. A member with no parents
// *recorded* is NOT necessarily generation 1 - e.g. a spouse who married
// into generation 3 has no parents in the data either, but is still
// connected (via partner/previous-partner edges) to their generation-3
// partner, so their normalized level ends up wherever that partner is, not 1.
const buildGenerationByMemberId = (members: FamilyMember[]): Map<string, number> => {
  const membersById = new Map(members.map((member) => [member.id, member]))
  const generationById = new Map<string, number>()
  const visited = new Set<string>()

  for (const start of members) {
    if (visited.has(start.id)) continue

    const componentLevels = new Map<string, number>()
    const pending: Array<{ id: string; level: number }> = [{ id: start.id, level: 0 }]

    while (pending.length > 0) {
      const { id, level } = pending.pop()!
      if (visited.has(id)) continue
      visited.add(id)
      componentLevels.set(id, level)

      const member = membersById.get(id)
      if (!member) continue

      member.children.forEach((childId) => pending.push({ id: childId, level: level + 1 }))
      member.parents.forEach((parentId) => pending.push({ id: parentId, level: level - 1 }))
      ;[...member.partner, ...member.previousPartners, ...member.siblings].forEach((peerId) =>
        pending.push({ id: peerId, level })
      )
    }

    const minLevel = Math.min(...componentLevels.values())
    componentLevels.forEach((level, id) => generationById.set(id, level - minLevel + 1))
  }

  return generationById
}

// Generation-1 "nodes" a family admin can pick as the tree intro's starting
// point: every actual generation-1 member (see buildGenerationByMemberId)
// clustered together with any other generation-1 partner, previous partner
// or sibling they're directly connected to (mirrors the row a founding
// couple/sibling group renders as in the tree). One option per cluster; its
// stored value is one representative member id (the tree camera already
// expands that back out to the whole cluster/component via
// familyTree.getDownwardReach, see src/routes/+page.svelte).
export const computeIntroStartOptions = (familyData: FamilyData): IntroStartOption[] => {
  const membersById = new Map(familyData.members.map((member) => [member.id, member]))
  const generationById = buildGenerationByMemberId(familyData.members)
  const generationOneIds = new Set(
    familyData.members
      .filter((member) => generationById.get(member.id) === 1)
      .map((member) => member.id)
  )

  const visited = new Set<string>()
  const options: IntroStartOption[] = []

  for (const startId of generationOneIds) {
    if (visited.has(startId)) continue

    const cluster: FamilyMember[] = []
    const pending = [startId]

    while (pending.length > 0) {
      const currentId = pending.pop()!
      if (visited.has(currentId)) continue
      visited.add(currentId)

      const member = membersById.get(currentId)
      if (!member) continue
      cluster.push(member)

      for (const relatedId of [...member.partner, ...member.previousPartners, ...member.siblings]) {
        if (generationOneIds.has(relatedId) && !visited.has(relatedId)) pending.push(relatedId)
      }
    }

    if (cluster.length === 0) continue

    options.push({
      id: cluster[0].id,
      label: cluster.map((member) => `${member.name} ${member.familyName}`.trim()).join(' y ')
    })
  }

  return options
}
