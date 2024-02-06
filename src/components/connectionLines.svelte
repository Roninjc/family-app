<script lang="ts">
  import type { Relationship } from '$lib/types/familyTypes'
  import { onMount } from 'svelte'

  export let actualPartner: Relationship[] = []
  export let children: Relationship[] = []

  let partnerPosition: { x: number; y: number } | undefined

  onMount(() => {
    if (actualPartner.length > 0) {
      partnerPosition = getMemberPosition(actualPartner[0]?.nodeId)
    }

    if (children.length > 0) {
      children.forEach((child) => {
        console.log(getMemberPosition(child?.nodeId))
      })
    }
  })
  const getMemberPosition = (memberId: string) => {
    let position = undefined
    const elemPos = document.getElementById(memberId)?.getBoundingClientRect()
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
</script>

<svg></svg>

<style lang="scss">
</style>
