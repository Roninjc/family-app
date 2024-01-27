import type { Couple, FamilyMember } from '$lib/types/familyTypes'
import { writable } from 'svelte/store'
import { familyData } from './family'

enum Relation {
  Child = 1,
  Parent,
  Sibling,
  Partner,
  PreviousPartner
}

const initFamilyTree = () => {
  const adjList = new Map()

  function addVertex(m: FamilyMember) {
    const id = m.id
    const name = m.name
    const firstFamilyName = m.firstFamilyName
    const secondFamilyName = m.secondFamilyName

    if (id && !adjList.has(id)) {
      adjList.set(id, {
        relations: new Map(),
        memberInfo: {
          name,
          firstFamilyName,
          secondFamilyName
        }
      })
    }
  }

  function addEdge(v: FamilyMember, w: FamilyMember, weight: number) {
    addVertex(v)
    addVertex(w)
    adjList.get(v.id)?.relations?.set(w.id, weight)
    adjList
      .get(w.id)
      ?.relations?.set(
        v.id,
        weight === Relation.Child
          ? Relation.Parent
          : weight === Relation.Parent
            ? Relation.Child
            : weight
      )
  }

  function getList() {
    return adjList
  }

  function getNodeRelationships(nodeId: string): { nodeId: string; weight: number }[] {
    const relationships: { weight: number; nodeId: string }[] = []
    const adjacentNodes = adjList.get(nodeId).relations

    adjacentNodes?.forEach((weight: number, nodeId: string) => {
      relationships.push({ nodeId, weight })
    })

    return relationships
  }

  function* dfsLevels(initialNodeId: string) {
    const visitedNodes = new Set<string>()
    const stack: { nodeId: string; level: number }[] = []
    // const levels = new Map<string, number>()

    stack.push({ nodeId: initialNodeId, level: 0 })

    while (stack.length > 0) {
      const { nodeId, level } = stack.pop()!

      if (nodeId && !visitedNodes.has(nodeId)) {
        yield { nodeId, level }

        visitedNodes.add(nodeId)
        // levels.set(nodeId, level)

        const relationships = getNodeRelationships(nodeId)

        relationships.forEach(({ nodeId, weight }) => {
          let nextLevel = level

          if (weight === Relation.Child) ++nextLevel
          if (weight === Relation.Parent) --nextLevel

          stack.push({ nodeId, level: nextLevel })
        })
      }
    }
  }

  function getAnyNodeId(): string | undefined {
    const nodes = adjList.keys()
    const firstNode = nodes.next()

    if (!firstNode.done) {
      return firstNode.value
    }

    return undefined
  }

  function getNodesGeneration(): { nodeId: string; generation: number }[] | undefined {
    const initialNode = familyTree.getAnyNodeId()

    if (!initialNode) return undefined

    const rawGenerations = [...familyTree.dfsLevels(initialNode)]
    const genNormalizer = 1 - Math.min(...rawGenerations.map((node) => node.level))
    const generations = rawGenerations.map(({ nodeId, level }) => {
      return { nodeId, generation: level + genNormalizer }
    })

    return generations
  }

  function* dfsCouples() {
    const visitedNodes = new Set<string>()
    const stack: string[] = []
    const couples: Couple[] = []
    const initialNodeId = familyTree.getAnyNodeId()

    if (!initialNodeId) return

    stack.push(initialNodeId)

    while (stack.length > 0) {
      const incomingNodeId = stack.pop()

      if (incomingNodeId && !visitedNodes.has(incomingNodeId)) {
        const relationships = getNodeRelationships(incomingNodeId)
        const nodeChildren = relationships.filter((relative) => relative.weight === Relation.Child)

        for (const { nodeId: incomingCoupleNodeId, weight } of relationships) {
          if (nodeChildren.length > 0) {
            if (weight === Relation.Partner || weight === Relation.PreviousPartner) {
              const coupleExists = couples.find(
                ({ nodeId, coupleNodeId }) =>
                  nodeId === incomingCoupleNodeId && coupleNodeId === incomingNodeId
              )
              if (!coupleExists) {
                const coupleRelationships = getNodeRelationships(incomingCoupleNodeId)
                const coupleChildren = coupleRelationships.filter(
                  (relative) => relative.weight === Relation.Child
                )
                const commonChildren = nodeChildren.filter((child) =>
                  coupleChildren.some(({ nodeId }) => child.nodeId === nodeId)
                )

                if (commonChildren.length > 0) {
                  const incomingCouple = {
                    nodeId: incomingNodeId,
                    coupleNodeId: incomingCoupleNodeId,
                    children: commonChildren
                  }
                  couples.push(incomingCouple)
                  yield incomingCouple
                }
              }
            }
          }

          stack.push(incomingCoupleNodeId)
        }

        visitedNodes.add(incomingNodeId)
      }
    }
  }

  function getAllCouplesWithChildren() {
    const couplesWithChildren = [...familyTree.dfsCouples()]
    return couplesWithChildren
  }

  return {
    adjList,
    addVertex,
    addEdge,
    getList,
    getNodeRelationships,
    dfsLevels,
    getAnyNodeId,
    getNodesGeneration,
    dfsCouples,
    getAllCouplesWithChildren
  }
}

export const familyTree = initFamilyTree()

familyData?.members?.forEach((member: FamilyMember) => {
  familyTree.addVertex(member)

  member.children?.forEach((childId: string) => {
    const child = familyData.members.find((member) => member.id === childId)
    if (child) {
      familyTree.addEdge(member, child, Relation.Child)
    }
  })

  member.parents?.forEach((parentId: string) => {
    const parent = familyData.members.find((member) => member.id === parentId)
    if (parent) {
      familyTree.addEdge(member, parent, Relation.Parent)
    }
    // TODO: comporbar si hay hermanos de los mismos padres para actualizarlos en el momento.
  })

  member.siblings?.forEach((siblingId: string) => {
    const sibling = familyData.members.find((member) => member.id === siblingId)
    if (sibling) {
      familyTree.addEdge(member, sibling, Relation.Sibling)
    }
  })

  member.partner?.forEach((partnerId: string) => {
    const partner = familyData.members.find((member) => member.id === partnerId)
    if (partner) {
      familyTree.addEdge(member, partner, Relation.Partner)
    }
  })

  member.previousPartners?.forEach((previousPartnerId: string) => {
    const previousPartner = familyData.members.find((member) => member.id === previousPartnerId)
    if (previousPartner) {
      familyTree.addEdge(member, previousPartner, Relation.PreviousPartner)
    }
  })
})

export const generations = familyTree.getNodesGeneration()
export const firstGenreation = generations?.filter((member) => member.generation === 1)

export const visitedMembers = writable<string[]>([])
export const stack = writable<string[]>([])
