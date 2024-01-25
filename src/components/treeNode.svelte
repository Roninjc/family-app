<script lang="ts">
  import type { Relationship } from '$lib/types/familyTypes'
  import { get } from 'svelte/store'
  import { familyTree, stack, visitedMembers } from '../stores/tree'
  import MemberBadge from './memberBadge.svelte'

  export let memberId: string

  const actualVisitedMembers = get(visitedMembers)
  const actualStack = get(stack)
  console.log(actualVisitedMembers)

  let memberToDisplay = false
  let children: Relationship[] = []
  let parent: Relationship[] = []
  let siblings: Relationship[] = []
  let actualPartner: Relationship[] = []
  let previousPartners: Relationship[] = []

  if (memberId && !actualVisitedMembers.includes(memberId)) {
    const stackIndex = actualStack.findIndex((id) => id === memberId)
    actualStack.splice(stackIndex, 1)
    memberToDisplay = true

    // Add actual member to visitedMembers store
    actualVisitedMembers.push(memberId)
    visitedMembers.set(actualVisitedMembers)

    const relationships: Relationship[] = familyTree.getNodeRelationships(memberId)

    children = relationships.filter(
      ({ nodeId, weight }) =>
        weight === 1 && !actualVisitedMembers.includes(nodeId) && !actualStack.includes(nodeId)
    )
    parent = relationships.filter(
      ({ nodeId, weight }) =>
        weight === 2 && !actualVisitedMembers.includes(nodeId) && !actualStack.includes(nodeId)
    )
    siblings = relationships.filter(
      ({ nodeId, weight }) =>
        weight === 3 && !actualVisitedMembers.includes(nodeId) && !actualStack.includes(nodeId)
    )
    actualPartner = relationships.filter(
      ({ nodeId, weight }) =>
        weight === 4 && !actualVisitedMembers.includes(nodeId) && !actualStack.includes(nodeId)
    )
    previousPartners = relationships.filter(
      ({ nodeId, weight }) =>
        weight === 5 && !actualVisitedMembers.includes(nodeId) && !actualStack.includes(nodeId)
    )

    for (const i in relationships) {
      // Add member's relatives to stack for next loop
      actualStack.push(relationships[i].nodeId)
      stack.set(actualStack)
    }
  }
</script>

{#if memberToDisplay}
  <div class="family-node-column">
    <div class="family-node-row">
      <div class="couple-wrapper family-node-row">
        <div class="member-node">
          <MemberBadge {memberId} />
        </div>
        {#if actualPartner.length > 0}
          <svelte:self memberId={actualPartner[0].nodeId} />
        {/if}
      </div>
      {#if previousPartners.length > 0}
        {#each previousPartners as pPartner}
          <svelte:self memberId={pPartner.nodeId} />
        {/each}
      {/if}
      {#if siblings.length > 0}
        {#each siblings as sibling}
          <svelte:self memberId={sibling.nodeId} />
        {/each}
      {/if}
    </div>
    {#if children.length > 0}
      <div class="children-wrapper family-node-row">
        {#each children as child}
          <svelte:self memberId={child.nodeId} />
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .family-node-column {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .family-node-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: 10px;
  }

  .couple-wrapper {
    gap: 5px;
  }
</style>
