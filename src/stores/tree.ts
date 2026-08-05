import type { FamilyData, ParentsChildren, FamilyMember } from '$lib/types/familyTypes'
import { writable } from 'svelte/store'

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
    const familyName = m.familyName

    if (id && !adjList.has(id)) {
      adjList.set(id, {
        relations: new Map(),
        memberInfo: {
          name,
          familyName
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

  function getNodeRelationships(
    nodeId: string,
    relation = 0
  ): { nodeId: string; weight: number }[] {
    const relationships: { weight: number; nodeId: string }[] = []
    const adjacentNodes = adjList.get(nodeId).relations

    adjacentNodes?.forEach((weight: number, nodeId: string) => {
      relationships.push({ nodeId, weight })
    })

    if (relation > 0) {
      const fileterdRelationships = relationships.filter((r) => r.weight === relation)

      return fileterdRelationships
    }

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
    if (adjList.size === 0) return undefined

    const visitedNodes = new Set<string>()
    const generations: { nodeId: string; generation: number }[] = []

    // Una pasada por componente conexo; cada componente se normaliza por
    // separado para que su generación más antigua sea la 1.
    for (const startNodeId of adjList.keys()) {
      if (visitedNodes.has(startNodeId)) continue

      const rawGenerations = [...familyTree.dfsLevels(startNodeId)]
      const genNormalizer = 1 - Math.min(...rawGenerations.map((node) => node.level))

      rawGenerations.forEach(({ nodeId, level }) => {
        visitedNodes.add(nodeId)
        generations.push({ nodeId, generation: level + genNormalizer })
      })
    }

    return generations
  }

  // Nodos que el render recursivo alcanza desde una raíz: todo lo conectado
  // por aristas que no sean Parent (el árbol solo se dibuja hacia abajo).
  function getDownwardReach(rootNodeId: string): Set<string> {
    const reached = new Set<string>([rootNodeId])
    const pending = [rootNodeId]

    while (pending.length > 0) {
      const nodeId = pending.pop()!

      for (const { nodeId: relativeNodeId, weight } of getNodeRelationships(nodeId)) {
        if (weight !== Relation.Parent && !reached.has(relativeNodeId)) {
          reached.add(relativeNodeId)
          pending.push(relativeNodeId)
        }
      }
    }

    return reached
  }

  // Raíces desde las que renderizar para que todos los miembros aparezcan:
  // mientras queden nodos sin cubrir, elige el de generación más antigua que
  // más nodos pendientes alcance. Los ancestros de consortes y los
  // componentes desconectados generan raíces extra.
  function getRenderRoots(
    nodesGeneration: { nodeId: string; generation: number }[] | undefined
  ): string[] {
    if (!nodesGeneration || nodesGeneration.length === 0) return []

    const roots: string[] = []
    const covered = new Set<string>()

    while (covered.size < nodesGeneration.length) {
      const candidates = nodesGeneration.filter(({ nodeId }) => !covered.has(nodeId))
      const oldestGeneration = Math.min(...candidates.map(({ generation }) => generation))

      let bestRoot: string | undefined
      let bestReach = new Set<string>()

      for (const { nodeId, generation } of candidates) {
        if (generation !== oldestGeneration) continue

        const reach = new Set(
          [...familyTree.getDownwardReach(nodeId)].filter((id) => !covered.has(id))
        )

        if (reach.size > bestReach.size) {
          bestRoot = nodeId
          bestReach = reach
        }
      }

      roots.push(bestRoot!)
      bestReach.forEach((nodeId) => covered.add(nodeId))
    }

    return roots
  }

  function* dfsParentsChildren() {
    const visitedNodes = new Set<string>()
    const stack: string[] = []
    const parentsChildren: ParentsChildren[] = []

    // Recorre todos los componentes conexos, no solo el del primer nodo.
    for (const initialNodeId of adjList.keys()) {
      if (visitedNodes.has(initialNodeId)) continue

      stack.push(initialNodeId)

      while (stack.length > 0) {
        const incomingNodeId = stack.pop()

        if (incomingNodeId && !visitedNodes.has(incomingNodeId)) {
          const relationships = getNodeRelationships(incomingNodeId)
          const nodeChildren = relationships.filter(
            (relative) => relative.weight === Relation.Child
          )

          for (const { nodeId: incomingRelativeNodeId, weight } of relationships) {
            if (nodeChildren.length > 0) {
              if (weight === Relation.Partner || weight === Relation.PreviousPartner) {
                const coupleExists = parentsChildren.find(
                  ({ parent1, parent2 }) =>
                    parent1 === incomingRelativeNodeId && parent2 === incomingNodeId
                )
                if (!coupleExists) {
                  const coupleRelationships = getNodeRelationships(incomingRelativeNodeId)
                  const coupleChildren = coupleRelationships.filter(
                    (relative) => relative.weight === Relation.Child
                  )
                  const commonChildren = nodeChildren.filter((child) =>
                    coupleChildren.some(({ nodeId }) => child.nodeId === nodeId)
                  )

                  if (commonChildren.length > 0) {
                    const incomingParentsChildren = {
                      parent1: incomingNodeId,
                      parent2: incomingRelativeNodeId,
                      children: commonChildren
                    }

                    parentsChildren.push(incomingParentsChildren)
                    yield incomingParentsChildren
                  }
                }
              } else if (weight === Relation.Child) {
                const childParents = familyTree.getNodeRelationships(
                  incomingRelativeNodeId,
                  Relation.Parent
                )

                if (childParents.length === 1 && childParents[0].nodeId === incomingNodeId) {
                  const incomingParentChildren = {
                    parent1: incomingNodeId,
                    children: [{ nodeId: incomingRelativeNodeId, weight }]
                  }

                  parentsChildren.push(incomingParentChildren)
                  yield incomingParentChildren
                }
              }
            }

            stack.push(incomingRelativeNodeId)
          }

          visitedNodes.add(incomingNodeId)
        }
      }
    }
  }

  function getParentsChildren() {
    const rawParentsChildren = [...familyTree.dfsParentsChildren()]
    const parentsChildren: ParentsChildren[] = []

    rawParentsChildren.forEach((parentChildren) => {
      if (parentChildren.parent1 && 'parent2' in parentChildren) {
        parentsChildren.push(parentChildren)
      } else {
        const existingItem = parentsChildren.find(
          (pc) => pc.parent1 === parentChildren.parent1 && !pc.parent2
        )

        if (existingItem) {
          existingItem.children = existingItem.children.concat(parentChildren.children)
        } else {
          parentsChildren.push(parentChildren)
        }
      }
    })

    return parentsChildren
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
    getDownwardReach,
    getRenderRoots,
    dfsParentsChildren,
    getParentsChildren
  }
}

export const familyTree = initFamilyTree()

const buildTree = (familyData: FamilyData) => {
  familyTree.adjList.clear()

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
}

export let generations: { nodeId: string; generation: number }[] | undefined
export let firstGeneration: { nodeId: string; generation: number }[] | undefined
export let parentsChildrenArray: ParentsChildren[] = []
export let renderRoots: string[] = []

const refreshDerivedData = () => {
  generations = familyTree.getNodesGeneration()
  firstGeneration = generations?.filter((member) => member.generation === 1)
  parentsChildrenArray = familyTree.getParentsChildren()
  renderRoots = familyTree.getRenderRoots(generations)
}

export const visitedMembers = writable<string[]>([])
export const stack = writable<string[]>([])

// Incremented on every rebuild so the page can re-mount the rendered tree
export const treeVersion = writable(0)

// Rebuilds the graph from fresh page data (initial load or after a mutation)
// and triggers a re-mount of the rendered tree.
export const initTreeData = (familyData: FamilyData) => {
  buildTree(familyData)
  refreshDerivedData()
  treeVersion.update((version) => version + 1)
}
