<script lang="ts">
  import SurfaceWrapper from '../surfaceWrapper.svelte'

  export let ariaLabel = 'Cabecera'
  export let className = ''
</script>

<header class={`app-page-header ${className}`.trim()} aria-label={ariaLabel}>
  <SurfaceWrapper>
    <div class="app-page-header-shell app-page-header-content">
      <slot />
    </div>
  </SurfaceWrapper>
</header>

<style lang="scss">
  header :global(.surface-wrapper) {
    pointer-events: auto;
  }

  header :global(.surface-content) {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 0;
  }
</style>
