<script lang="ts">
  import type {
    ParentsChildren,
    PartnerRealtionInfo,
    PreviousPartnerRealtionInfo,
    Relationship
  } from '$lib/types/familyTypes'
  import {
    getMemberCenter,
    getPreviousPartnerChildrenLinesCoordinates,
    getSvgCoordinates
  } from '$lib/utils/connectionLines'
  import { onMount } from 'svelte'

  export let memberId: string
  export let actualPartner: Relationship[] = []
  export let SPCChildren: Relationship[] = [] // TODO: implement this
  export let APCChildren: Relationship[] = []
  export let previousPartnersNoChildren: Relationship[] = [] // TODO: implement this
  export let previousPartnersChildren: ParentsChildren[][] = []

  let memberCenter: { x: number; y: number } | undefined

  const actualPartnerRelationInfo: PartnerRealtionInfo = {
    partnerCenter: { x: 0, y: 0 },
    childrenCenter: [],
    svgCoordinates: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }
  }
  const noPartnerChildrenInfo: any = {
    childrenCenter: [],
    svgCoordinates: {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0
    }
  }
  const previousPartnersNoChildrenRelationInfo: PartnerRealtionInfo[] = []
  const previousPartnersChildrenRelationInfo: PreviousPartnerRealtionInfo[] = []
  const badgeWidth = 150

  onMount(() => {
    memberCenter = getMemberCenter(memberId)

    if (actualPartner.length > 0) {
      actualPartnerRelationInfo.partnerCenter = getMemberCenter(actualPartner[0]?.nodeId)
    }

    if (SPCChildren.length > 0) {
      SPCChildren.forEach((child) => {
        const childCenter = getMemberCenter(child?.nodeId)

        if (childCenter) {
          noPartnerChildrenInfo.childrenCenter.push(childCenter)
        }
      })
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

    if (memberCenter && noPartnerChildrenInfo.childrenCenter.length > 0) {
      const coordinates = getSvgCoordinates(
        memberCenter,
        undefined,
        noPartnerChildrenInfo.childrenCenter
      )
      noPartnerChildrenInfo.svgCoordinates = { ...coordinates }
    }

    if (previousPartnersNoChildren.length > 0) {
      previousPartnersNoChildren.forEach((pPartnerNoChildren) => {
        const previousPartnerRelationInfo: PartnerRealtionInfo = {
          partnerCenter: { x: 0, y: 0 },
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

        previousPartnersNoChildrenRelationInfo.push(previousPartnerRelationInfo)
      })
    }

    if (previousPartnersChildren.length > 0) {
      previousPartnersChildren.forEach(([pPartnerChildren], index) => {
        const previousPartnerRelationInfo: PreviousPartnerRealtionInfo = {
          partnerCenter: { x: 0, y: 0 },
          childrenCenter: [],
          svgCoordinates: {
            left: 0,
            right: 0,
            top: 0,
            bottom: 0
          },
          memberConnectorX: 0,
          coupleHeight: 0,
          coupleChildrenConnectorX: 0,
          childrenHeight: 0,
          coupleChildrenHorizontalLine: { start: 0, end: 0 }
        }
        const { parent1, parent2, children } = pPartnerChildren
        const pPartnerId = parent1 === memberId ? parent2 : parent1

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

        const {
          memberConnectorX,
          coupleHeight,
          coupleChildrenConnectorX,
          childrenHeight,
          coupleChildrenHorizontalLine
        } = getPreviousPartnerChildrenLinesCoordinates(
          previousPartnerRelationInfo,
          previousPartnersChildren.length,
          index
        )
        previousPartnerRelationInfo.memberConnectorX = memberConnectorX
        previousPartnerRelationInfo.coupleHeight = coupleHeight
        previousPartnerRelationInfo.coupleChildrenConnectorX = coupleChildrenConnectorX
        previousPartnerRelationInfo.childrenHeight = childrenHeight
        previousPartnerRelationInfo.coupleChildrenHorizontalLine = {
          ...coupleChildrenHorizontalLine
        }

        previousPartnersChildrenRelationInfo.push(previousPartnerRelationInfo)
      })
    }
  })

  $: actualPartnerCommonChildren = APCChildren.length > 0
  $: noPartnerChildren = SPCChildren.length > 0
  $: previousPartnerCommonChildren = previousPartnersChildren.length > 0
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
      style={`transform: translateX(-${Math.abs(
        memberCenter.x -
          actualPartnerRelationInfo?.svgCoordinates.left +
          Math.abs(memberCenter.x - actualPartnerRelationInfo?.partnerCenter.x) / 2
      )}px)`}
    >
      <path
        d="M{Math.abs(
          memberCenter.x - actualPartnerRelationInfo?.svgCoordinates.left
        )} 0 H{Math.abs(
          actualPartnerRelationInfo?.partnerCenter.x -
            actualPartnerRelationInfo?.svgCoordinates.left
        )} M{Math.abs(
          memberCenter.x -
            actualPartnerRelationInfo?.svgCoordinates.left +
            Math.abs(memberCenter.x - actualPartnerRelationInfo?.partnerCenter.x) / 2
        )} 0 V115 M0 115 H{Math.abs(
          actualPartnerRelationInfo?.svgCoordinates.left -
            actualPartnerRelationInfo?.svgCoordinates.right
        )}"
      />
      {#each actualPartnerRelationInfo?.childrenCenter as childCenter}
        <path
          d="M{Math.abs(childCenter.x - actualPartnerRelationInfo?.svgCoordinates.left)} 115 V160"
        />
      {/each}
    </svg>
  {:else}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="no-children-couple-svg"
      width={`${Math.abs(memberCenter.x - actualPartnerRelationInfo.partnerCenter.x)}px`}
      height="2px"
      style={`transform: translateX(-${Math.abs(
        memberCenter.x -
          actualPartnerRelationInfo?.svgCoordinates.left +
          Math.abs(memberCenter.x - actualPartnerRelationInfo?.partnerCenter.x) / 2
      )}px)`}
    >
      <path d="M0 0 H{Math.abs(memberCenter.x - actualPartnerRelationInfo.partnerCenter.x)}" />
    </svg>
  {/if}
{/if}

{#if memberCenter && noPartnerChildren}
  {#if noPartnerChildrenInfo.childrenCenter.length > 0}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="children-no-partner-svg"
      width={`${Math.abs(
        noPartnerChildrenInfo?.svgCoordinates.left - noPartnerChildrenInfo?.svgCoordinates.right
      )}px`}
      height={`${Math.abs(
        noPartnerChildrenInfo?.svgCoordinates.top - noPartnerChildrenInfo?.svgCoordinates.bottom
      )}px`}
      style={`left: 0; transform: translateX(${
        noPartnerChildrenInfo?.svgCoordinates.left + badgeWidth / 2 - memberCenter.x
      }px)`}
    >
      <path
        d="M{memberCenter.x -
          noPartnerChildrenInfo?.svgCoordinates.left +
          10} 10 V115 M{noPartnerChildrenInfo.childrenCenter.length === 1 ? 10 : 0} 115 H{Math.abs(
          noPartnerChildrenInfo?.svgCoordinates.left - noPartnerChildrenInfo?.svgCoordinates.right
        )}"
      />
      {#each noPartnerChildrenInfo?.childrenCenter as childCenter}
        <path
          d="M{Math.abs(childCenter.x - noPartnerChildrenInfo?.svgCoordinates.left)} 115 V160"
        />
      {/each}
    </svg>
  {/if}
{/if}

<!-- TODO: Este probablemente lo quitamos, pensar si tiene sentido -->
<!-- {#if memberCenter && previousPartnersNoChildrenRelationInfo?.length > 0}
  {#each previousPartnersNoChildrenRelationInfo as previousPartnerNoChildrenRelationInfo}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="no-children-previous-couple-svg"
      width={`${Math.abs(
        memberCenter?.x - previousPartnerNoChildrenRelationInfo?.partnerCenter?.x
      )}px`}
      height="2px"
      style={`transform: translateX(-${previousPartnerNoChildrenRelationInfo?.svgCoordinates?.left}px)`}
    >
      <path
        d="M0 0 H{Math.abs(
          memberCenter?.x - previousPartnerNoChildrenRelationInfo?.partnerCenter?.x
        )}"
      />
    </svg>
  {/each}
{/if} -->

{#if memberCenter && previousPartnersChildrenRelationInfo?.length > 0}
  {#each previousPartnersChildrenRelationInfo as previousPartnerChildrenRelationInfo}
    {#if previousPartnerCommonChildren}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="children-previous-couple-svg"
        width={`${Math.abs(
          previousPartnerChildrenRelationInfo?.svgCoordinates?.left -
            previousPartnerChildrenRelationInfo?.svgCoordinates?.right
        )}px`}
        height={`${Math.abs(
          previousPartnerChildrenRelationInfo?.svgCoordinates?.top -
            previousPartnerChildrenRelationInfo?.svgCoordinates?.bottom
        )}px`}
        style={`left: 0; transform: translateX(${
          previousPartnerChildrenRelationInfo?.svgCoordinates?.left +
          badgeWidth / 2 -
          memberCenter.x
        }px)`}
      >
        <path
          d="M{Math.abs(
            memberCenter?.x -
              previousPartnerChildrenRelationInfo?.memberConnectorX -
              previousPartnerChildrenRelationInfo?.svgCoordinates?.left
          )} 70 V{previousPartnerChildrenRelationInfo?.coupleHeight} M{Math.abs(
            previousPartnerChildrenRelationInfo?.partnerCenter?.x -
              previousPartnerChildrenRelationInfo?.svgCoordinates?.left
          )} 70 V{previousPartnerChildrenRelationInfo?.coupleHeight} M{Math.abs(
            memberCenter?.x -
              previousPartnerChildrenRelationInfo?.memberConnectorX -
              previousPartnerChildrenRelationInfo?.svgCoordinates?.left
          )} {previousPartnerChildrenRelationInfo?.coupleHeight} H{Math.abs(
            previousPartnerChildrenRelationInfo?.partnerCenter?.x -
              previousPartnerChildrenRelationInfo?.svgCoordinates?.left
          )} M{Math.abs(
            previousPartnerChildrenRelationInfo?.partnerCenter?.x -
              previousPartnerChildrenRelationInfo?.svgCoordinates?.left +
              previousPartnerChildrenRelationInfo.coupleChildrenConnectorX
          )} {previousPartnerChildrenRelationInfo?.coupleHeight} V{previousPartnerChildrenRelationInfo?.childrenHeight} M{previousPartnerChildrenRelationInfo
            ?.coupleChildrenHorizontalLine
            ?.start} {previousPartnerChildrenRelationInfo?.childrenHeight} H{previousPartnerChildrenRelationInfo
            ?.coupleChildrenHorizontalLine?.end}"
        />
        {#each previousPartnerChildrenRelationInfo?.childrenCenter as childCenter}
          <path
            d="M{Math.abs(
              childCenter?.x - previousPartnerChildrenRelationInfo?.svgCoordinates?.left
            )} {previousPartnerChildrenRelationInfo?.childrenHeight} V160"
          />
        {/each}
      </svg>
    {/if}
  {/each}
{/if}

<style lang="scss">
  svg {
    position: absolute;
    top: 40px;
    left: 50%;
    overflow: visible;
    stroke: #555555;
    stroke-width: 3;
    stroke-linecap: round;
    stroke-linejoin: round;
    filter: drop-shadow(0px 0px 4px #ffffff);

    &.no-children-previous-couple-svg {
      stroke: pink;
    }
  }
</style>
