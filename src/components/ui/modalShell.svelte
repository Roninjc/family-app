<script lang="ts">
  import SurfaceWrapper from '../surfaceWrapper.svelte'

  export let open = false
  export let ariaLabel = 'Cerrar modal'
  export let ariaLabelledby = ''
  export let onClose: () => void = () => {}
  export let size: 'compact' | 'default' | 'wide' = 'default'

  $: sizeClass =
    size === 'compact' ? 'app-modal-shell--compact' : size === 'wide' ? 'app-modal-shell--wide' : ''

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose()
  }
</script>

{#if open}
  <div
    class="app-modal-backdrop"
    role="button"
    tabindex="0"
    aria-label={ariaLabel}
    on:click|stopPropagation={onClose}
    on:keydown={handleBackdropKeydown}
  >
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div
      class={`app-modal-shell ${sizeClass}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledby || undefined}
      on:click|stopPropagation
    >
      <SurfaceWrapper>
        <div class="app-modal-content">
          <slot />
        </div>
      </SurfaceWrapper>
    </div>
  </div>
{/if}

<style lang="scss">
  .app-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(241, 236, 228, 0.68);
    backdrop-filter: blur(2px);
    z-index: 999;
  }

  .app-modal-shell {
    --modal-width: min(420px, calc(100vw - 24px));
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 16px;
    background-color: transparent;
    z-index: 1000;
    width: var(--modal-width);
    min-width: 280px;
  }

  .app-modal-shell--compact {
    --modal-width: min(340px, calc(100vw - 24px));
  }

  .app-modal-shell--wide {
    --modal-width: min(560px, calc(100vw - 24px));
  }

  .app-modal-shell :global(.surface-wrapper) {
    width: 100%;
  }

  .app-modal-content {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    box-sizing: border-box;
    width: var(--modal-width);
    padding: 30px 20px 20px;
    max-height: 80vh;
    overflow-y: auto;
  }
</style>
