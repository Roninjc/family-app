<script lang="ts">
  import { canEdit } from '$lib/types/auth'
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

  $: profileForPermission = {
    id: 'local',
    email: '',
    display_name: data.displayName,
    role: data.role,
    member_id: null,
    created_at: ''
  }
</script>

<svelte:head>
  <title>Hub familiar — Familia Castaño</title>
</svelte:head>

<main class="hub-page">
  <section class="hero-card">
    <LiquidGlassWrapper>
      <div class="hero-content">
        <p class="eyebrow">Hub familiar</p>
        <h1>Hola, {data.displayName}</h1>
        <p class="subtitle">
          Este es tu punto de entrada. Desde aquí puedes abrir el árbol, revisar novedades y gestionar
          accesos según tu rol.
        </p>
        <div class="hero-actions">
          <a class="cta cta-primary" href="/">Abrir árbol</a>
          <a class="cta cta-secondary" href="/profile">Mi perfil</a>
        </div>
        <p class="role-chip">Rol: {roleLabels[data.role]}</p>
      </div>
    </LiquidGlassWrapper>
  </section>

  <section class="content-grid">
    <article class="module-card">
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
                <a class="inline-link" href="/">Abrir</a>
              </li>
            {/each}
          </ul>
          <p class="module-note">Pronto podrás alternar entre varios árboles familiares.</p>
        </div>
      </LiquidGlassWrapper>
    </article>

    {#if data.showPendingInvitations}
      <article class="module-card">
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
            <a class="inline-link" href="/admin">Ir a administración</a>
          </div>
        </LiquidGlassWrapper>
      </article>
    {/if}

    <article class="module-card full-width">
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

  <nav class="quick-nav">
    {#if canEdit(profileForPermission)}
      <a href="/admin">Administracion</a>
    {/if}
    <a href="/profile">Perfil</a>
    <a href="/">Árbol</a>
  </nav>
</main>

<style lang="scss">
  :global(body) {
    margin: 0;
    min-height: 100vh;
    background:
      radial-gradient(circle at 10% 15%, rgba(250, 232, 210, 0.7), transparent 35%),
      radial-gradient(circle at 90% 5%, rgba(200, 221, 240, 0.6), transparent 30%),
      #ececec;
  }

  .hub-page {
    --text-main: #27272a;
    --text-muted: #5b5b63;
    --surface: rgba(255, 255, 255, 0.34);
    --surface-strong: rgba(255, 255, 255, 0.58);

    color: var(--text-main);
    width: min(980px, 100%);
    margin: 0 auto;
    padding: max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom));
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .hero-card :global(.liquid-glass-wrapper),
  .module-card :global(.liquid-glass-wrapper) {
    width: 100%;
  }

  .hero-content,
  .module-content {
    width: 100%;
    box-sizing: border-box;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .eyebrow {
    margin: 0;
    font-size: 0.78rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  h1 {
    margin: 0;
    font-size: clamp(1.4rem, 2.8vw, 1.8rem);
    line-height: 1.2;
  }

  .subtitle {
    margin: 0;
    color: var(--text-muted);
    line-height: 1.5;
    font-size: 0.95rem;
  }

  .hero-actions {
    margin-top: 4px;
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .cta {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 10px;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.95rem;
  }

  .cta-primary {
    background: linear-gradient(135deg, #2c7a60, #3b966f);
    color: white;
  }

  .cta-secondary {
    background: var(--surface-strong);
    color: var(--text-main);
    border: 1px solid rgba(255, 255, 255, 0.6);
  }

  .role-chip {
    margin: 4px 0 0;
    font-size: 0.8rem;
    color: #285e4a;
    background: rgba(172, 232, 199, 0.45);
    border-radius: 999px;
    padding: 4px 10px;
    align-self: flex-start;
  }

  .content-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
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
    font-size: 1rem;
  }

  .tag {
    font-size: 0.74rem;
    border-radius: 999px;
    padding: 2px 8px;
    background: rgba(46, 92, 140, 0.15);
    color: #1f4f7b;
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
    background: var(--surface);
    border-radius: 10px;
    padding: 10px;
    border: 1px solid rgba(255, 255, 255, 0.5);
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
    font-size: 0.95rem;
    font-weight: 600;
  }

  .tree-meta,
  .module-note,
  .notes-list p {
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .invitation-count {
    margin: 0;
    font-size: 2rem;
    line-height: 1;
    font-weight: 700;
    color: #1f4f7b;
  }

  .inline-link {
    color: #1f4f7b;
    text-decoration: none;
    font-weight: 600;
    font-size: 0.9rem;
  }

  .quick-nav {
    position: sticky;
    bottom: max(8px, env(safe-area-inset-bottom));
    display: flex;
    justify-content: center;
    gap: 8px;
    flex-wrap: wrap;
    padding-top: 4px;

    a {
      text-decoration: none;
      min-height: 40px;
      padding: 0 14px;
      display: inline-flex;
      align-items: center;
      border-radius: 999px;
      background: var(--surface-strong);
      color: var(--text-main);
      border: 1px solid rgba(255, 255, 255, 0.6);
      font-size: 0.85rem;
      font-weight: 600;
    }
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
