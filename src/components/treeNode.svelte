<script lang="ts">
  import type { ParentsChildren, Relationship } from '$lib/types/familyTypes'
  import { get } from 'svelte/store'
  import { familyTree, parentsChildrenArray, stack, visitedMembers } from '../stores/tree'
  import MemberBadge from './memberBadge.svelte'
  import ConnectionLines from './connectionLines.svelte'

  export let memberId: string

  // Props de líneas de un miembro de la fila (contrato de ConnectionLines)
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

  // Encadena en una única fila de badges (de altura fija: una banda de
  // generación) a todos los parientes del mismo nivel conectados entre sí:
  // [exparejas..., miembro, pareja, hermanos...], recursivamente. Antes cada
  // pariente anidaba su subárbol completo dentro de la fila, y una expareja
  // con hijos propios la hacía más alta de una banda, empujando a los hijos
  // del miembro una generación visual hacia abajo.
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

  // Orden de los hijos de un miembro dentro de la fila de hijos: primero los
  // de cada expareja (en su orden), después el resto de grupos — el mismo
  // orden horizontal que siguen las salidas de las líneas
  function sortChildrenByFamily(rowMemberId: string, childIds: string[]): string[] {
    const order = new Map<string, number>()
    let nextOrder = 0
    const claimGroup = (group?: ParentsChildren) =>
      group?.children.forEach(({ nodeId }) => {
        if (!order.has(nodeId)) order.set(nodeId, nextOrder++)
      })

    relationsOf(rowMemberId, 5).forEach(({ nodeId: exId }) =>
      claimGroup(findPairGroup(rowMemberId, exId))
    )
    claimGroup(
      parentsChildrenArray.find(({ parent1, parent2 }) => parent1 === rowMemberId && !parent2)
    )
    parentsChildrenArray
      .filter(({ parent1, parent2 }) => parent1 === rowMemberId || parent2 === rowMemberId)
      .forEach((group) => claimGroup(group))

    return [...childIds].sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity))
  }

  if (memberId && !actualVisitedMembers.includes(memberId)) {
    const stackIndex = actualStack.findIndex((id) => id === memberId)
    if (stackIndex !== -1) actualStack.splice(stackIndex, 1)
    memberToDisplay = true

    const rowMemberIds = claimRow(memberId)
    const rowSet = new Set(rowMemberIds)
    const rowIndex = new Map(rowMemberIds.map((id, index) => [id, index]))

    // Reclama los hijos de todos los miembros de la fila (cada hijo una vez),
    // recorriendo la fila en orden para que queden cerca de sus padres
    const claimedChildren = new Set<string>()
    for (const rowMemberId of rowMemberIds) {
      const freeChildIds = relationsOf(rowMemberId, 1)
        .map(({ nodeId }) => nodeId)
        .filter((childId) => !claimedChildren.has(childId) && isFree(childId))

      sortChildrenByFamily(rowMemberId, freeChildIds).forEach((childId) => {
        claimedChildren.add(childId)
        clusterChildrenIds.push(childId)
      })
    }

    // Grupos de líneas por miembro de la fila. Cada relación de pareja se
    // dibuja una sola vez: la de pareja actual desde el miembro de la
    // izquierda y las de expareja desde el de la derecha (las exparejas se
    // colocan a su izquierda), que así acumula sus salidas y las escalona.
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

    // Los hijos reclamados se apilan para que otras ramas no los rendericen
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
    gap: 70px;
  }

  .family-node-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    gap: 40px;
  }

  // Solo badges (altura fija) y SVGs absolutos: la fila mide siempre una
  // banda de generación, ancla de las líneas de conexión
  .badges-row {
    position: relative;
  }
</style>
