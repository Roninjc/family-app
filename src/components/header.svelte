<script lang="ts">
  export let canManage = false
  export let onAddMember: () => void = () => {}
</script>

<header class="tree-header app-page-header" aria-label="Cabecera del árbol">
  <div class="header-content app-page-header-shell glass-panel reveal-fade-up">
    <div class="title-wrap">
      <p class="section-indicator">Árbol familiar</p>
      <h1>Orikara</h1>
    </div>
    {#if canManage}
      <button
        type="button"
        class="app-btn app-btn--ghost add-member-inline"
        on:click={onAddMember}
        aria-label="Añadir nuevo miembro"
      >
        <span class="icon" aria-hidden="true">+</span>
        <span class="label">Añadir</span>
      </button>
    {/if}
  </div>
</header>

<style lang="scss">
  .tree-header {
    margin-bottom: var(--page-header-content-gap, 30px);
  }

  .header-content {
    pointer-events: auto;
    width: min(1080px, 100%);
    border: none;
    padding: var(--space-2) var(--space-3);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .title-wrap {
    display: flex;
    flex-direction: column;
    gap: var(--space-0);

    .section-indicator {
      margin: 0;
      font-size: 0.72rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--accent-sky);
    }

    h1 {
      margin: 0;
      font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif;
      font-size: clamp(1.24rem, 3.2vw, 1.64rem);
      line-height: 1.1;
      font-weight: 600;
      letter-spacing: 0.015em;
      color: var(--text-main);
    }
  }

  .add-member-inline {
    min-height: 38px;
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size: var(--fs-xs);
    gap: var(--space-1);
    flex-shrink: 0;
    color: var(--text-warm-chip);
    border: none;
    background: var(--chip-warm-bg-strong);
    box-shadow:
      5px 5px 12px rgba(149, 121, 95, 0.14),
      -5px -5px 12px rgba(255, 255, 255, 0.72);
    transition:
      transform var(--dur-base) var(--motion-standard),
      box-shadow var(--dur-base) var(--motion-standard),
      background-color var(--dur-base) var(--motion-standard),
      color var(--dur-base) var(--motion-standard);
  }

  .add-member-inline:hover:not(:disabled):not([aria-disabled='true']) {
    background: var(--chip-warm-bg-hover-strong);
    transform: translateY(-1px);
    box-shadow:
      7px 7px 14px rgba(149, 121, 95, 0.17),
      -6px -6px 14px rgba(255, 255, 255, 0.78);
  }

  .add-member-inline:active:not(:disabled):not([aria-disabled='true']) {
    transform: translateY(0);
    box-shadow:
      inset 3px 3px 7px rgba(149, 121, 95, 0.2),
      inset -3px -3px 7px rgba(255, 255, 255, 0.76);
  }

  .icon {
    font-size: 1rem;
    line-height: 1;
    font-weight: 800;
  }

  @media (max-width: 760px) {
    .header-content {
      padding: var(--space-2) var(--space-3);
    }

    .add-member-inline {
      min-width: 38px;
      min-height: 38px;
      padding-inline: var(--space-2);
      border-radius: var(--radius-control);
    }

    .add-member-inline .label {
      display: none;
    }
  }

  @media (min-width: 760px) {
    .tree-header {
      padding-inline: var(--space-3);
    }

    .header-content {
      padding: var(--space-3) var(--space-5);
    }
  }
</style>
