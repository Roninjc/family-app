<script lang="ts">
  import type { ParentsChildren, Relationship } from '$lib/types/familyTypes'
  import { get } from 'svelte/store'
  import { familyTree, parentsChildrenArray, stack, visitedMembers } from '../stores/tree'
  import MemberBadge from './memberBadge.svelte'
  import ConnectionLines from './connectionLines.svelte'

  export let memberId: string

  // Line props for one row member (ConnectionLines' prop contract)
  interface RowMemberLines {
    memberId: string
    render: boolean
    actualPartner: Relationship[]
    SPCChildren: Relationship[]
    APCChildren: Relationship[]
    previousPartnersNoChildren: Relationship[]
    previousPartnersChildren: ParentsChildren[][]
  }

  const actualVisitedMembers = get(visitedMembers)
  const actualStack = get(stack)

  let memberToDisplay = false
  let rowLines: RowMemberLines[] = []
  const clusterChildrenIds: string[] = []

  const isFree = (nodeId: string) =>
    !actualVisitedMembers.includes(nodeId) && !actualStack.includes(nodeId)

  const relationsOf = (nodeId: string, weight: number): Relationship[] =>
    familyTree
      .getNodeRelationships(nodeId)
      .filter((relationship: Relationship) => relationship.weight === weight)

  // Chains every connected same-level relative into a single badges row of
  // fixed height (one generation band): [previous partners..., member,
  // partner, siblings...], recursively. Previously each relative nested its
  // full subtree inside the row, so a previous partner with children of their
  // own made the row taller than one band, pushing the member's children a
  // visual generation down.
  function claimRow(nodeId: string): string[] {
    actualVisitedMembers.push(nodeId)

    const claimRelated = (weight: number, limit = Infinity) =>
      relationsOf(nodeId, weight)
        .filter(({ nodeId: relatedId }) => isFree(relatedId))
        .slice(0, limit)
        .flatMap(({ nodeId: relatedId }) => (isFree(relatedId) ? claimRow(relatedId) : []))

    const previousPartnersRow = claimRelated(5)
    const partnerRow = claimRelated(4, 1)
    const siblingsRow = claimRelated(3)

    return [...previousPartnersRow, nodeId, ...partnerRow, ...siblingsRow]
  }

  const findPairGroup = (memberA: string, memberB: string) =>
    parentsChildrenArray.find(
      ({ parent1, parent2 }) =>
        (parent1 === memberA && parent2 === memberB) || (parent2 === memberA && parent1 === memberB)
    )

  // Order of the children row, following the horizontal position of their
  // parents in the badges row: while walking each row member (left to right),
  // first their exclusive children (no second parent, or second parent
  // outside this row) and then the children shared with each partner or
  // previous partner placed to their right, nearest first. Net result:
  // first ex's exclusive children → children shared with that ex → ... →
  // member's exclusive children → children shared with the current partner →
  // partner's exclusive children, so every line drops almost vertically
  // without crossing other families.
  function sortChildrenByFamily(
    rowMemberId: string,
    childIds: string[],
    rowIndex: Map<string, number>
  ): string[] {
    const order = new Map<string, number>()
    let nextOrder = 0
    const claimGroup = (group: ParentsChildren) =>
      group.children.forEach(({ nodeId }) => {
        if (!order.has(nodeId)) order.set(nodeId, nextOrder++)
      })

    const memberGroups = parentsChildrenArray.filter(
      ({ parent1, parent2 }) => parent1 === rowMemberId || parent2 === rowMemberId
    )
    const coParentOf = ({ parent1, parent2 }: ParentsChildren) =>
      parent1 === rowMemberId ? parent2 : parent1

    memberGroups
      .filter((group) => {
        const coParent = coParentOf(group)
        return !coParent || !rowIndex.has(coParent)
      })
      .forEach(claimGroup)

    memberGroups
      .filter((group) => {
        const coParent = coParentOf(group)
        return coParent !== undefined && rowIndex.has(coParent)
      })
      .sort((a, b) => rowIndex.get(coParentOf(a)!)! - rowIndex.get(coParentOf(b)!)!)
      .forEach(claimGroup)

    return [...childIds].sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity))
  }

  if (memberId && !actualVisitedMembers.includes(memberId)) {
    const stackIndex = actualStack.findIndex((id) => id === memberId)
    if (stackIndex !== -1) actualStack.splice(stackIndex, 1)
    memberToDisplay = true

    const rowMemberIds = claimRow(memberId)
    const rowSet = new Set(rowMemberIds)
    const rowIndex = new Map(rowMemberIds.map((id, index) => [id, index]))

    // Claim the children of every row member (each child once), walking the
    // row in order so they end up close to their parents
    const claimedChildren = new Set<string>()
    for (const rowMemberId of rowMemberIds) {
      const freeChildIds = relationsOf(rowMemberId, 1)
        .map(({ nodeId }) => nodeId)
        .filter((childId) => !claimedChildren.has(childId) && isFree(childId))

      sortChildrenByFamily(rowMemberId, freeChildIds, rowIndex).forEach((childId) => {
        claimedChildren.add(childId)
        clusterChildrenIds.push(childId)
      })
    }

    // Line groups per row member. Each couple relation is drawn exactly once:
    // the current-partner line from the left member and previous-partner lines
    // from the right one (exes sit to its left), which thus accumulates its
    // exits and staggers them.
    rowLines = rowMemberIds.map((rowMemberId) => {
      const memberRowIndex = rowIndex.get(rowMemberId)!
      const renderedChildIds = new Set(
        relationsOf(rowMemberId, 1)
          .map(({ nodeId }) => nodeId)
          .filter((childId) => claimedChildren.has(childId))
      )
      const onlyRenderedChildren = (group: ParentsChildren): ParentsChildren => ({
        ...group,
        children: group.children.filter(({ nodeId }) => renderedChildIds.has(nodeId))
      })

      const actualPartner = relationsOf(rowMemberId, 4)
        .filter(({ nodeId }) => rowSet.has(nodeId) && memberRowIndex < rowIndex.get(nodeId)!)
        .slice(0, 1)
      const previousPartners = relationsOf(rowMemberId, 5).filter(
        ({ nodeId }) => rowSet.has(nodeId) && memberRowIndex > rowIndex.get(nodeId)!
      )

      const singleParentGroup = parentsChildrenArray.find(
        ({ parent1, parent2 }) => parent1 === rowMemberId && !parent2
      )
      const SPCChildren = singleParentGroup ? onlyRenderedChildren(singleParentGroup).children : []

      let APCChildren: Relationship[] = []
      if (actualPartner.length > 0) {
        const coupleGroup = findPairGroup(rowMemberId, actualPartner[0].nodeId)
        if (coupleGroup) APCChildren = onlyRenderedChildren(coupleGroup).children
      }

      const previousPartnersChildren: ParentsChildren[][] = []
      const previousPartnersNoChildren: Relationship[] = []
      previousPartners.forEach((pPartner) => {
        const pairGroup = findPairGroup(rowMemberId, pPartner.nodeId)
        const renderedGroup = pairGroup ? onlyRenderedChildren(pairGroup) : undefined

        if (renderedGroup && renderedGroup.children.length > 0) {
          previousPartnersChildren.push([renderedGroup])
        } else {
          previousPartnersNoChildren.push(pPartner)
        }
      })

      return {
        memberId: rowMemberId,
        render:
          actualPartner.length > 0 ||
          previousPartners.length > 0 ||
          SPCChildren.length > 0 ||
          APCChildren.length > 0,
        actualPartner,
        SPCChildren,
        APCChildren,
        previousPartnersNoChildren,
        previousPartnersChildren
      }
    })

    // Claimed children go on the stack so other branches don't render them
    for (const childId of clusterChildrenIds) {
      actualStack.push(childId)
    }
    visitedMembers.set(actualVisitedMembers)
    stack.set(actualStack)
  }
</script>

{#if memberToDisplay}
  <div class="family-node-column">
    <div class="badges-row family-node-row">
      {#each rowLines as rowMember (rowMember.memberId)}
        {#if rowMember.render}
          <ConnectionLines
            memberId={rowMember.memberId}
            actualPartner={rowMember.actualPartner}
            SPCChildren={rowMember.SPCChildren}
            APCChildren={rowMember.APCChildren}
            previousPartnersNoChildren={rowMember.previousPartnersNoChildren}
            previousPartnersChildren={rowMember.previousPartnersChildren}
          />
        {/if}
        <div id={rowMember.memberId} class="member-node">
          <MemberBadge memberId={rowMember.memberId} />
        </div>
      {/each}
    </div>
    {#if clusterChildrenIds.length > 0}
      <div class="children-wrapper family-node-row">
        {#each clusterChildrenIds as childId (childId)}
          <svelte:self memberId={childId} />
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style lang="scss">
  .family-node-column {
    display: flex;
    flex-direction: column;
    gap: 74px;
  }

  .family-node-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    gap: 42px;
  }

  // Only badges (fixed height) and absolutely positioned SVGs: the row always
  // measures one generation band, the anchor for the connection lines
  .badges-row {
    position: relative;
  }

  .member-node {
    animation: node-reveal 0.4s var(--motion-standard) both;
  }

  @keyframes node-reveal {
    from {
      opacity: 0;
      transform: translateY(8px) scale(0.98);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
</style>
