<script lang="ts">
  import { createEventDispatcher } from 'svelte'

  type ChipOption = {
    value: string
    label: string
  }

  export let options: ChipOption[] = []
  export let value = ''
  export let ariaLabel = 'Selector'

  const dispatch = createEventDispatcher<{ change: string }>()

  function select(nextValue: string) {
    if (nextValue === value) return
    value = nextValue
    dispatch('change', nextValue)
  }
</script>

<div class="app-chip-toggle-group" role="toolbar" aria-label={ariaLabel}>
  {#each options as option (option.value)}
    <button
      type="button"
      class="app-chip app-chip--interactive"
      class:active={option.value === value}
      aria-pressed={option.value === value}
      on:click={() => select(option.value)}
    >
      {option.label}
    </button>
  {/each}
</div>

<style lang="scss">
  .app-chip-toggle-group {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
</style>
