<script lang="ts">
  import type { FamilyMember, FamilyNode } from '$lib/types/familyTypes'
  import { familyData } from '../stores/family'

  enum Relation {
    Child = 1,
    Parent,
    Sibling,
    Partner,
    PreviousPartner
  }

  const initFamilyNode = (familiyMember: FamilyMember) => {
    const {
      id,
      name,
      firstFamilyName,
      secondFamilyName,
      parents,
      children,
      siblings,
      partner,
      previousPartners
    } = familiyMember

    return {
      id,
      name,
      firstFamilyName,
      secondFamilyName,
      parents: parents || [],
      children: children || [],
      siblings: siblings || [],
      partner: partner || [],
      previousPartners: previousPartners || [],

      updateName(newName: string) {
        this.name = newName
      },

      updateFisrtFamilyName(newName: string) {
        this.firstFamilyName = newName
      },

      updateSecondFamilyName(newName: string) {
        this.secondFamilyName = newName
      },

      addParent(m: string) {
        this.parents.push(m)
      },

      removeParent(m: string) {
        const index = this.parents.indexOf(m)
        if (index > -1) {
          this.parents.splice(index, 1)
        }
      },

      getParents() {
        return this.parents
      },

      addChild(m: string) {
        this.children.push(m)
      },

      removeChild(m: string) {
        const index = this.children.indexOf(m)
        if (index > -1) {
          this.children.splice(index, 1)
        }
      },

      getChildren() {
        return this.children
      },

      addSibling(m: string) {
        this.siblings.push(m)
      },

      removeSibling(m: string) {
        const index = this.siblings.indexOf(m)
        if (index > -1) {
          this.siblings.splice(index, 1)
        }
      },

      getSiblings() {
        return this.siblings
      },

      addPartner(m: string) {
        this.partner.push(m)
      },

      removePartner(m: string) {
        const index = this.partner.indexOf(m)
        if (index > -1) {
          this.partner.splice(index, 1)
        }
      },

      getPartner() {
        return this.partner
      },

      addPreviousPartner(m: string) {
        this.previousPartners.push(m)
      },

      removePreviousPartner(m: string) {
        const index = this.previousPartners.indexOf(m)
        if (index > -1) {
          this.previousPartners.splice(index, 1)
        }
      },

      getPreviousPartners() {
        return this.previousPartners
      }
    }
  }

  const initFamilyTree = () => {
    const adjList = new Map()

    function addVertex(v: string) {
      if (!adjList.has(v)) {
        adjList.set(v, new Map())
      }
    }

    function addEdge(v: string, w: string, weight: number) {
      addVertex(v)
      addVertex(w)
      adjList.get(v)?.set(w, weight)
      adjList.get(w)?.set(v, weight === 1 ? 2 : weight === 2 ? 1 : weight)
    }

    function getList() {
      return adjList
    }

    function getNodeRelationships(nodeId: string): { nodeId: string; weight: number }[] {
      const relationships: { weight: number; nodeId: string }[] = []
      const adjacentNodes = adjList.get(nodeId)

      adjacentNodes?.forEach((weight: number, nodeId: string) => {
        relationships.push({ nodeId, weight })
      })

      return relationships
    }

    function* dfsLevels(initialNodeId: string) {
      const visitedNodes = new Set<string>()
      const stack: { nodeId: string; level: number }[] = []
      const levels = new Map<string, number>()

      stack.push({ nodeId: initialNodeId, level: 0 })

      while (stack.length > 0) {
        const { nodeId, level } = stack.pop()!

        if (nodeId && !visitedNodes.has(nodeId)) {
          yield { nodeId, level }

          visitedNodes.add(nodeId)
          levels.set(nodeId, level)

          const relationships = getNodeRelationships(nodeId)
          relationships.forEach(({ nodeId, weight }) => {
            let nextLevel = level

            if (weight === 1) ++nextLevel
            if (weight === 2) --nextLevel

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

    function getNodesGeneration() {
      const initialNode = familyTree.getAnyNodeId()

      if (!initialNode) return 'No available family nodes'

      const rawGenerations = [...familyTree.dfsLevels(initialNode)]
      const genNormalizer = 1 - Math.min(...rawGenerations.map((node) => node.level))
      const generations = rawGenerations.map(({ nodeId, level }) => {
        return { nodeId, generation: level + genNormalizer }
      })

      return generations
    }

    return {
      addVertex,
      addEdge,
      getList,
      getNodeRelationships,
      dfsLevels,
      getAnyNodeId,
      getNodesGeneration
    }
  }

  const familyNodes: Map<string, FamilyNode> = new Map()
  const familyTree = initFamilyTree()

  familyData?.members?.forEach((member: FamilyMember) => {
    const node = initFamilyNode(member)
    familyNodes.set(node.id, node)
  })

  familyNodes?.forEach((node: FamilyNode) => {
    familyTree.addVertex(node.id)

    node.children?.forEach((childId: string) => {
      const child = familyNodes.get(childId)
      if (child) {
        familyTree.addEdge(node.id, child.id, Relation.Child)
      }
    })

    node.parents?.forEach((parentId: string) => {
      const parent = familyNodes.get(parentId)
      if (parent) {
        familyTree.addEdge(node.id, parent.id, Relation.Parent)
      }
      // TODO: comporbar si hay hermanos de los mismos padres para actualizarlos en el momento.
    })

    node.siblings?.forEach((siblingId: string) => {
      const sibling = familyNodes.get(siblingId)
      if (sibling) {
        familyTree.addEdge(node.id, sibling.id, Relation.Sibling)
      }
    })

    node.partner?.forEach((partnerId: string) => {
      const partner = familyNodes.get(partnerId)
      if (partner) {
        familyTree.addEdge(node.id, partner.id, Relation.Partner)
      }
    })

    node.previousPartners?.forEach((previousPartnerId: string) => {
      const previousPartner = familyNodes.get(previousPartnerId)
      if (previousPartner) {
        familyTree.addEdge(node.id, previousPartner.id, Relation.PreviousPartner)
      }
    })
  })

  const roots2 = familyTree.getNodesGeneration()

  console.log('---', roots2)
</script>

<h1>Familia Castaño</h1>
<div id="family-tree-wrapper">
  <!-- {#each Object.entries(generationsObject) as [generation, members]}
    {#if Number(generation) === firstGeneration}
      <p>
        {generation}
      </p>
      {#each members as member}
        <p>{member.name}</p>
        {#if member.partner}
          <p>{familyData.members.find((m) => m.id === Number(member.partner))?.name}</p>
        {/if}
      {/each}
    {/if}
  {/each} -->
</div>

<style lang="scss">
  #family-tree-wrapper {
    display: flex;
    flex-direction: row;
    background-color: aquamarine;
  }
</style>
