<script lang="ts">
  import type { ParentsChildren, Relationship } from '$lib/types/familyTypes'
  import { onMount } from 'svelte'

  export let memberId: string
  export let actualPartner: Relationship[] = []
  // export let previousPartner: Relationship[] = []
  export let SPCChildren: Relationship[] = []
  export let APCChildren: Relationship[] = []
  export let previousPartnersChildren: ParentsChildren[][] = []

  let memberCenter: { x: number; y: number } | undefined
  let actualPartnerCenter: { x: number; y: number } | undefined
  let actualPartnerChildrenCenter: { x: number; y: number }[] = []
  let svgLeft: number
  let svgRight: number
  let svgTop: number
  let svgBottom: number

  onMount(() => {
    memberCenter = getMemberCenter(memberId)

    if (actualPartner.length > 0) {
      actualPartnerCenter = getMemberCenter(actualPartner[0]?.nodeId)
    }

    // if (previousPartner.length > 0) {
    //   partnerCenter = getMemberCenter(actualPartner[0]?.nodeId)
    // }

    if (APCChildren.length > 0) {
      APCChildren.forEach((child) => {
        const childCenter = getMemberCenter(child?.nodeId)

        if (childCenter) {
          actualPartnerChildrenCenter.push(childCenter)
        }
      })
    }

    if (memberCenter && actualPartnerCenter) {
      const childrenX = actualPartnerChildrenCenter.map((child) => child.x)
      const childrenY = actualPartnerChildrenCenter.map((child) => child.y)

      svgLeft = Math.min(memberCenter?.x, actualPartnerCenter?.x, ...childrenX)
      svgRight = Math.max(memberCenter?.x, actualPartnerCenter?.x, ...childrenX)
      svgTop = Math.min(memberCenter?.y, actualPartnerCenter?.y, ...childrenY)
      svgBottom = Math.max(memberCenter?.y, actualPartnerCenter?.y, ...childrenY)
      console.log(
        memberId,
        `left: ${Math.abs((actualPartnerCenter.x - memberCenter.x) / 2)} +
          ${Math.min(memberCenter.x, actualPartnerCenter.x)}px`
      )
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
    console.log(memberId, svgLeft, svgRight, svgTop, svgBottom)
  }
</script>

{#if memberCenter && actualPartnerCenter}
  {#if actualPartnerCommonChildren}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="children-couple-svg"
      width={`${Math.abs(svgLeft - svgRight)}px`}
      height={`${Math.abs(svgTop - svgBottom)}px`}
      style={`transform: translate(${svgLeft}px, ${svgTop - 100}px)`}
    >
      <path
        d="M{memberCenter.x - svgLeft} 0 L{actualPartnerCenter.x - svgLeft} 0 Z"
        stroke="#555555"
        stroke-width="5"
      />
    </svg>
  {:else}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="no-children-couple-svg"
      width={`${Math.abs(memberCenter.x - actualPartnerCenter.x)}px`}
      height="3px"
      style={`transform: translate(${svgLeft}px, ${svgTop - 100}px)`}
    >
      <path
        d="M0 0 L{Math.abs(memberCenter.x - actualPartnerCenter.x)} 0 Z"
        stroke="#555555"
        stroke-width="7"
      />
    </svg>
  {/if}
{/if}

<!-- {#if memberCenter && previousPartnerCenter}
{/if} -->

<style lang="scss">
  svg {
    position: absolute;
    top: 0;
    left: 0;
  }

  // .children-svg {
  //   width: 100%;
  //   height: auto;
  // }

  // .children-couple-svg {
  //   top: 0;
  //   left: 0;
  // }

  // .no-children-couple-svg {
  //   top: 60px;
  // }
</style>
