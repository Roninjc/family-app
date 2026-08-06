<script lang="ts">
  import LiquidGlassWrapper from '../../components/liquidGlassWrapper.svelte'
  import type { Role } from '$lib/types/auth'

  export let data: {
    displayName: string
    role: Role
    trees: Array<{ id: string; name: string; membersCount: number | null; isPrimary: boolean }>
    pendingInvitations: number
    showPendingInvitations: boolean
    notes: Array<{ id: string; title: string; body: string }>
  }

  const roleLabels: Record<Role, string> = {
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Solo lectura'
  }

</script>

<svelte:head>
  <title>Hub familiar — Familia Castaño</title>
</svelte:head>

<main class="hub-page page-shell">
  <section class="hero-card reveal-fade-up">
    <LiquidGlassWrapper>
      <div class="hero-content">
        <p class="eyebrow">Hub familiar</p>
        <h1>Hola, {data.displayName}</h1>
        <p class="subtitle">
          Este es tu punto de entrada. Desde aquí puedes abrir el árbol, revisar novedades y gestionar
          accesos según tu rol.
        </p>
        <div class="hero-actions">
          <a class="app-btn app-btn--primary cta" href="/">Abrir árbol</a>
          <a class="app-btn app-btn--secondary cta" href="/profile">Mi perfil</a>
        </div>
        <p class="role-chip">Rol: {roleLabels[data.role]}</p>
      </div>
    </LiquidGlassWrapper>
  </section>

  <section class="content-grid">
    <article class="module-card reveal-fade-up reveal-delay-1">
      <LiquidGlassWrapper>
        <div class="module-content">
          <div class="module-header">
            <h2>Tus árboles</h2>
            <span class="tag">MVP</span>
          </div>
          <ul class="tree-list">
            {#each data.trees as tree (tree.id)}
              <li>
                <div>
                  <p class="tree-name">{tree.name}</p>
                  {#if tree.membersCount !== null}
                    <p class="tree-meta">{tree.membersCount} miembros</p>
                  {:else}
                    <p class="tree-meta">Sin conteo disponible</p>
                  {/if}
                </div>
                <a class="inline-link app-text-link" href="/">Abrir</a>
              </li>
            {/each}
          </ul>
          <p class="module-note">Pronto podrás alternar entre varios árboles familiares.</p>
        </div>
      </LiquidGlassWrapper>
    </article>

    {#if data.showPendingInvitations}
      <article class="module-card reveal-fade-up reveal-delay-2">
        <LiquidGlassWrapper>
          <div class="module-content">
            <h2>Invitaciones pendientes</h2>
            <p class="invitation-count">{data.pendingInvitations}</p>
            <p class="module-note">
              {#if data.pendingInvitations > 0}
                Tienes invitaciones activas por revisar.
              {:else}
                No hay invitaciones activas en este momento.
              {/if}
            </p>
            <a class="inline-link app-text-link" href="/admin">Ir a administración</a>
          </div>
        </LiquidGlassWrapper>
      </article>
    {/if}

    <article class="module-card full-width reveal-fade-up reveal-delay-2">
      <LiquidGlassWrapper>
        <div class="module-content">
          <h2>Noticias y notas familiares</h2>
          <ul class="notes-list">
            {#each data.notes as note (note.id)}
              <li>
                <h3>{note.title}</h3>
                <p>{note.body}</p>
              </li>
            {/each}
          </ul>
        </div>
      </LiquidGlassWrapper>
    </article>
  </section>

</main>

<style lang="scss">
  .hub-page {
    --surface: rgba(255, 255, 255, 0.34);

    color: var(--text-main);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 100vh;
    padding-bottom: max(106px, env(safe-area-inset-bottom));
  }

  .hero-card :global(.liquid-glass-wrapper),
  .module-card :global(.liquid-glass-wrapper) {
    width: 100%;
  }

  .hero-content,
  .module-content {
    width: 100%;
    box-sizing: border-box;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 11px;
  }

  .eyebrow {
    margin: 0;
    font-size: var(--fs-2xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  h1 {
    margin: 0;
    font-size: var(--fs-xl);
    line-height: var(--lh-tight);
  }

  .subtitle {
    margin: 0;
    color: var(--text-muted);
    line-height: var(--lh-copy);
    font-size: var(--fs-sm);
  }

  .hero-actions {
    margin-top: 6px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .cta {
    width: 100%;
  }

  .role-chip {
    margin: 4px 0 0;
    font-size: var(--fs-xs);
    color: #7b4322;
    background: rgba(212, 144, 90, 0.26);
    border-radius: 999px;
    padding: 4px 10px;
    align-self: flex-start;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 13px;
  }

  .module-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .module-header h2,
  .module-content h2 {
    margin: 0;
    font-size: var(--fs-lg);
    line-height: 1.25;
  }

  .tag {
    font-size: var(--fs-2xs);
    border-radius: 999px;
    padding: 2px 8px;
    background: rgba(173, 103, 54, 0.16);
    color: #8f4f28;
  }

  .tree-list,
  .notes-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .tree-list li,
  .notes-list li {
    background: linear-gradient(160deg, rgba(255, 252, 247, 0.6), rgba(255, 245, 233, 0.4));
    border-radius: 12px;
    padding: 11px;
    border: none;
  }

  .tree-list li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .tree-name,
  .tree-meta,
  .module-note,
  .notes-list p,
  .notes-list h3 {
    margin: 0;
  }

  .tree-name,
  .notes-list h3 {
    font-size: var(--fs-md);
    font-weight: 600;
  }

  .tree-meta,
  .module-note,
  .notes-list p {
    font-size: var(--fs-sm);
    color: var(--text-muted);
  }

  .invitation-count {
    margin: 0;
    font-size: 2.1rem;
    line-height: 1;
    font-weight: 700;
    color: #8e4e29;
  }

  .inline-link {
    font-size: var(--fs-sm);
  }

  .module-card :global(.liquid-glass-wrapper) {
    transition:
      transform 0.24s var(--motion-standard),
      box-shadow 0.24s var(--motion-standard);
  }

  .module-card :global(.liquid-glass-wrapper:hover) {
    transform: translateY(-3px);
    box-shadow: 0 14px 24px rgba(107, 63, 30, 0.16);
  }

  @media (min-width: 760px) {
    .hero-actions {
      grid-template-columns: auto auto;
      justify-content: flex-start;
    }

    .content-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .full-width {
      grid-column: 1 / -1;
    }

  }

  :global(.hero-card .liquid-glass-text-container),
  :global(.module-card .liquid-glass-text-container) {
    align-items: stretch;
    justify-content: flex-start;
  }
</style>
