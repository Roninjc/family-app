<script lang="ts">
  export let onZoomIn: () => void
  export let onZoomOut: () => void
  export let onReset: () => void
</script>

<div class="tree-camera-controls">
  <button type="button" class="tree-camera-btn" aria-label="Acercar" on:click={onZoomIn}>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5L20.49 19l-5-5zM9.5 14C7 14 5 12 5 9.5S7 5 9.5 5 14 7 14 9.5 12 14 9.5 14zm.5-7H9v2H7v1h2v2h1v-2h2V9h-2z"
      />
    </svg>
  </button>
  <button type="button" class="tree-camera-btn" aria-label="Alejar" on:click={onZoomOut}>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 1 0-.7.7l.27.28v.79l5 5L20.49 19l-5-5zM9.5 14C7 14 5 12 5 9.5S7 5 9.5 5 14 7 14 9.5 12 14 9.5 14zM7 9h5v1H7z"
      />
    </svg>
  </button>
  <button type="button" class="tree-camera-btn" aria-label="Restablecer vista" on:click={onReset}>
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"
      />
    </svg>
  </button>
</div>

<style lang="scss">
  .tree-camera-controls {
    position: fixed;
    right: 16px;
    bottom: max(178px, calc(env(safe-area-inset-bottom) + 96px));
    z-index: 20;
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .tree-camera-btn {
    width: 52px;
    height: 52px;
    border-radius: var(--radius-pill);
    border: none;
    background: var(--app-glass-panel-bg-soft);
    backdrop-filter: blur(var(--app-glass-panel-blur)) saturate(var(--app-glass-panel-saturate));
    -webkit-backdrop-filter: blur(var(--app-glass-panel-blur))
      saturate(var(--app-glass-panel-saturate));
    box-shadow: var(--app-glass-panel-shadow-soft);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-soft);
    cursor: pointer;
    transition:
      transform var(--dur-base) var(--motion-standard),
      box-shadow var(--dur-base) var(--motion-standard),
      background-color var(--dur-base) var(--motion-standard),
      color var(--dur-base) var(--motion-standard);

    &:hover {
      box-shadow: var(--neu-shadow-hover-strong);
    }

    &:active {
      transform: scale(0.94);
    }

    svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
      display: block;
      transition: transform var(--dur-base) var(--motion-standard);
    }
  }

  @media (max-width: 720px) {
    .tree-camera-controls {
      right: 12px;
      bottom: max(196px, calc(env(safe-area-inset-bottom) + 110px));
      gap: 16px;
    }

    .tree-camera-btn {
      width: 46px;
      height: 46px;

      svg {
        width: 22px;
        height: 22px;
      }
    }
  }
</style>
