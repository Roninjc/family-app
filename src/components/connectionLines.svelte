<script lang="ts">
  import type { ParentsChildren, PartnerRealtionInfo, Relationship } from '$lib/types/familyTypes'
  import { onMount } from 'svelte'

  export let memberId: string
  export let actualPartner: Relationship[] = []
  export let SPCChildren: Relationship[] = []
  export let APCChildren: Relationship[] = []
  export let previousPartnersChildren: ParentsChildren[][] = []
  console.log('first', previousPartnersChildren)

  let memberCenter: { x: number; y: number } | undefined

  const actualPartnerRelationInfo: PartnerRealtionInfo = {
    partnerCenter: undefined,
    childrenCenter: [],
    svgCoordinates: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }
  }
  const previousPartnerRelationInfo: PartnerRealtionInfo[] = [
    {
      partnerCenter: undefined,
      childrenCenter: [],
      svgCoordinates: {
        left: 0,
        right: 0,
        top: 0,
        bottom: 0
      }
    }
  ]

  onMount(() => {
    memberCenter = getMemberCenter(memberId)

    if (actualPartner.length > 0) {
      actualPartnerRelationInfo.partnerCenter = getMemberCenter(actualPartner[0]?.nodeId)
    }

    if (APCChildren.length > 0) {
      APCChildren.forEach((child) => {
        const childCenter = getMemberCenter(child?.nodeId)

        if (childCenter) {
          actualPartnerRelationInfo.childrenCenter.push(childCenter)
        }
      })
    }

    if (memberCenter && actualPartnerRelationInfo.partnerCenter) {
      const childrenX = actualPartnerRelationInfo.childrenCenter.map((child) => child.x)
      const childrenY = actualPartnerRelationInfo.childrenCenter.map((child) => child.y)

      actualPartnerRelationInfo.svgCoordinates.left = Math.min(
        memberCenter?.x,
        actualPartnerRelationInfo.partnerCenter?.x,
        ...childrenX
      )
      actualPartnerRelationInfo.svgCoordinates.right = Math.max(
        memberCenter?.x,
        actualPartnerRelationInfo.partnerCenter?.x,
        ...childrenX
      )
      actualPartnerRelationInfo.svgCoordinates.top = Math.min(
        memberCenter?.y,
        actualPartnerRelationInfo.partnerCenter?.y,
        ...childrenY
      )
      actualPartnerRelationInfo.svgCoordinates.bottom = Math.max(
        memberCenter?.y,
        actualPartnerRelationInfo.partnerCenter?.y,
        ...childrenY
      )
    }

    if (previousPartnersChildren.length > 0) {
      previousPartnersChildren.forEach((pPartner, index) => {
        console.log('-----', memberId, pPartner)
        // previousPartnerRelationInfo[index].center = getMemberCenter(pPartner?.nodeId)
      })
    }
  })

  const getMemberCenter = (memberId: string) => {
    const elemPos = document.getElementById(memberId)?.getBoundingClientRect()
    let center = undefined

    if (elemPos) {
      const { left, width, top, height } = elemPos
      const elemCenter = {
        x: left + width / 2,
        y: top + height / 2
      }

      if (!isNaN(elemCenter.x) && !isNaN(elemCenter.y)) {
        center = elemCenter
      }
    }

    return center
  }

  $: actualPartnerCommonChildren = APCChildren.length > 0
  // $: previousPartnerCommonChildren = previousPartnersChildren.length > 0
  $: {
    console.log(
      memberId,
      actualPartnerRelationInfo?.svgCoordinates.left,
      actualPartnerRelationInfo?.svgCoordinates.right,
      actualPartnerRelationInfo?.svgCoordinates.top,
      actualPartnerRelationInfo?.svgCoordinates.bottom,
      actualPartnerRelationInfo?.childrenCenter
    )
  }
</script>

{#if memberCenter && actualPartnerRelationInfo?.partnerCenter}
  {#if actualPartnerCommonChildren}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="children-couple-svg"
      width={`${Math.abs(
        actualPartnerRelationInfo?.svgCoordinates.left -
          actualPartnerRelationInfo?.svgCoordinates.right
      )}px`}
      height={`${Math.abs(
        actualPartnerRelationInfo?.svgCoordinates.top -
          actualPartnerRelationInfo?.svgCoordinates.bottom
      )}px`}
      style={`transform: translate(${actualPartnerRelationInfo?.svgCoordinates.left}px, ${
        actualPartnerRelationInfo?.svgCoordinates.top - 100
      }px)`}
    >
      <path
        d="M{Math.abs(
          memberCenter.x - actualPartnerRelationInfo?.svgCoordinates.left
        )} 0 L{Math.abs(
          actualPartnerRelationInfo?.partnerCenter.x -
            actualPartnerRelationInfo?.svgCoordinates.left
        )} 0 M{Math.abs(
          memberCenter.x -
            actualPartnerRelationInfo?.svgCoordinates.left +
            Math.abs(memberCenter.x - actualPartnerRelationInfo?.partnerCenter.x) / 2
        )} 0 L{Math.abs(
          memberCenter.x -
            actualPartnerRelationInfo?.svgCoordinates.left +
            Math.abs(memberCenter.x - actualPartnerRelationInfo?.partnerCenter.x) / 2
        )} 105 M0 105 L{Math.abs(
          actualPartnerRelationInfo?.svgCoordinates.left -
            actualPartnerRelationInfo?.svgCoordinates.right
        )} 105 Z"
      />
      {#each actualPartnerRelationInfo?.childrenCenter as childCenter}
        <path
          d="M{Math.abs(
            childCenter.x - actualPartnerRelationInfo?.svgCoordinates.left
          )} 105 L{Math.abs(childCenter.x - actualPartnerRelationInfo?.svgCoordinates.left)} 140 Z"
        />
      {/each}
    </svg>
  {:else}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="no-children-couple-svg"
      width={`${Math.abs(memberCenter.x - actualPartnerRelationInfo.partnerCenter.x)}px`}
      height="2px"
      style={`transform: translate(${actualPartnerRelationInfo.svgCoordinates.left}px, ${
        actualPartnerRelationInfo.svgCoordinates.top - 100
      }px)`}
    >
      <path d="M0 0 L{Math.abs(memberCenter.x - actualPartnerRelationInfo.partnerCenter.x)} 0 Z" />
    </svg>
  {/if}
{/if}

{#if memberCenter && previousPartnerRelationInfo.length > 0}{/if}

<style lang="scss">
  svg {
    position: absolute;
    top: 0;
    left: 0;
    overflow: visible;
    stroke: #555555;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
