<script lang="ts">
  import type { ParentsChildren, Relationship } from '$lib/types/familyTypes'
  import type { LineSpec, MemberBox, Point } from '$lib/utils/connectionLines'
  import {
    childrenLinesSpec,
    coupleLineSpec,
    memberExitOffsets,
    midGapY,
    previousPartnerFamilySpecs
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
  let previousPartnerFamilyLines: { memberToChildren: LineSpec; toPreviousPartner: LineSpec }[] = []
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
    // Se mide el badge (primer hijo del div #id), no el propio .member-node:
    // ese div se estira verticalmente con el align-items: stretch del flex
    // cuando comparte fila con columnas más altas y falsearía el centro.
    const measure = (id: string): MemberBox | undefined => {
      const node = document.getElementById(id)
      const element = node?.firstElementChild ?? node
      return element ? toMemberBox(element.getBoundingClientRect()) : undefined
    }
    const measureAll = (relatives: Relationship[]): MemberBox[] =>
      relatives.map(({ nodeId }) => measure(nodeId)).filter((box): box is MemberBox => Boolean(box))

    const member = toMemberBox(
      (memberElement.firstElementChild ?? memberElement).getBoundingClientRect()
    )

    // Alto estándar del hueco entre generaciones (el gap de 70px del árbol).
    // Si un hijo midiera excepcionalmente más abajo (saltos de varias bandas),
    // las líneas horizontales se quedan a la altura normal del primer hueco y
    // solo se alargan las bajadas verticales.
    const standardGenerationGap = 70
    const clampedChildrenTop = (parentsBottomY: number, childrenTopY: number) =>
      Math.min(childrenTopY, parentsBottomY + standardGenerationGap)

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
        const coupleBottom = Math.max(member.bottom, partner.bottom)
        const busY =
          midGapY(
            coupleBottom,
            clampedChildrenTop(coupleBottom, Math.min(...coupleChildren.map(({ top }) => top)))
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
      const busY =
        midGapY(
          member.bottom,
          clampedChildrenTop(member.bottom, Math.min(...spcChildren.map(({ top }) => top)))
        ) + busSplit
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
        previousPartnerFamilyLines.push(
          previousPartnerFamilySpecs(
            member,
            previousPartner,
            childrenBoxes.map(({ center }) => center),
            clampedChildrenTop(
              Math.max(member.bottom, previousPartner.bottom),
              Math.min(...childrenBoxes.map(({ top }) => top))
            ),
            index,
            previousPartnersChildren.length,
            previousPartnerOffsets[index]
          )
        )
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
  <!-- Del miembro a los hijos sólido; discontinuo solo hacia la expareja -->
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="previous-couple-family-lines"
    style={specStyle(familyLines.memberToChildren)}
  >
    <path d={familyLines.memberToChildren.d} />
  </svg>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    class="previous-couple-join"
    style={specStyle(familyLines.toPreviousPartner)}
  >
    <path d={familyLines.toPreviousPartner.d} />
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
