<script lang="ts">
  import type { ParentsChildren, PartnerRealtionInfo, Relationship } from '$lib/types/familyTypes'
  import { getMemberCenter, getSvgCoordinates } from '$lib/utils/connectionLines'
  import { onMount } from 'svelte'

  export let memberId: string
  export let actualPartner: Relationship[] = []
  export let SPCChildren: Relationship[] = [] // TODO: implement this
  export let APCChildren: Relationship[] = []
  export let previousPartnersNoChildren: Relationship[] = [] // TODO: implement this
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
  const previousPartnersRelationInfo: PartnerRealtionInfo[] = []

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
      const coordinates = getSvgCoordinates(
        memberCenter,
        actualPartnerRelationInfo.partnerCenter,
        actualPartnerRelationInfo.childrenCenter
      )
      actualPartnerRelationInfo.svgCoordinates = { ...coordinates }
    }

    if (previousPartnersNoChildren.length > 0) {
      previousPartnersNoChildren.forEach((pPartnerNoChildren) => {
        const previousPartnerRelationInfo: PartnerRealtionInfo = {
          partnerCenter: undefined,
          childrenCenter: [],
          svgCoordinates: {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
          }
        }
        previousPartnerRelationInfo.partnerCenter = getMemberCenter(pPartnerNoChildren.nodeId)

        if (memberCenter && previousPartnerRelationInfo.partnerCenter) {
          const coordinates = getSvgCoordinates(
            memberCenter,
            previousPartnerRelationInfo.partnerCenter,
            previousPartnerRelationInfo.childrenCenter
          )

          previousPartnerRelationInfo.svgCoordinates = { ...coordinates }
        }

        previousPartnersRelationInfo.push(previousPartnerRelationInfo)
      })
    }

    if (previousPartnersChildren.length > 0) {
      console.log('[PREVIOUS PARTNER] children ======', previousPartnersChildren)
      previousPartnersChildren.forEach(([pPartnerChildren]) => {
        const previousPartnerRelationInfo: PartnerRealtionInfo = {
          partnerCenter: undefined,
          childrenCenter: [],
          svgCoordinates: {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
          }
        }
        const { parent1, parent2, children } = pPartnerChildren
        const pPartnerId = parent1 === memberId ? parent2 : parent1

        // console.log('-----', memberId, pPartnerId, children, getMemberCenter(pPartnerId!))
        previousPartnerRelationInfo.partnerCenter = getMemberCenter(pPartnerId!)
        children.forEach((child) => {
          const childCenter = getMemberCenter(child?.nodeId)

          if (childCenter) previousPartnerRelationInfo.childrenCenter.push(childCenter)
        })

        if (memberCenter && previousPartnerRelationInfo.partnerCenter) {
          const coordinates = getSvgCoordinates(
            memberCenter,
            previousPartnerRelationInfo.partnerCenter,
            previousPartnerRelationInfo.childrenCenter
          )

          previousPartnerRelationInfo.svgCoordinates = { ...coordinates }
        }

        previousPartnersRelationInfo.push(previousPartnerRelationInfo)
        console.log('[PREVIOUS PARTNER] relations info------', previousPartnersRelationInfo)
      })
    }
  })

  $: actualPartnerCommonChildren = APCChildren.length > 0
  $: previousPartnerCommonChildren = previousPartnersChildren.length > 0
  // $: {
  //   console.log(
  //     memberId,
  //     actualPartnerRelationInfo?.svgCoordinates.left,
  //     actualPartnerRelationInfo?.svgCoordinates.right,
  //     actualPartnerRelationInfo?.svgCoordinates.top,
  //     actualPartnerRelationInfo?.svgCoordinates.bottom,
  //     actualPartnerRelationInfo?.childrenCenter
  //   )
  // }
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

{#if memberCenter && previousPartnersRelationInfo?.length > 0}
  {#each previousPartnersRelationInfo as previousPartnerRelationInfo}
    {#if previousPartnerCommonChildren}
      <!-- <svg
        xmlns="http://www.w3.org/2000/svg"
        class="children-couple-svg"
        width={`${Math.abs(
          previousPartnerRelationInfo.svgCoordinates.left - previousPartnerRelationInfo.svgCoordinates.right
        )}px`}
        height={`${Math.abs(
          previousPartnerRelationInfo.svgCoordinates.top - previousPartnerRelationInfo.svgCoordinates.bottom
        )}px`}
        style={`transform: translate(${previousPartnerRelationInfo.svgCoordinates.left}px, ${
          previousPartnerRelationInfo.svgCoordinates.top - 100
        }px)`}
      >
        <path
          d="M{Math.abs(
            memberCenter.x - previousPartnerRelationInfo.svgCoordinates.left
          )} 0 L{Math.abs(
            previousPartnerRelationInfo.partnerCenter.x - previousPartnerRelationInfo.svgCoordinates.left
          )} 0 M{Math.abs(
            memberCenter.x -
              previousPartnerRelationInfo.svgCoordinates.left +
              Math.abs(memberCenter.x - previousPartnerRelationInfo.partnerCenter.x) / 2
          )} 0 L{Math.abs(
            memberCenter.x -
              previousPartnerRelationInfo.svgCoordinates.left +
              Math.abs(memberCenter.x - previousPartnerRelationInfo.partnerCenter.x) / 2
          )} 105 M0 105 L{Math.abs(
            previousPartnerRelationInfo.svgCoordinates.left -
              previousPartnerRelationInfo.svgCoordinates.right
          )} 105 Z"
        />
        {#each previousPartnerRelationInfo.childrenCenter as childCenter}
          <path
            d="M{Math.abs(
              childCenter.x - previousPartnerRelationInfo.svgCoordinates.left
            )} 105 L{Math.abs(childCenter.x - previousPartnerRelationInfo.svgCoordinates.left)} 140 Z"
          />
        {/each}
      </svg> -->
    {:else if previousPartnerRelationInfo?.partnerCenter}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="no-children-previous-couple-svg"
        width={`${Math.abs(memberCenter.x - previousPartnerRelationInfo.partnerCenter.x)}px`}
        height="2px"
        style={`transform: translate(${previousPartnerRelationInfo.svgCoordinates.left}px, ${
          previousPartnerRelationInfo.svgCoordinates.top - 100
        }px)`}
      >
        <path
          d="M0 0 L{Math.abs(memberCenter.x - previousPartnerRelationInfo.partnerCenter.x)} 0 Z"
        />
      </svg>
    {/if}
  {/each}
{/if}

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

    &.no-children-previous-couple-svg {
      stroke: pink;
    }
  }
</style>
