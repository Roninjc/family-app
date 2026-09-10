<script lang="ts">
  import type { ParentsChildren, Relationship } from '$lib/types/familyTypes'
  import type { LineSpec, MemberBox, Point } from '$lib/utils/connectionLines'
  import {
    childrenLinesSpec,
    coupleLineSpec,
    memberExitOffsets,
    midGapY,
    previousPartnerNoChildrenSpec,
    previousPartnerFamilySpecs
  } from '$lib/utils/connectionLines'
  import type { GrowSegment } from '$lib/utils/lineGrowth'
  import {
    coupleGrowTree,
    flattenGrowSegments,
    growCriticalPathLength,
    hideGrowSegments,
    previousPartnerChildrenGrowTree,
    revealGrowSegmentsInstantly,
    scheduleGrowReveal,
    singleParentGrowTree
  } from '$lib/utils/lineGrowth'
  import { onMount, tick } from 'svelte'
  import { get } from 'svelte/store'
  import { generations } from '../stores/tree'
  import { drawingLevel, introActive, introLineBudgetMs } from '../stores/treeCamera'

  export let memberId: string
  export let actualPartner: Relationship[] = []
  export let SPCChildren: Relationship[] = []
  export let APCChildren: Relationship[] = []
  export let previousPartnersNoChildren: Relationship[] = []
  export let previousPartnersChildren: ParentsChildren[][] = []

  // Whether this instance was born as part of a cinematic entrance, captured
  // once: it decides which reveal technique this instance uses for its whole
  // lifetime (drawn-in strokes vs. the plain always-on fade below).
  const isIntroInstance = get(introActive)
  const sourceGeneration = generations?.find((entry) => entry.nodeId === memberId)?.generation ?? 1

  let linesRoot: HTMLDivElement
  let pathsReady = false
  let dashSetup = false
  let drawn = false

  // One growth tree per solid, child-bearing line this member owns (couple,
  // single-parent, one per previous-partner-with-children) - see
  // $lib/utils/lineGrowth.ts. Each tree is rendered as its own set of
  // decomposed <path> elements (see template) instead of one combined path.
  // `kind` picks the matching CSS stroke color/class below.
  interface GrowTree {
    kind: 'couple' | 'single-parent' | 'previous-partner'
    box: { left: number; top: number; width: number; height: number }
    roots: GrowSegment[]
  }
  let growTrees: GrowTree[] = []

  // Lines only start growing once their row member's generation has taken
  // its turn to draw (see +page.svelte's playIntroSequence loop).
  $: canDraw = isIntroInstance && $drawingLevel >= sourceGeneration
  $: solidFade = !isIntroInstance

  $: if (isIntroInstance && pathsReady && !dashSetup) {
    dashSetup = true
    hideForDrawIn()
  }

  $: if (isIntroInstance && pathsReady && canDraw && !drawn) {
    drawn = true
    growPaths()
  }

  // Safety net: if the intro ends/bails out before this line's turn came up
  // (e.g. the user starts panning mid-sequence), snap it fully visible
  // instead of leaving it stuck hidden.
  $: if (isIntroInstance && !$introActive && dashSetup && !drawn) {
    drawn = true
    snapFullyDrawn()
  }

  // The solid, child-bearing lines are decomposed into growth trees (see
  // $lib/utils/lineGrowth.ts) and revealed segment-by-segment; the already-
  // dashed previous-partner connectors (fixed `9 7` dasharray) can't reuse
  // that technique (it needs the dasharray to equal the path's own length),
  // so they're hidden/revealed as a whole via opacity instead - both driven
  // imperatively here (not the CSS `.reveal-fade` keyframe below, which
  // would fight these inline styles) so they stay in lockstep.
  function findGrowPath(id: string): SVGPathElement | null {
    return linesRoot?.querySelector<SVGPathElement>(`[data-grow-id="${id}"]`) ?? null
  }

  function dashedSvgs(): SVGElement[] {
    if (!linesRoot) return []
    return Array.from(
      linesRoot.querySelectorAll<SVGElement>(
        'svg.no-children-previous-couple-svg, svg.previous-couple-join'
      )
    )
  }

  function hideForDrawIn() {
    growTrees.forEach(({ roots }) => hideGrowSegments(roots, findGrowPath))
    dashedSvgs().forEach((svg) => {
      svg.style.opacity = '0'
    })
  }

  function growPaths() {
    growTrees.forEach(({ roots }) => {
      const criticalLength = growCriticalPathLength(
        roots,
        (id) => findGrowPath(id)?.getTotalLength() ?? 0
      )
      const budgetMs = get(introLineBudgetMs)
      const speed = budgetMs > 0 ? criticalLength / budgetMs : 0
      scheduleGrowReveal(roots, findGrowPath, speed)
    })
    dashedSvgs().forEach((svg) => {
      svg.style.transition = 'opacity var(--intro-line-ms, 650ms) linear'
      svg.style.opacity = '1'
    })
  }

  function snapFullyDrawn() {
    growTrees.forEach(({ roots }) => revealGrowSegmentsInstantly(roots, findGrowPath))
    dashedSvgs().forEach((svg) => {
      svg.style.transition = 'none'
      svg.style.opacity = '1'
    })
  }

  let coupleLine: LineSpec | undefined
  let coupleChildrenLines: LineSpec | undefined
  let singleParentLines: LineSpec | undefined
  let previousPartnerFamilyLines: { memberToChildren: LineSpec; toPreviousPartner: LineSpec }[] = []
  let previousPartnerDashedLines: LineSpec[] = []

  // Everything is measured once the tree has mounted (resize re-mounts and
  // re-measures). Coordinates are relative to the couple-wrapper (parent of
  // the member-node), so the result is independent of scroll and subtree widths.
  onMount(async () => {
    const memberElement = document.getElementById(memberId)
    const wrapperElement = memberElement?.parentElement
    const wrapperRect = wrapperElement?.getBoundingClientRect()

    if (!memberElement || !wrapperElement || !wrapperRect) return

    // getBoundingClientRect() reflects the tree camera's current CSS
    // transform (translate+scale), but the left/top/width/height we assign
    // below become raw CSS px on freshly-inserted elements - which the same
    // ambient transform will scale again. Undo the current scale (derived
    // from the DOM, so it works regardless of which ancestor holds the
    // transform) so the specs stay correct at any zoom level.
    const ambientScale =
      wrapperElement.offsetWidth > 0 ? wrapperRect.width / wrapperElement.offsetWidth : 1

    const toMemberBox = (rect: DOMRect): MemberBox => ({
      center: {
        x: (rect.left + rect.width / 2 - wrapperRect.left) / ambientScale,
        y: (rect.top + rect.height / 2 - wrapperRect.top) / ambientScale
      },
      top: (rect.top - wrapperRect.top) / ambientScale,
      bottom: (rect.bottom - wrapperRect.top) / ambientScale
    })
    // Measure the badge (first child of the #id div), not .member-node itself:
    // that div stretches vertically (flex align-items: stretch) when sharing a
    // row with taller columns, which would skew the center.
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

    // Standard inter-generation gap height (the tree's 70px gap). If a child
    // exceptionally measures further down (multi-band jumps), horizontal lines
    // stay at the first gap's normal height and only the vertical drops lengthen.
    const standardGenerationGap = 70
    const clampedChildrenTop = (parentsBottomY: number, childrenTopY: number) =>
      Math.min(childrenTopY, parentsBottomY + standardGenerationGap)

    // Spread apart the child-bound exits leaving the same badge (previous-partner
    // stubs + single-parent drop) so each line can be followed
    const totalPreviousPartnerExits =
      previousPartnersChildren.length + previousPartnersNoChildren.length
    const { previousPartnerOffsets, singleParentOffset } = memberExitOffsets(
      totalPreviousPartnerExits,
      SPCChildren.length > 0
    )

    const partner = actualPartner.length > 0 ? measure(actualPartner[0].nodeId) : undefined
    const coupleChildren = partner ? measureAll(APCChildren) : []
    const spcChildren = measureAll(SPCChildren)
    // When current-partner and single-parent children coexist, their buses
    // (at the same gap height) are offset a few px so they don't blend together
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

        if (isIntroInstance) {
          growTrees.push({
            kind: 'couple',
            ...coupleGrowTree(
              member.center,
              partner.center,
              coupleChildren.map(({ center }) => center),
              busY
            )
          })
        }
      } else if (isIntroInstance) {
        growTrees.push({ kind: 'couple', ...coupleGrowTree(member.center, partner.center, [], 0) })
      }
    }

    if (spcChildren.length > 0) {
      const busY =
        midGapY(
          member.bottom,
          clampedChildrenTop(member.bottom, Math.min(...spcChildren.map(({ top }) => top)))
        ) + busSplit
      const origin = { x: member.center.x + singleParentOffset, y: member.center.y }
      singleParentLines = childrenLinesSpec(
        origin,
        spcChildren.map(({ center }) => center),
        busY
      )

      if (isIntroInstance) {
        growTrees.push({
          kind: 'single-parent',
          ...singleParentGrowTree(
            origin,
            spcChildren.map(({ center }) => center),
            busY
          )
        })
      }
    }

    previousPartnersChildren.forEach(([pPartnerChildren], index) => {
      const { parent1, parent2, children } = pPartnerChildren
      const pPartnerId = parent1 === memberId ? parent2 : parent1
      const previousPartner = pPartnerId ? measure(pPartnerId) : undefined
      const childrenBoxes = measureAll(children)

      if (previousPartner && childrenBoxes.length > 0) {
        const spec = previousPartnerFamilySpecs(
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
        previousPartnerFamilyLines.push(spec)

        if (isIntroInstance) {
          const { memberExit, coupleY, dropX, busY } = spec.joinGeometry
          growTrees.push({
            kind: 'previous-partner',
            ...previousPartnerChildrenGrowTree(
              memberExit,
              coupleY,
              dropX,
              busY,
              childrenBoxes.map(({ center }) => center),
              `prev-${index}`
            )
          })
        }
      }
    })
    previousPartnerFamilyLines = previousPartnerFamilyLines

    previousPartnersNoChildren.forEach((pPartner, index) => {
      const previousPartner = measure(pPartner.nodeId)

      if (previousPartner) {
        const offsetIndex = previousPartnersChildren.length + index
        previousPartnerDashedLines.push(
          previousPartnerNoChildrenSpec(
            member,
            previousPartner,
            index,
            previousPartnersNoChildren.length,
            previousPartnerOffsets[offsetIndex] ?? 0
          )
        )
      }
    })
    previousPartnerDashedLines = previousPartnerDashedLines
    growTrees = growTrees

    if (isIntroInstance) {
      await tick()
      pathsReady = true
    }
  })

  const specStyle = ({ left, top, width, height }: LineSpec) =>
    `left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px;`

  const growBoxStyle = (box: GrowTree['box']) =>
    `left: ${box.left}px; top: ${box.top}px; width: ${box.width}px; height: ${box.height}px;`
</script>

<div class="lines-root" bind:this={linesRoot}>
  {#if isIntroInstance}
    {#each growTrees as tree (tree.kind + JSON.stringify(tree.box))}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class={tree.kind === 'couple'
          ? 'couple-line couple-children-lines'
          : tree.kind === 'single-parent'
            ? 'single-parent-lines'
            : 'previous-couple-family-lines'}
        style={growBoxStyle(tree.box)}
      >
        {#each flattenGrowSegments(tree.roots) as segment (segment.id)}
          <path data-grow-id={segment.id} d={segment.d} />
        {/each}
      </svg>
    {/each}
  {:else}
    {#if coupleLine}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="couple-line"
        class:reveal-fade={solidFade}
        style={specStyle(coupleLine)}
      >
        <path d={coupleLine.d} />
      </svg>
    {/if}

    {#if coupleChildrenLines}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="couple-children-lines"
        class:reveal-fade={solidFade}
        style={specStyle(coupleChildrenLines)}
      >
        <path d={coupleChildrenLines.d} />
      </svg>
    {/if}

    {#if singleParentLines}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="single-parent-lines"
        class:reveal-fade={solidFade}
        style={specStyle(singleParentLines)}
      >
        <path d={singleParentLines.d} />
      </svg>
    {/if}

    {#each previousPartnerFamilyLines as familyLines}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="previous-couple-family-lines"
        class:reveal-fade={solidFade}
        style={specStyle(familyLines.memberToChildren)}
      >
        <path d={familyLines.memberToChildren.d} />
      </svg>
    {/each}
  {/if}

  <!-- Dashed previous-partner connectors never join the growth trees above
       (their fixed dasharray can't double as a draw-progress value) - they
       always render through the plain LineSpec + opacity-fade path. -->
  {#each previousPartnerFamilyLines as familyLines}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="previous-couple-join"
      class:reveal-fade={solidFade}
      style={specStyle(familyLines.toPreviousPartner)}
    >
      <path d={familyLines.toPreviousPartner.d} />
    </svg>
  {/each}

  <!-- Previous partner with no common children: dashed line between both badges -->
  {#each previousPartnerDashedLines as dashedLine}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="no-children-previous-couple-svg"
      class:reveal-fade={solidFade}
      style={specStyle(dashedLine)}
    >
      <path d={dashedLine.d} />
    </svg>
  {/each}
</div>

<style lang="scss">
  .lines-root {
    display: contents;
  }

  svg {
    position: absolute;
    z-index: 1;
    overflow: visible;
    fill: none;
    stroke: var(--tree-line-main);
    stroke-width: 2.8;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: var(--tree-line-drop-shadow);
    pointer-events: none;

    &.reveal-fade {
      animation: line-reveal 0.5s var(--motion-standard) both;
    }

    &.couple-line,
    &.couple-children-lines {
      stroke: var(--tree-line-main);
    }

    &.single-parent-lines {
      stroke: var(--tree-line-secondary);
    }

    &.previous-couple-family-lines {
      stroke: var(--tree-line-main);
    }

    &.no-children-previous-couple-svg,
    &.previous-couple-join {
      stroke-dasharray: 9 7;
      stroke-width: 2.2;
      stroke: var(--tree-line-previous);
    }
  }

  @keyframes line-reveal {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }
</style>
