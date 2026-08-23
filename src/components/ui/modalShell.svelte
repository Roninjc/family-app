<script lang="ts">
  import { fade } from 'svelte/transition'
  import { tick } from 'svelte'
  import SurfaceWrapper from '../surfaceWrapper.svelte'

  export let open = false
  export let ariaLabel = 'Cerrar modal'
  export let ariaLabelledby = ''
  export let onClose: () => void = () => {}
  export let size: 'compact' | 'default' | 'wide' = 'default'

  let modalContentEl: HTMLDivElement | null = null
  let showTopFade = false
  let showBottomFade = false

  $: sizeClass =
    size === 'compact' ? 'app-modal-shell--compact' : size === 'wide' ? 'app-modal-shell--wide' : ''

  function handleBackdropKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') onClose()
  }

  function updateScrollFades() {
    if (!modalContentEl) {
      showTopFade = false
      showBottomFade = false
      return
    }

    const maxScroll = modalContentEl.scrollHeight - modalContentEl.clientHeight
    if (maxScroll <= 1) {
      showTopFade = false
      showBottomFade = false
      return
    }

    const currentScrollTop = modalContentEl.scrollTop

    showTopFade = currentScrollTop > 1
    showBottomFade = currentScrollTop < maxScroll - 1
  }

  async function syncScrollFades() {
    await tick()
    updateScrollFades()
  }

  function observeModalContent(node: HTMLDivElement) {
    const handleMutation = () => updateScrollFades()
    const mutationObserver =
      typeof MutationObserver !== 'undefined'
        ? new MutationObserver(handleMutation)
        : null
    mutationObserver?.observe(node, { childList: true, subtree: true, characterData: true })

    const resizeObserver =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleMutation) : null
    resizeObserver?.observe(node)

    queueMicrotask(updateScrollFades)

    return {
      destroy() {
        mutationObserver?.disconnect()
        resizeObserver?.disconnect()
      }
    }
  }

  $: if (open) {
    void syncScrollFades()
  } else {
    showTopFade = false
    showBottomFade = false
  }
</script>

<svelte:window on:resize={updateScrollFades} />

{#if open}
  <div
    class="app-modal-backdrop"
    role="button"
    tabindex="0"
    aria-label={ariaLabel}
    on:click|stopPropagation={onClose}
    on:keydown={handleBackdropKeydown}
    transition:fade={{ duration: 150 }}
  >
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div
      class={`app-modal-shell ${sizeClass}`.trim()}
      role="dialog"
      aria-modal="true"
      aria-labelledby={ariaLabelledby || undefined}
      on:click|stopPropagation
      transition:fade={{ duration: 180 }}
    >
      <div class="app-modal-chrome-left">
        <slot name="chrome-left" />
      </div>

      <button type="button" class="app-modal-close" aria-label={ariaLabel} on:click={onClose}>
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z"
          />
        </svg>
      </button>

      <SurfaceWrapper>
        <div
          class="app-modal-content"
          class:app-modal-content--scrolled={showTopFade}
          class:app-modal-content--top-fade={showTopFade}
          class:app-modal-content--bottom-fade={showBottomFade}
          bind:this={modalContentEl}
          use:observeModalContent
          on:scroll={updateScrollFades}
        >
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
    --modal-width: min(440px, calc(100vw - 24px));
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 16px;
    background-color: transparent;
    z-index: 1000;
    width: var(--modal-width);
  }

  .app-modal-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 10px;
    background: #efe7dc;
    color: #1f1f1f;
    display: grid;
    place-items: center;
    cursor: pointer;
    z-index: 8;
    pointer-events: auto;
    box-shadow:
      3px 3px 8px rgba(149, 121, 95, 0.14),
      -3px -3px 8px rgba(255, 255, 255, 0.6);
    transition:
      background-color 0.2s var(--motion-standard),
      box-shadow 0.2s var(--motion-standard),
      color 0.2s var(--motion-standard);
  }

  .app-modal-chrome-left {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 8;
    pointer-events: auto;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .app-modal-close svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .app-modal-close:hover {
    box-shadow:
      4px 4px 9px rgba(149, 121, 95, 0.16),
      -4px -4px 9px rgba(255, 255, 255, 0.7);
  }

  .app-modal-shell--compact {
    --modal-width: min(360px, calc(100vw - 24px));
  }

  .app-modal-shell--wide {
    --modal-width: min(600px, calc(100vw - 24px));
  }

  .app-modal-shell :global(.surface-wrapper) {
    width: 100%;
  }

  .app-modal-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
    justify-content: flex-start;
    box-sizing: border-box;
    width: var(--modal-width);
    padding: 64px 22px 22px;
    max-height: 80vh;
    overflow-y: auto;
    position: relative;
  }

  .app-modal-content--top-fade {
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 42px, black 100%);
    mask-image: linear-gradient(to bottom, transparent 0, black 42px, black 100%);
  }

  .app-modal-content--bottom-fade {
    -webkit-mask-image: linear-gradient(to bottom, black 0, black calc(100% - 34px), transparent 100%);
    mask-image: linear-gradient(to bottom, black 0, black calc(100% - 34px), transparent 100%);
  }

  .app-modal-content--top-fade.app-modal-content--bottom-fade {
    -webkit-mask-image: linear-gradient(
      to bottom,
      transparent 0,
      black 42px,
      black calc(100% - 34px),
      transparent 100%
    );
    mask-image: linear-gradient(
      to bottom,
      transparent 0,
      black 42px,
      black calc(100% - 34px),
      transparent 100%
    );
  }

  .app-modal-content :global(h2) {
    margin: 0;
    font-size: var(--fs-lg);
    line-height: var(--lh-tight);
    letter-spacing: 0.01em;
    color: #4e392d;
  }

  .app-modal-content :global(p) {
    margin: 0;
    font-size: var(--fs-sm);
    line-height: var(--lh-copy);
    color: var(--text-muted);
  }

  .app-modal-content :global(.app-btn) {
    font-size: var(--fs-sm);
    font-weight: 700;
  }

  .app-modal-content :global(.modal-heading) {
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    text-align: center;
    gap: 6px;
    min-height: 68px;
    margin: 0;
    padding: 0;
  }

  .app-modal-content :global(.modal-subtitle) {
    margin: 0;
    font-size: var(--fs-sm);
    line-height: var(--lh-copy);
    color: var(--text-muted);
  }

  .app-modal-content :global(.modal-form) {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .app-modal-content :global(.modal-form-actions) {
    margin-top: 16px;
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .app-modal-content :global(.modal-form-actions .app-btn) {
    min-height: 42px;
    min-width: 132px;
  }

  @media (max-width: 520px) {
    .app-modal-content {
      padding: 60px 16px 16px;
      gap: 10px;
    }

    .app-modal-content--top-fade {
      -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 36px, black 100%);
      mask-image: linear-gradient(to bottom, transparent 0, black 36px, black 100%);
    }

    .app-modal-content--bottom-fade {
      -webkit-mask-image: linear-gradient(to bottom, black 0, black calc(100% - 28px), transparent 100%);
      mask-image: linear-gradient(to bottom, black 0, black calc(100% - 28px), transparent 100%);
    }

    .app-modal-content--top-fade.app-modal-content--bottom-fade {
      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 0,
        black 36px,
        black calc(100% - 28px),
        transparent 100%
      );
      mask-image: linear-gradient(
        to bottom,
        transparent 0,
        black 36px,
        black calc(100% - 28px),
        transparent 100%
      );
    }

    .app-modal-content :global(.modal-heading) {
      min-height: 62px;
      gap: 5px;
      margin: 0;
      padding: 0;
    }

    .app-modal-content--scrolled :global(.modal-heading h2) {
      font-size: var(--fs-sm);
    }

    .app-modal-content :global(.modal-form-actions) {
      margin-top: 14px;
      justify-content: stretch;
    }

    .app-modal-content :global(.modal-form-actions .app-btn) {
      flex: 1 1 auto;
      min-width: 0;
    }
  }
</style>
