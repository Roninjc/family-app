<script lang="ts">
  import type { ParentsChildren, Relationship } from '$lib/types/familyTypes'
  import { get } from 'svelte/store'
  import { familyTree, parentsChildrenArray, stack, visitedMembers } from '../stores/tree'
  import MemberBadge from './memberBadge.svelte'
  import ConnectionLines from './connectionLines.svelte'

  export let memberId: string

  const actualVisitedMembers = get(visitedMembers)
  const actualStack = get(stack)

  let singleParentChildren: ParentsChildren | undefined
  let actualPartnerChildren: ParentsChildren | undefined
  let previousPartnersNoChildren: Relationship[] = []
  const previousPartnersChildren: ParentsChildren[][] = []

  let memberToDisplay = false
  let renderConnectionLine = false
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

    if (actualPartner.length > 0 || children.length > 0 || previousPartners.length > 0) {
      renderConnectionLine = true

      if (children.length > 0) {
        singleParentChildren = parentsChildrenArray.find(
          ({ parent1, parent2 }) => parent1 === memberId && !parent2
        )
        actualPartnerChildren = parentsChildrenArray.find(({ parent1, parent2 }) => {
          return (
            (parent1 === memberId && parent2 === actualPartner[0].nodeId) ||
            (parent2 === memberId && parent1 === actualPartner[0].nodeId)
          )
        })
        previousPartners.forEach((pPartner) => {
          const pPartnerChildren = parentsChildrenArray.filter(({ parent1, parent2 }) => {
            return (
              (parent1 === memberId && parent2 === pPartner.nodeId) ||
              (parent2 === memberId && parent1 === pPartner.nodeId)
            )
          })
          previousPartnersChildren.push(pPartnerChildren)
        })
      }

      if (previousPartners.length > 0) {
        previousPartnersNoChildren = previousPartners.filter((pPartner) => {
          return !parentsChildrenArray.some(({ parent1, parent2 }) => {
            return (
              (parent1 === memberId && parent2 === pPartner.nodeId) ||
              (parent2 === memberId && parent1 === pPartner.nodeId)
            )
          })
        })
      }
    }

    for (const i in relationships) {
      // Add member's relatives to stack for next loop
      actualStack.push(relationships[i].nodeId)
      stack.set(actualStack)
    }
  }

  $: SPCChildren = singleParentChildren?.children
  $: APCChildren = actualPartnerChildren?.children
</script>

{#if memberToDisplay}
  <div class="family-node-column">
    <div class="family-node-row">
      {#if previousPartners.length > 0}
        {#each previousPartners as pPartner}
          <svelte:self memberId={pPartner.nodeId} />
        {/each}
      {/if}
      <div class="couple-wrapper family-node-row">
        {#if renderConnectionLine}
          <ConnectionLines
            {memberId}
            {actualPartner}
            {SPCChildren}
            {APCChildren}
            {previousPartnersNoChildren}
            {previousPartnersChildren}
          />
        {/if}
        <div id={memberId} class="member-node">
          <MemberBadge {memberId} />
        </div>
        {#if actualPartner.length > 0}
          <svelte:self memberId={actualPartner[0].nodeId} />
        {/if}
      </div>
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
    gap: 50px;
  }

  .family-node-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: 30px;
  }

  .couple-wrapper {
    gap: 20px;
  }
</style>
