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

<main>
  <div class="profile-card">
    <LiquidGlassWrapper>
      <div class="profile-content">
        <h1>Mi perfil</h1>

        <p class="account-info">
          <b>{data.profile?.email}</b>
          <span class="role-badge">{roleLabels[data.profile?.role ?? 'viewer']}</span>
        </p>

        <form method="POST" action="?/updateName" use:enhance>
          <div class="input-wrapper">
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
          <button type="submit">Guardar nombre</button>
          {#if form?.nameSaved}<span class="saved-note">Guardado ✓</span>{/if}
          {#if form?.nameError}<div class="form-error">{form.nameError}</div>{/if}
        </form>

        <h2>Contraseña</h2>
        <p class="hint">
          Opcional: crea una contraseña para poder entrar sin esperar el enlace por email.
        </p>
        <form method="POST" action="?/setPassword" use:enhance>
          <div class="input-wrapper">
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
          <button type="submit">Guardar contraseña</button>
          {#if form?.passwordSaved}<span class="saved-note">Guardada ✓</span>{/if}
          {#if form?.passwordError}<div class="form-error">{form.passwordError}</div>{/if}
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
          <button type="submit">Guardar vínculo</button>
          {#if data.linkedMember}
            <span class="saved-note">
              Vinculado actualmente a {data.linkedMember.name} {data.linkedMember.family_name}
            </span>
          {:else}
            <span class="saved-note">Tu cuenta no está vinculada a ningún miembro.</span>
          {/if}
          {#if form?.linkSaved}<span class="saved-note">Vínculo actualizado ✓</span>{/if}
          {#if form?.linkError}<div class="form-error">{form.linkError}</div>{/if}
        </form>

        {#if data.profile?.role === 'admin' || data.profile?.role === 'editor'}
          <a class="admin-link" href="/admin">Gestionar invitaciones y usuarios →</a>
        {/if}

        <div class="footer-actions">
          <a href="/hub">← Volver al hub</a>
          <form method="POST" action="?/logout" use:enhance>
            <button type="submit" class="logout-button">Cerrar sesión</button>
          </form>
        </div>
      </div>
    </LiquidGlassWrapper>
  </div>
</main>

<style lang="scss">
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: max(16px, env(safe-area-inset-top)) 14px max(16px, env(safe-area-inset-bottom));
  }

  .profile-card {
    width: min(460px, 100%);
    border-radius: 18px;
    background-color: var(--surface-soft);
  }

  .profile-content {
    display: flex;
    flex-direction: column;
    width: 100%;

    h1 {
      margin: 0 0 1rem;
      font-size: clamp(1.3rem, 4vw, 1.55rem);
    }

    h2 {
      margin: 1.5rem 0 0.25rem;
      font-size: 1.05rem;
    }

    .account-info {
      margin: 0 0 1.5rem;
      color: #444;
      display: flex;
      flex-direction: column;
      gap: 6px;

      .role-badge {
        align-self: flex-start;
        background: rgba(172, 232, 199, 0.45);
        color: #285e4a;
        border-radius: 999px;
        padding: 3px 9px;
        font-size: 0.8rem;
      }
    }

    .hint {
      margin: 0 0 0.75rem;
      color: #8f8f8f;
      font-size: 0.85rem;
      line-height: 1.4;
    }

    form {
      display: flex;
      flex-direction: column;
    }

    .member-select {
      width: 100%;
      margin-bottom: 0.75rem;
      min-height: 44px;
      border: 1px solid var(--field-border);
      border-radius: 10px;
      background: var(--field-bg);
      color: var(--text-main);
      padding: 0.55rem 0.72rem;
      font-size: 0.95rem;
    }

    .input-wrapper {
      position: relative;
      margin-bottom: 1rem;
      display: flex;

      .modern-input {
        width: 100%;
        min-height: 48px;
        padding: 1rem 0.75rem 0.4rem;
        border: 1px solid var(--field-border);
        border-radius: 10px;
        background: var(--field-bg);
        font-size: 1rem;
        transition:
          border-color 0.2s,
          box-shadow 0.2s;
        color: var(--text-main);

        &:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(31, 79, 123, 0.16);
          background: #fff;
        }
      }

      label {
        position: absolute;
        left: 0.5rem;
        top: 0.5rem;
        padding: 0 6px;
        color: #8f8f8f;
        font-size: 1.1rem;
        pointer-events: none;
        background: transparent;
        transition:
          0.2s cubic-bezier(0.4, 0, 0.2, 1) transform,
          0.2s cubic-bezier(0.4, 0, 0.2, 1) font-size,
          0.2s cubic-bezier(0.4, 0, 0.2, 1) color,
          0.2s cubic-bezier(0.4, 0, 0.2, 1) top,
          0.2s cubic-bezier(0.4, 0, 0.2, 1) background;
      }

      .modern-input:focus + label,
      label.label-active {
        top: 2px;
        left: 12px;
        font-size: 0.8rem;
        color: var(--brand);
        background: var(--field-bg);
        transform: translateY(-60%);
        padding: 0 6px;
        border-radius: 6px;
      }
    }

    button {
      min-height: 42px;
      padding: 8px 12px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      background-color: #2c7a60;
      color: white;
      font-size: 0.9rem;
      transition: ease 0.3s;
      align-self: flex-start;

      &:hover {
        background-color: #24654f;
      }
    }

    .saved-note {
      color: #16a31a;
      font-size: 0.85rem;
      margin-top: 4px;
    }

    .form-error {
      margin-top: 0.5rem;
      color: #dc2626;
      font-size: 0.85rem;
    }

    .admin-link {
      margin-top: 1.5rem;
      color: #096bc1;
      font-size: 0.9rem;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    .footer-actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-top: 2rem;

      a {
        color: #096bc1;
        font-size: 0.9rem;
        text-decoration: none;

        &:hover {
          text-decoration: underline;
        }
      }

      .logout-button {
        background-color: #b63e3e;

        &:hover {
          background-color: #9d2f2f;
        }
      }
    }
  }

  :global(.profile-card .liquid-glass-text-container) {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 24px 18px 18px;
  }
</style>
