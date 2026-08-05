<script lang="ts">
  import type { ParentsChildren, Relationship } from '$lib/types/familyTypes'
  import type { LineSpec, MemberBox, Point } from '$lib/utils/connectionLines'
  import {
    childrenLinesSpec,
    coupleLineSpec,
    memberExitOffsets,
    midGapY,
    previousPartnerHeights,
    previousPartnerJoinSpec
  } from '$lib/utils/connectionLines'
  import { onMount } from 'svelte'

  export let memberId: string
  export let actualPartner: Relationship[] = []
  export let SPCChildren: Relationship[] = []
  export let APCChildren: Relationship[] = []
  export let previousPartnersNoChildren: Relationship[] = []
  export let previousPartnersChildren: ParentsChildren[][] = []

  let coupleLine: LineSpec | undefined
  let coupleChildrenLines: LineSpec | undefined
  let singleParentLines: LineSpec | undefined
  let previousPartnerFamilyLines: { join: LineSpec; children: LineSpec }[] = []
  let previousPartnerDashedLines: LineSpec[] = []

  // Todo se mide una vez montado el árbol (el resize re-monta y re-mide).
  // Las coordenadas son relativas al couple-wrapper (padre del member-node),
  // así que el resultado no depende del scroll ni de anchos de subárboles.
  onMount(() => {
    const memberElement = document.getElementById(memberId)
    const wrapperRect = memberElement?.parentElement?.getBoundingClientRect()

    if (!memberElement || !wrapperRect) return

    const toMemberBox = (rect: DOMRect): MemberBox => ({
      center: {
        x: rect.left + rect.width / 2 - wrapperRect.left,
        y: rect.top + rect.height / 2 - wrapperRect.top
      },
      top: rect.top - wrapperRect.top,
      bottom: rect.bottom - wrapperRect.top
    })
    const measure = (id: string): MemberBox | undefined => {
      const element = document.getElementById(id)
      return element ? toMemberBox(element.getBoundingClientRect()) : undefined
    }
    const measureAll = (relatives: Relationship[]): MemberBox[] =>
      relatives.map(({ nodeId }) => measure(nodeId)).filter((box): box is MemberBox => Boolean(box))

    const member = toMemberBox(memberElement.getBoundingClientRect())

    // Separa las salidas hacia hijos que parten del mismo badge (stubs de
    // exparejas + bajada de progenitor único) para poder seguir cada línea
    const { previousPartnerOffsets, singleParentOffset } = memberExitOffsets(
      previousPartnersChildren.length,
      SPCChildren.length > 0
    )

    const partner = actualPartner.length > 0 ? measure(actualPartner[0].nodeId) : undefined
    const coupleChildren = partner ? measureAll(APCChildren) : []
    const spcChildren = measureAll(SPCChildren)
    // Si conviven hijos de la pareja actual y de progenitor único, sus buses
    // (a la misma altura del hueco) se separan unos px para no confundirse
    const busSplit = coupleChildren.length > 0 && spcChildren.length > 0 ? 5 : 0

    if (partner) {
      coupleLine = coupleLineSpec(member.center, partner.center)

      if (coupleChildren.length > 0) {
        const busY =
          midGapY(
            Math.max(member.bottom, partner.bottom),
            Math.min(...coupleChildren.map(({ top }) => top))
          ) - busSplit
        const junction: Point = {
          x: (member.center.x + partner.center.x) / 2,
          y: member.center.y
        }
        coupleChildrenLines = childrenLinesSpec(
          junction,
          coupleChildren.map(({ center }) => center),
          busY
        )
      }
    }

    if (spcChildren.length > 0) {
      const busY = midGapY(member.bottom, Math.min(...spcChildren.map(({ top }) => top))) + busSplit
      singleParentLines = childrenLinesSpec(
        { x: member.center.x + singleParentOffset, y: member.center.y },
        spcChildren.map(({ center }) => center),
        busY
      )
    }

    previousPartnersChildren.forEach(([pPartnerChildren], index) => {
      const { parent1, parent2, children } = pPartnerChildren
      const pPartnerId = parent1 === memberId ? parent2 : parent1
      const previousPartner = pPartnerId ? measure(pPartnerId) : undefined
      const childrenBoxes = measureAll(children)

      if (previousPartner && childrenBoxes.length > 0) {
        const { coupleY, busY } = previousPartnerHeights(
          Math.max(member.bottom, previousPartner.bottom),
          Math.min(...childrenBoxes.map(({ top }) => top)),
          index,
          previousPartnersChildren.length
        )
        const dropX = (member.center.x + previousPartner.center.x) / 2

        previousPartnerFamilyLines.push({
          join: previousPartnerJoinSpec(
            member,
            previousPartner,
            coupleY,
            previousPartnerOffsets[index]
          ),
          children: childrenLinesSpec(
            { x: dropX, y: coupleY },
            childrenBoxes.map(({ center }) => center),
            busY
          )
        })
      }
    })
    previousPartnerFamilyLines = previousPartnerFamilyLines

    previousPartnersNoChildren.forEach((pPartner) => {
      const previousPartner = measure(pPartner.nodeId)

      if (previousPartner) {
        previousPartnerDashedLines.push(coupleLineSpec(member.center, previousPartner.center))
      }
    })
    previousPartnerDashedLines = previousPartnerDashedLines
  })

  const specStyle = ({ left, top, width, height }: LineSpec) =>
    `left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px;`
</script>

{#if coupleLine}
  <svg xmlns="http://www.w3.org/2000/svg" class="couple-line" style={specStyle(coupleLine)}>
    <path d={coupleLine.d} />
  </svg>
{/if}

{#if coupleChildrenLines}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="couple-children-lines"
    style={specStyle(coupleChildrenLines)}
  >
    <path d={coupleChildrenLines.d} />
  </svg>
{/if}

{#if singleParentLines}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="single-parent-lines"
    style={specStyle(singleParentLines)}
  >
    <path d={singleParentLines.d} />
  </svg>
{/if}

{#each previousPartnerFamilyLines as familyLines}
  <!-- Unión de la expareja discontinua (relación pasada); bajadas a hijos sólidas -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="previous-couple-join"
    style={specStyle(familyLines.join)}
  >
    <path d={familyLines.join.d} />
  </svg>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="previous-couple-children-lines"
    style={specStyle(familyLines.children)}
  >
    <path d={familyLines.children.d} />
  </svg>
{/each}

<!-- Expareja sin hijos comunes: línea discontinua entre ambos badges -->
{#each previousPartnerDashedLines as dashedLine}
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="no-children-previous-couple-svg"
    style={specStyle(dashedLine)}
  >
    <path d={dashedLine.d} />
  </svg>
{/each}

<style lang="scss">
  svg {
    position: absolute;
    overflow: visible;
    fill: none;
    stroke: #555555;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0px 0px 4px #ffffff);
    pointer-events: none;

    &.no-children-previous-couple-svg,
    &.previous-couple-join {
      stroke-dasharray: 9 7;
      stroke-width: 2.5;
    }
  }
</style>
