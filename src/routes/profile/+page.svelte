<script lang="ts">
  import { enhance } from '$app/forms'
  import LiquidGlassWrapper from '../../components/liquidGlassWrapper.svelte'

  export let data
  export let form

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Solo lectura'
  }

  let displayName = data.profile?.display_name ?? ''
  let password = ''
  let selectedMemberId = data.linkedMember?.id ?? ''
</script>

<svelte:head>
  <title>Mi perfil — Familia Castaño</title>
</svelte:head>

<main class="profile-page page-shell">
  <section class="profile-card reveal-fade-up">
    <LiquidGlassWrapper>
      <div class="profile-content">
        <h1>Mi perfil</h1>

        <p class="account-info">
          <b>{data.profile?.email}</b>
          <span class="role-badge">{roleLabels[data.profile?.role ?? 'viewer']}</span>
        </p>

        <form method="POST" action="?/updateName" use:enhance>
          <div class="input-wrapper floating-input-wrapper">
            <input
              id="displayName"
              class="modern-input"
              type="text"
              name="display_name"
              bind:value={displayName}
              autocomplete="name"
            />
            <label for="displayName" class:label-active={displayName.length > 0}>Tu nombre</label>
          </div>
          <button class="app-btn app-btn--primary" type="submit">Guardar nombre</button>
          {#if form?.nameSaved}<span class="saved-note" role="status">Guardado ✓</span>{/if}
          {#if form?.nameError}<div class="form-error" role="alert">{form.nameError}</div>{/if}
        </form>

        <h2>Contraseña</h2>
        <p class="hint">
          Opcional: crea una contraseña para poder entrar sin esperar el enlace por email.
        </p>
        <form method="POST" action="?/setPassword" use:enhance>
          <div class="input-wrapper floating-input-wrapper">
            <input
              id="newPassword"
              class="modern-input"
              type="password"
              name="password"
              bind:value={password}
              minlength="8"
              autocomplete="new-password"
            />
            <label for="newPassword" class:label-active={password.length > 0}
              >Nueva contraseña</label
            >
          </div>
          <button class="app-btn app-btn--primary" type="submit">Guardar contraseña</button>
          {#if form?.passwordSaved}<span class="saved-note" role="status">Guardada ✓</span>{/if}
          {#if form?.passwordError}<div class="form-error" role="alert">{form.passwordError}</div>{/if}
        </form>

        <h2>Vinculación familiar</h2>
        <p class="hint">
          Puedes vincular tu cuenta a un miembro libre del árbol o dejarla sin vínculo.
        </p>
        <form method="POST" action="?/setMemberLink" use:enhance>
          <select class="member-select" name="member_id" bind:value={selectedMemberId}>
            <option value="">Sin vínculo</option>
            {#each data.availableMembers as member (member.id)}
              <option value={member.id}>{member.name} {member.family_name}</option>
            {/each}
          </select>
          <button class="app-btn app-btn--primary" type="submit">Guardar vínculo</button>
          {#if data.linkedMember}
            <span class="saved-note">
              Vinculado actualmente a {data.linkedMember.name} {data.linkedMember.family_name}
            </span>
          {:else}
            <span class="saved-note">Tu cuenta no está vinculada a ningún miembro.</span>
          {/if}
          {#if form?.linkSaved}
            <span class="saved-note" role="status">Vínculo actualizado ✓</span>
          {/if}
          {#if form?.linkError}<div class="form-error" role="alert">{form.linkError}</div>{/if}
        </form>

        {#if data.profile?.role === 'admin' || data.profile?.role === 'editor'}
          <a class="admin-link app-text-link" href="/admin">Gestionar invitaciones y usuarios</a>
        {/if}

        <form class="logout-form" method="POST" action="?/logout" use:enhance>
          <button type="submit" class="app-btn app-btn--danger logout-button">Cerrar sesión</button>
        </form>
      </div>
    </LiquidGlassWrapper>
  </section>
</main>

<style lang="scss">
  .profile-page {
    min-height: 100vh;
    padding-bottom: max(108px, env(safe-area-inset-bottom));
  }

  .profile-card {
    width: min(920px, 100%);
    border-radius: var(--radius-lg);
    background-color: transparent;
  }

  .profile-content {
    display: flex;
    flex-direction: column;
    width: 100%;

    h1 {
      margin: 0 0 1rem;
      font-size: var(--fs-xl);
      line-height: var(--lh-tight);
    }

    h2 {
      margin: 1.5rem 0 0.25rem;
      font-size: var(--fs-lg);
      line-height: 1.25;
    }

    .account-info {
      margin: 0 0 1.3rem;
      color: var(--text-main);
      display: flex;
      flex-direction: column;
      gap: 6px;

      .role-badge {
        align-self: flex-start;
        background: rgba(212, 146, 93, 0.24);
        color: #7a4323;
        border-radius: 999px;
        padding: 3px 9px;
        font-size: var(--fs-xs);
      }
    }

    .hint {
      margin: 0 0 0.75rem;
      color: var(--text-muted);
      font-size: var(--fs-sm);
      line-height: var(--lh-copy);
    }

    form {
      display: flex;
      flex-direction: column;
    }

    .member-select {
      width: 100%;
      margin-bottom: 0.75rem;
      min-height: 44px;
      border: none;
      border-radius: 10px;
      background: var(--field-bg);
      color: var(--text-main);
      padding: 0.55rem 0.72rem;
      font-size: var(--fs-sm);
    }

    .input-wrapper {
      margin-bottom: 1rem;
    }

    button {
      align-self: flex-start;
    }

    .saved-note {
      color: #16a31a;
      font-size: var(--fs-xs);
      margin-top: 4px;
    }

    .form-error {
      margin-top: 0.5rem;
      color: #dc2626;
      font-size: var(--fs-xs);
    }

    .admin-link {
      margin-top: 1.5rem;
      font-size: var(--fs-sm);
    }

    .logout-form {
      margin-top: 2rem;
    }

    .logout-button {
      width: 100%;
    }
  }

  :global(.profile-card .liquid-glass-text-container) {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 24px 18px 20px;
  }

  @media (min-width: 720px) {
    .profile-content {
      .logout-button {
        width: fit-content;
      }
    }
  }
</style>
