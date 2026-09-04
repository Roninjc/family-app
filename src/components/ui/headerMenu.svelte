<script lang="ts">
  export let ariaLabel: string
  export let menuClass = ''
  export let badge: number | null = null
  export let detailsEl: HTMLDetailsElement | null = null
</script>

<details
  class={`header-side-circle header-menu ${menuClass}`.trim()}
  bind:this={detailsEl}
  on:toggle
>
  <summary aria-label={ariaLabel}>
    <slot name="icon" />
    {#if badge !== null && badge > 0}
      <span class="header-badge">{badge}</span>
    {/if}
  </summary>
  <div class="header-dropdown" role="menu">
    <slot />
  </div>
</details>
