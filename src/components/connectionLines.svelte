<script lang="ts">
  import type { Relationship } from '$lib/types/familyTypes'
  import { onMount } from 'svelte'

  export let memberId: string
  export let actualPartner: Relationship[] = []
  export let children: Relationship[] = []

  let memberPosition: { x: number; y: number } | undefined
  let partnerPosition: { x: number; y: number } | undefined
  children = []

  onMount(() => {
    memberPosition = getMemberPosition(memberId)

    if (actualPartner.length > 0) {
      partnerPosition = getMemberPosition(actualPartner[0]?.nodeId)
    }

    // if (children.length > 0) {
    //   children.forEach((child) => {
    //     console.log(getMemberPosition(child?.nodeId))
    //   })
    // }
  })

  const getMemberPosition = (memberId: string) => {
    const elemPos = document.getElementById(memberId)?.getBoundingClientRect()
    let position = undefined

    if (elemPos) {
      const { left, width, top, height } = elemPos
      const elemCenter = {
        x: left + width / 2,
        y: top + height / 2
      }

      if (!isNaN(elemCenter.x) && !isNaN(elemCenter.y)) {
        position = elemCenter
      }
    }

    return position
  }

  $: hasChildren = children.length > 0
  $: {
    console.log(memberPosition, partnerPosition)
  }
</script>

{#if memberPosition && partnerPosition}
  {#if !hasChildren}
    <svg
      viewBox="{memberPosition.x} {memberPosition.y} {Math.abs(
        memberPosition.x - partnerPosition.x
      )} 6"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M{memberPosition.x} {memberPosition.y} L{partnerPosition.x} {partnerPosition.y} Z"
        stroke="#555555"
        stroke-width="6"
      />
    </svg>
  {:else}
    <svg></svg>
  {/if}
{/if}

<style lang="scss">
  svg {
    position: absolute;
    top: 50%;
    left: 50%;
    translate: -50% -50%;
  }
</style>
