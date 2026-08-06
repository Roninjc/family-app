<script lang="ts">
  export let canManage = false
  export let onAddMember: () => void = () => {}
</script>

<header class="tree-header" aria-label="Cabecera del árbol">
  <div class="header-content glass-panel reveal-fade-up">
    <div class="title-wrap">
      <p class="section-indicator">Árbol familiar</p>
      <h1>Familia Castaño</h1>
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
    position: sticky;
    top: 0;
    z-index: 10;
    pointer-events: none;
    padding: max(8px, env(safe-area-inset-top)) 10px 0;
  }

  .header-content {
    pointer-events: auto;
    width: min(1080px, 100%);
    margin: 0 auto;
    border: none;
    padding: 10px 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .title-wrap {
    display: flex;
    flex-direction: column;
    gap: 2px;

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
      color: #4e392d;
    }
  }

  .add-member-inline {
    min-height: 38px;
    padding: 0.48rem 0.78rem;
    border-radius: 11px;
    font-size: var(--fs-xs);
    gap: 0.38rem;
    flex-shrink: 0;
    color: var(--accent-sky);
    border: none;
    background: linear-gradient(160deg, rgba(252, 249, 244, 0.9), rgba(245, 236, 225, 0.74));
    box-shadow: 0 6px 12px rgba(110, 89, 67, 0.12);
  }

  .add-member-inline:hover:not(:disabled):not([aria-disabled='true']) {
    background: linear-gradient(160deg, rgba(254, 252, 248, 0.94), rgba(247, 239, 229, 0.8));
  }

  .icon {
    font-size: 1rem;
    line-height: 1;
    font-weight: 800;
  }

  @media (max-width: 760px) {
    .header-content {
      padding: 10px 12px;
    }

    .add-member-inline {
      min-width: 38px;
      min-height: 38px;
      padding-inline: 0.64rem;
      border-radius: 10px;
    }

    .add-member-inline .label {
      display: none;
    }
  }

  @media (min-width: 760px) {
    .tree-header {
      padding-inline: 14px;
    }

    .header-content {
      padding: 11px 20px;
    }
  }
</style>
