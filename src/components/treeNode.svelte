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
  let siblings: Relationship[] = []
  let actualPartner: Relationship[] = []
  let previousPartners: Relationship[] = []

  if (memberId && !actualVisitedMembers.includes(memberId)) {
    const stackIndex = actualStack.findIndex((id) => id === memberId)
    if (stackIndex !== -1) actualStack.splice(stackIndex, 1)
    memberToDisplay = true

    // Add actual member to visitedMembers store
    actualVisitedMembers.push(memberId)
    visitedMembers.set(actualVisitedMembers)

    const relationships: Relationship[] = familyTree.getNodeRelationships(memberId)

    children = relationships.filter(
      ({ nodeId, weight }) =>
        weight === 1 && !actualVisitedMembers.includes(nodeId) && !actualStack.includes(nodeId)
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

      // Solo se dibujan líneas hacia hijos renderizados debajo de este nodo;
      // un hijo ya dibujado en otra rama (o en otro árbol raíz) conserva su
      // badge allí y aquí se omite para no cruzar la página con la línea.
      const renderedChildIds = new Set(children.map(({ nodeId }) => nodeId))
      const onlyRenderedChildren = (group: ParentsChildren): ParentsChildren => ({
        ...group,
        children: group.children.filter(({ nodeId }) => renderedChildIds.has(nodeId))
      })

      if (children.length > 0) {
        const singleParentGroup = parentsChildrenArray.find(
          ({ parent1, parent2 }) => parent1 === memberId && !parent2
        )
        if (singleParentGroup) singleParentChildren = onlyRenderedChildren(singleParentGroup)

        if (actualPartner.length > 0) {
          const coupleGroup = parentsChildrenArray.find(({ parent1, parent2 }) => {
            return (
              (parent1 === memberId && parent2 === actualPartner[0].nodeId) ||
              (parent2 === memberId && parent1 === actualPartner[0].nodeId)
            )
          })
          if (coupleGroup) actualPartnerChildren = onlyRenderedChildren(coupleGroup)
        }
      }

      previousPartners.forEach((pPartner) => {
        const pairGroup = parentsChildrenArray.find(({ parent1, parent2 }) => {
          return (
            (parent1 === memberId && parent2 === pPartner.nodeId) ||
            (parent2 === memberId && parent1 === pPartner.nodeId)
          )
        })
        const renderedGroup = pairGroup ? onlyRenderedChildren(pairGroup) : undefined

        if (renderedGroup && renderedGroup.children.length > 0) {
          previousPartnersChildren.push([renderedGroup])
        } else {
          // Sin hijos comunes renderizados debajo: línea discontinua de expareja
          previousPartnersNoChildren.push(pPartner)
        }
      })

      // Ordena la fila de hijos por familia, siguiendo el orden horizontal de
      // las salidas (exparejas a la izquierda, progenitor único, pareja actual
      // a la derecha) para que las líneas de cada familia no se crucen
      const childrenOrder = new Map<string, number>()
      let nextOrder = 0
      const claimGroup = (group: ParentsChildren | undefined) =>
        group?.children.forEach(({ nodeId }) => {
          if (!childrenOrder.has(nodeId)) childrenOrder.set(nodeId, nextOrder++)
        })

      previousPartnersChildren.forEach(([group]) => claimGroup(group))
      claimGroup(singleParentChildren)
      claimGroup(actualPartnerChildren)

      children = [...children].sort(
        (a, b) =>
          (childrenOrder.get(a.nodeId) ?? Infinity) - (childrenOrder.get(b.nodeId) ?? Infinity)
      )
    }

    for (const { nodeId, weight } of relationships) {
      // Se apilan los parientes que el render recursivo puede dibujar. Los
      // padres (weight 2) no: nunca se renderizan hacia abajo y dejarían
      // entradas muertas en el stack que bloquearían su render (y el de sus
      // parejas) cuando les toque salir como raíz extra.
      if (weight !== 2) actualStack.push(nodeId)
    }
    stack.set(actualStack)
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
    gap: 70px;
  }

  .family-node-row {
    display: flex;
    flex-direction: row;
    justify-content: center;
    gap: 40px;
  }

  .couple-wrapper {
    position: relative;
    gap: 20px;
  }
</style>
