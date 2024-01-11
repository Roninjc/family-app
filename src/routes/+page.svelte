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

  const familyTree = initFamilyTree()

  familyData?.members?.forEach((member: FamilyMember) => {
    familyTree.addVertex(member.id)

    member.children?.forEach((childId: string) => {
      const child = familyData.members.find((member) => member.id === childId)
      if (child) {
        familyTree.addEdge(member.id, child.id, Relation.Child)
      }
    })

    member.parents?.forEach((parentId: string) => {
      const parent = familyData.members.find((member) => member.id === parentId)
      if (parent) {
        familyTree.addEdge(member.id, parent.id, Relation.Parent)
      }
      // TODO: comporbar si hay hermanos de los mismos padres para actualizarlos en el momento.
    })

    member.siblings?.forEach((siblingId: string) => {
      const sibling = familyData.members.find((member) => member.id === siblingId)
      if (sibling) {
        familyTree.addEdge(member.id, sibling.id, Relation.Sibling)
      }
    })

    member.partner?.forEach((partnerId: string) => {
      const partner = familyData.members.find((member) => member.id === partnerId)
      if (partner) {
        familyTree.addEdge(member.id, partner.id, Relation.Partner)
      }
    })

    member.previousPartners?.forEach((previousPartnerId: string) => {
      const previousPartner = familyData.members.find((member) => member.id === previousPartnerId)
      if (previousPartner) {
        familyTree.addEdge(member.id, previousPartner.id, Relation.PreviousPartner)
      }
    })
  })

  const generations = familyTree.getNodesGeneration()
  const firstGenreation = generations?.filter((member) => member.generation === 1)
  let initialMember: string
  if (firstGenreation && firstGenreation.length > 0) {
    initialMember = firstGenreation[0].nodeId
    console.log(
      '---',
      familyTree.getList(),
      familyTree.getNodeRelationships(initialMember),
      firstGenreation
    )
  }
</script>

<h1>Familia Castaño</h1>
<div id="family-tree-wrapper">
  {#if initialMember}
    <div class="family-node-row">
      <div class="family-node-row">
        <div class="member-node">
          {initialMember} - {JSON.stringify(familyTree.getNodeRelationships(initialMember))}
        </div>

        <!-- Partner ramification -->
        {#each familyTree.getNodeRelationships(initialMember) as related (related.nodeId)}
          {#if related.weight === 4}
            <div class="family-node-row">
              <div class="member-node" data-member-id={related.nodeId}>
                {related.nodeId}
              </div>
            </div>
          {/if}
        {/each}

        <!-- Previous partners ramification -->
        {#each familyTree.getNodeRelationships(initialMember) as related (related.nodeId)}
          {#if related.weight === 5}
            <div class="family-node-row">
              <div class="member-node" data-member-id={related.nodeId}>
                {related.nodeId}
              </div>
            </div>
          {/if}
        {/each}
      </div>

      <!-- Siblings ramification -->
      {#each familyTree.getNodeRelationships(initialMember) as related (related.nodeId)}
        {#if related.weight === 3}
          <div class="family-node-row">
            <div class="member-node" data-member-id={related.nodeId}>
              {related.nodeId}
            </div>
          </div>
        {/if}
      {/each}
    </div>
  {/if}
</div>

<style lang="scss">
  #family-tree-wrapper {
    display: flex;
    flex-direction: row;
    background-color: aquamarine;

    .family-node-row {
      display: flex;
      flex-direction: row;
    }

    .family-node-column {
      display: flex;
      flex-direction: column;
    }
  }
</style>
