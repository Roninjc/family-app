<script lang="ts">
  import { enhance } from '$app/forms'
  import { page } from '$app/stores'
  import LiquidGlassWrapper from '../../components/liquidGlassWrapper.svelte'

  export let data
  export let form

  let generalRole = 'viewer'
  let generalExpiry = 'none'
  let generalMaxUses = ''

  let memberEmail = ''
  let memberId = ''
  let memberRole = 'viewer'
  let memberExpiry = 'none'

  const roleLabels: Record<string, string> = {
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Solo lectura'
  }

  const inviteTypeLabels: Record<string, string> = {
    general: 'General (enlace)',
    member_linked: 'Vinculada a miembro'
  }

  const formatDate = (value: string | null) => {
    if (!value) return 'Sin caducidad'

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return 'Fecha inválida'

    return date.toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short'
    })
  }

  $: memberNameById = new Map(
    data.members.map((member) => [member.id, `${member.name} ${member.family_name}`])
  )
  $: preselectedMemberId = $page.url.searchParams.get('memberId') ?? ''
  $: if (!memberId && preselectedMemberId && memberNameById.has(preselectedMemberId)) {
    memberId = preselectedMemberId
  }
</script>

<svelte:head>
  <title>Administración — Familia Castaño</title>
</svelte:head>

<main>
  <div class="admin-card">
    <LiquidGlassWrapper>
      <div class="admin-content">
        <h1>Administración</h1>

        <h2>Invitación general</h2>
        <form method="POST" action="?/inviteGeneral" use:enhance>
          <div class="invite-row">
            <select name="role" bind:value={generalRole}>
              <option value="viewer">Solo lectura</option>
              <option value="editor">Editor</option>
              {#if data.manager.role === 'admin'}<option value="admin">Administrador</option>{/if}
            </select>
            <select name="expiryPreset" bind:value={generalExpiry}>
              <option value="none">Sin caducidad</option>
              <option value="7d">Caduca en 7 días</option>
              <option value="30d">Caduca en 30 días</option>
            </select>
            <input
              class="modern-input"
              type="number"
              min="1"
              name="maxUses"
              placeholder="Usos (vacío = sin límite)"
              bind:value={generalMaxUses}
            />
            <button type="submit">Invitar</button>
          </div>
        </form>
        {#if form?.invitedGeneral}<p class="ok-note">Invitación general creada.</p>{/if}
        {#if form?.inviteLink}
          <p class="ok-note invite-link">
            Enlace: <a href={form.inviteLink}>{form.inviteLink}</a>
          </p>
        {/if}
        {#if form?.inviteError}<p class="error-note">{form.inviteError}</p>{/if}

        <h2>Invitación vinculada a miembro</h2>
        <form method="POST" action="?/inviteMember" use:enhance>
          <div class="invite-row member-row">
            <input
              class="modern-input"
              type="email"
              name="email"
              placeholder="email@ejemplo.com"
              bind:value={memberEmail}
              required
            />
            <select name="memberId" bind:value={memberId} required>
              <option value="" disabled selected>Selecciona miembro…</option>
              {#each data.members as member (member.id)}
                <option value={member.id}>{member.name} {member.family_name}</option>
              {/each}
            </select>
            <select name="role" bind:value={memberRole}>
              <option value="viewer">Solo lectura</option>
              <option value="editor">Editor</option>
              {#if data.manager.role === 'admin'}<option value="admin">Administrador</option>{/if}
            </select>
            <select name="expiryPreset" bind:value={memberExpiry}>
              <option value="none">Sin caducidad</option>
              <option value="7d">Caduca en 7 días</option>
              <option value="30d">Caduca en 30 días</option>
            </select>
            <button type="submit">Invitar</button>
          </div>
        </form>
        {#if form?.invitedMember}
          <p class="ok-note">Invitación vinculada creada para {form.invitedMember}.</p>
        {/if}

        {#if data.invites.length > 0}
          <h2>Invitaciones</h2>
          <ul class="list">
            {#each data.invites as invite (invite.id)}
              <li>
                <span>
                  {inviteTypeLabels[invite.type]}
                  <small>Rol: {roleLabels[invite.role_on_signup]}</small>
                  {#if invite.email}<small>Email: {invite.email}</small>{/if}
                  {#if invite.member_id}
                    <small>Miembro: {memberNameById.get(invite.member_id) ?? invite.member_id}</small>
                  {/if}
                  <small>Creada: {formatDate(invite.created_at)}</small>
                  <small>Caduca: {formatDate(invite.expires_at)}</small>
                  <small>
                    Usos: {invite.uses_count}
                    {#if invite.max_uses !== null}/ {invite.max_uses}{/if}
                  </small>
                  {#if invite.revoked_at}
                    <small>Estado: Revocada</small>
                  {:else}
                    <small>Estado: Activa</small>
                  {/if}
                </span>
                {#if !invite.revoked_at}
                  <form method="POST" action="?/revokeInvite" use:enhance>
                    <input type="hidden" name="inviteId" value={invite.id} />
                    <button type="submit" class="danger small">Revocar</button>
                  </form>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}

        {#if data.canManageRoles}
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
        {/if}

        <a class="back-link" href="/hub">← Volver al hub</a>
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
    padding: max(16px, env(safe-area-inset-top)) 14px max(20px, env(safe-area-inset-bottom));
  }

  .admin-card {
    width: min(980px, 100%);
    border-radius: 18px;
    background-color: var(--surface-soft);
  }

  .admin-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 2px;

    h1 {
      margin: 0 0 1rem;
      font-size: 1.4rem;
    }

    h2 {
      margin: 1.15rem 0 0.5rem;
      font-size: 1.04rem;
    }

    .invite-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;

      .modern-input {
        flex: 1 1 220px;
        min-height: 44px;
        padding: 0.52rem 0.76rem;
        border: 1px solid var(--field-border);
        border-radius: 10px;
        background: var(--field-bg);
        font-size: 0.95rem;
        color: var(--text-main);

        &:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(31, 79, 123, 0.16);
        }
      }

      &.member-row {
        .modern-input {
          min-width: 220px;
        }
      }
    }

    select {
      min-width: 170px;
      min-height: 44px;
      border: 1px solid var(--field-border);
      border-radius: 10px;
      background: var(--field-bg);
      color: var(--text-main);
      padding: 0.4rem 0.6rem;
      font-size: 0.9rem;
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

      &:hover {
        background-color: #24654f;
      }

      &.small {
        padding: 5px 10px;
        font-size: 0.8rem;
      }

      &.danger {
        background-color: #b63e3e;

        &:hover {
          background-color: #9d2f2f;
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
        flex-wrap: wrap;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        background: rgba(255, 255, 255, 0.44);
        border: 1px solid rgba(255, 255, 255, 0.5);
        border-radius: 10px;
        padding: 10px 12px;

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
          flex-wrap: wrap;
        }
      }
    }

    .ok-note {
      color: #16a31a;
      font-size: 0.85rem;
      margin: 0.5rem 0 0;

      &.invite-link {
        word-break: break-all;

        a {
          color: #096bc1;
        }
      }
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
    align-items: stretch;
    justify-content: flex-start;
    padding: 24px 18px 18px;
  }

  @media (max-width: 720px) {
    .admin-content {
      .invite-row {
        > * {
          width: 100%;
        }
      }

      .list li form {
        width: 100%;

        select,
        button {
          flex: 1 1 auto;
        }
      }
    }
  }
</style>
