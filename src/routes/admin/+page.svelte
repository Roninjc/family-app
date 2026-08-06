<script lang="ts">
  import { enhance } from '$app/forms'
  import { page } from '$app/stores'
  import { fade } from 'svelte/transition'
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

  let openSection: 'general' | 'member' | 'invites' | 'users' | null = 'general'

  const toggleSection = (section: 'general' | 'member' | 'invites' | 'users') => {
    openSection = openSection === section ? null : section
  }
</script>

<svelte:head>
  <title>Administración — Familia Castaño</title>
</svelte:head>

<main>
  <div class="admin-card reveal-fade-up">
    <LiquidGlassWrapper>
      <div class="admin-content">
        <h1>Administración</h1>

        <section class="admin-section reveal-fade-up reveal-delay-1" class:open={openSection === 'general'}>
          <button
            type="button"
            class="section-toggle"
            on:click={() => {
              toggleSection('general')
            }}
            aria-expanded={openSection === 'general'}
          >
            <span>Invitación general</span>
            <small>Enlace reusable</small>
          </button>
          {#if openSection === 'general'}
            <div class="section-body" transition:fade={{ duration: 140 }}>
              <form method="POST" action="?/inviteGeneral" use:enhance>
                <div class="invite-row">
                  <select name="role" bind:value={generalRole}>
                    <option value="viewer">Solo lectura</option>
                    <option value="editor">Editor</option>
                    {#if data.manager.role === 'admin'}
                      <option value="admin">Administrador</option>
                    {/if}
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
                  <button class="app-btn app-btn--primary" type="submit">Crear invitación</button>
                </div>
              </form>
              {#if form?.invitedGeneral}<p class="ok-note" role="status">Invitación general creada.</p>{/if}
              {#if form?.inviteLink}
                <p class="ok-note invite-link" role="status">
                  Enlace: <a href={form.inviteLink}>{form.inviteLink}</a>
                </p>
              {/if}
              {#if form?.inviteError}<p class="error-note" role="alert">{form.inviteError}</p>{/if}
            </div>
          {/if}
        </section>

        <section class="admin-section reveal-fade-up reveal-delay-1" class:open={openSection === 'member'}>
          <button
            type="button"
            class="section-toggle"
            on:click={() => {
              toggleSection('member')
            }}
            aria-expanded={openSection === 'member'}
          >
            <span>Invitación vinculada</span>
            <small>Asignada a persona</small>
          </button>
          {#if openSection === 'member'}
            <div class="section-body" transition:fade={{ duration: 140 }}>
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
                    {#if data.manager.role === 'admin'}
                      <option value="admin">Administrador</option>
                    {/if}
                  </select>
                  <select name="expiryPreset" bind:value={memberExpiry}>
                    <option value="none">Sin caducidad</option>
                    <option value="7d">Caduca en 7 días</option>
                    <option value="30d">Caduca en 30 días</option>
                  </select>
                  <button class="app-btn app-btn--primary" type="submit">Crear invitación</button>
                </div>
              </form>
              {#if form?.invitedMember}
                <p class="ok-note" role="status">
                  Invitación vinculada creada para {form.invitedMember}.
                </p>
              {/if}
            </div>
          {/if}
        </section>

        <section class="admin-section reveal-fade-up reveal-delay-2" class:open={openSection === 'invites'}>
          <button
            type="button"
            class="section-toggle"
            on:click={() => {
              toggleSection('invites')
            }}
            aria-expanded={openSection === 'invites'}
          >
            <span>Invitaciones emitidas</span>
            <small>{data.invites.length} registradas</small>
          </button>
          {#if openSection === 'invites'}
            <div class="section-body" transition:fade={{ duration: 140 }}>
              {#if data.invites.length > 0}
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
                          <button type="submit" class="app-btn app-btn--danger small">Revocar</button>
                        </form>
                      {/if}
                    </li>
                  {/each}
                </ul>
              {:else}
                <p class="empty-note">Aún no hay invitaciones registradas.</p>
              {/if}
            </div>
          {/if}
        </section>

        {#if data.canManageRoles}
          <section class="admin-section reveal-fade-up reveal-delay-2" class:open={openSection === 'users'}>
            <button
              type="button"
              class="section-toggle"
              on:click={() => {
                toggleSection('users')
              }}
              aria-expanded={openSection === 'users'}
            >
              <span>Usuarios y roles</span>
              <small>{data.profiles.length} usuarios</small>
            </button>
            {#if openSection === 'users'}
              <div class="section-body" transition:fade={{ duration: 140 }}>
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
                        <button type="submit" class="app-btn app-btn--secondary small">Guardar</button>
                      </form>
                    </li>
                  {/each}
                </ul>
                {#if form?.roleError}<p class="error-note" role="alert">{form.roleError}</p>{/if}
              </div>
            {/if}
          </section>
        {/if}

      </div>
    </LiquidGlassWrapper>
  </div>
</main>

<style lang="scss">
  main {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    min-height: calc(100vh - 14px);
    padding: max(16px, env(safe-area-inset-top)) 14px max(104px, env(safe-area-inset-bottom));
  }

  .admin-card {
    width: min(1020px, 100%);
    border-radius: var(--radius-lg);
    background-color: transparent;
  }

  .admin-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 2px;

    h1 {
      margin: 0 0 1rem;
      font-size: var(--fs-xl);
      line-height: var(--lh-tight);
    }

    .admin-section {
      margin-bottom: 0.6rem;
      background: rgba(255, 255, 255, 0.34);
      border: 1px solid rgba(255, 255, 255, 0.54);
      border-radius: 12px;

      &.open {
        background: rgba(255, 255, 255, 0.44);
      }

      .section-toggle {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 10px;
        border: none;
        background: transparent;
        color: var(--text-main);
        padding: 12px;
        text-align: left;
        cursor: pointer;
        border-radius: 12px;
        transition:
          background-color 0.22s var(--motion-standard),
          transform 0.22s var(--motion-standard);

        &:hover {
          background: rgba(255, 243, 230, 0.44);
          transform: translateX(2px);
        }

        span {
          font-size: var(--fs-md);
          font-weight: 700;
        }

        small {
          font-size: var(--fs-2xs);
          color: var(--text-muted);
          font-weight: 600;
        }
      }

      .section-body {
        padding: 0 12px 12px;
      }
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
          box-shadow: 0 0 0 3px rgba(156, 90, 45, 0.16);
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
      font-size: var(--fs-sm);
    }

    .app-btn.small {
      min-height: 34px;
      padding: 0.44rem 0.72rem;
      font-size: var(--fs-xs);
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
        border: 1px solid rgba(255, 238, 218, 0.6);
        border-radius: 10px;
        padding: 10px 12px;
        transition:
          transform 0.22s var(--motion-standard),
          box-shadow 0.22s var(--motion-standard);

        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 18px rgba(106, 61, 28, 0.14);
        }

        span {
          display: flex;
          flex-direction: column;
          color: #4a3426;
          font-size: var(--fs-sm);

          small {
            color: var(--text-muted);
            font-size: var(--fs-2xs);
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
      font-size: var(--fs-xs);
      margin: 0.5rem 0 0;

      &.invite-link {
        word-break: break-all;

        a {
          color: #8a4a22;
        }
      }
    }

    .error-note {
      color: #dc2626;
      font-size: var(--fs-xs);
      margin: 0.5rem 0 0;
    }

    .empty-note {
      margin: 0;
      font-size: var(--fs-sm);
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.55);
      border-radius: 10px;
      padding: 10px 12px;
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
