<script lang="ts">
  import { createEventDispatcher } from 'svelte'
  import type { FamilyMember } from '$lib/types/familyTypes'

  export let show = false
  export let items: FamilyMember[] = []
  export let activeIds: string[] = []
  export let tone: 'warm' | 'neutral' = 'warm'

  const dispatch = createEventDispatcher<{ select: FamilyMember }>()

  $: toneClass = tone === 'neutral' ? 'app-autocomplete-suggestions--neutral' : ''
</script>

{#if show && items.length > 0}
  <ul class={`app-autocomplete-suggestions ${toneClass}`.trim()}>
    {#each items as item (item.id)}
      <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
      <li
        class:active={activeIds.includes(item.id)}
        on:mousedown|preventDefault={() => dispatch('select', item)}
      >
        {item.name}
        {item.familyName}
      </li>
    {/each}
  </ul>
{/if}

<style lang="scss">
  .app-autocomplete-suggestions--neutral {
    background: var(--app-glass-panel-bg-strong);
  }
</style>
