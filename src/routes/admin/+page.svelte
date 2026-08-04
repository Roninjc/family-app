<script lang="ts">
  import { enhance } from '$app/forms'
  import LiquidGlassWrapper from '../../components/liquidGlassWrapper.svelte'

  export let data
  export let form

  let inviteEmail = ''

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Solo lectura'
  }

  $: pendingInvites = data.invites.filter(
    (invite) => !data.profiles.some((profile) => profile.email === invite.email)
  )
</script>

<svelte:head>
  <title>Administración — Familia Castaño</title>
</svelte:head>

<main>
  <div class="admin-card">
    <LiquidGlassWrapper>
      <div class="admin-content">
        <h1>Administración</h1>

        <h2>Invitar a la familia</h2>
        <form method="POST" action="?/invite" use:enhance>
          <div class="invite-row">
            <input
              class="modern-input"
              type="email"
              name="email"
              placeholder="email@ejemplo.com"
              bind:value={inviteEmail}
              required
            />
            <select name="role">
              <option value="editor">Editor</option>
              <option value="viewer">Solo lectura</option>
              <option value="admin">Administrador</option>
            </select>
            <button type="submit">Invitar</button>
          </div>
        </form>
        {#if form?.invited}<p class="ok-note">Invitación creada para {form.invited}.</p>{/if}
        {#if form?.inviteError}<p class="error-note">{form.inviteError}</p>{/if}

        {#if pendingInvites.length > 0}
          <h2>Invitaciones pendientes</h2>
          <ul class="list">
            {#each pendingInvites as invite (invite.email)}
              <li>
                <span>{invite.email} — {roleLabels[invite.role_on_signup]}</span>
                <form method="POST" action="?/uninvite" use:enhance>
                  <input type="hidden" name="email" value={invite.email} />
                  <button type="submit" class="danger small">Retirar</button>
                </form>
              </li>
            {/each}
          </ul>
        {/if}

        <h2>Usuarios</h2>
        <ul class="list">
          {#each data.profiles as profile (profile.id)}
            <li>
              <span>{profile.display_name ?? profile.email}<small>{profile.email}</small></span>
              <form method="POST" action="?/setRole" use:enhance>
                <input type="hidden" name="profileId" value={profile.id} />
                <select name="role" value={profile.role}>
                  <option value="admin">Administrador</option>
                  <option value="editor">Editor</option>
                  <option value="viewer">Solo lectura</option>
                </select>
                <button type="submit" class="small">Guardar</button>
              </form>
            </li>
          {/each}
        </ul>
        {#if form?.roleError}<p class="error-note">{form.roleError}</p>{/if}

        <a class="back-link" href="/">← Volver al árbol</a>
      </div>
    </LiquidGlassWrapper>
  </div>
</main>

<style lang="scss">
  :global(body) {
    margin: 0;
    background: #e0e0e0;
  }

  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 2rem 0;
  }

  .admin-card {
    border-radius: 16px;
    background-color: rgba(255, 255, 255, 0.3);
  }

  .admin-content {
    display: flex;
    flex-direction: column;
    width: 420px;
    max-width: 85vw;

    h1 {
      margin: 0 0 1rem;
      font-size: 1.4rem;
    }

    h2 {
      margin: 1.25rem 0 0.5rem;
      font-size: 1.05rem;
    }

    .invite-row {
      display: flex;
      gap: 8px;

      .modern-input {
        flex: 1;
        padding: 0.5rem 0.75rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: #fafafa;
        font-size: 0.95rem;
        color: #444;

        &:focus {
          outline: none;
          border-color: #7c3aed;
        }
      }
    }

    select {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background: #fafafa;
      color: #444;
      padding: 0.4rem 0.5rem;
      font-size: 0.9rem;
    }

    button {
      padding: 8px 12px;
      border: none;
      border-radius: 9px;
      cursor: pointer;
      background-color: #16a31aa0;
      color: white;
      font-size: 0.9rem;
      transition: ease 0.3s;

      &:hover {
        background-color: #0bbe11b3;
      }

      &.small {
        padding: 5px 10px;
        font-size: 0.8rem;
      }

      &.danger {
        background-color: #dc2626aa;

        &:hover {
          background-color: #dc2626;
        }
      }
    }

    .list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;

      li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        background: #fafafa88;
        border-radius: 8px;
        padding: 8px 12px;

        span {
          display: flex;
          flex-direction: column;
          color: #444;
          font-size: 0.95rem;

          small {
            color: #8f8f8f;
            font-size: 0.75rem;
          }
        }

        form {
          display: flex;
          gap: 6px;
          align-items: center;
        }
      }
    }

    .ok-note {
      color: #16a31a;
      font-size: 0.85rem;
      margin: 0.5rem 0 0;
    }

    .error-note {
      color: #dc2626;
      font-size: 0.85rem;
      margin: 0.5rem 0 0;
    }

    .back-link {
      margin-top: 1.5rem;
      color: #096bc1;
      font-size: 0.9rem;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  :global(.admin-card .liquid-glass-text-container) {
    flex-direction: column;
    padding: 30px 24px 24px;
  }
</style>
