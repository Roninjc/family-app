<script lang="ts">
  import { enhance } from '$app/forms'
  import { page } from '$app/stores'
  import { onDestroy } from 'svelte'
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

  const roleLabelsByGender: Record<string, string> = {
    admin: 'administrador',
    editor: 'editor',
    viewer: 'visualizador'
  }

  const inviteStatusLabel = (invite: {
    revoked_at: string | null
    expires_at: string | null
    uses_count: number
    max_uses: number | null
  }) => {
    if (invite.revoked_at) return 'Revocada'
    if (invite.expires_at && Date.parse(invite.expires_at) <= Date.now()) return 'Caducada'
    if (invite.max_uses !== null && invite.uses_count >= invite.max_uses) return 'Límite alcanzado'
    return 'Activa'
  }

  const inviteStatusTone = (status: string) => {
    if (status === 'Activa') return 'ok'
    if (status === 'Límite alcanzado') return 'warn'
    return 'muted'
  }

  let inviteFilter: 'all' | 'active' | 'expired' | 'revoked' | 'limit' = 'all'

  const inviteMatchesFilter = (
    invite: {
      revoked_at: string | null
      expires_at: string | null
      uses_count: number
      max_uses: number | null
    },
    filter: 'all' | 'active' | 'expired' | 'revoked' | 'limit'
  ) => {
    const status = inviteStatusLabel(invite)

    if (filter === 'all') return true
    if (filter === 'active') return status === 'Activa'
    if (filter === 'expired') return status === 'Caducada'
    if (filter === 'revoked') return status === 'Revocada'
    if (filter === 'limit') return status === 'Límite alcanzado'

    return true
  }

  let copyStatus = ''
  let copyStatusTone: 'ok' | 'error' = 'ok'
  let clearCopyStatusTimer: ReturnType<typeof setTimeout> | null = null

  const clearCopyStatusLater = () => {
    if (clearCopyStatusTimer) clearTimeout(clearCopyStatusTimer)
    clearCopyStatusTimer = setTimeout(() => {
      copyStatus = ''
    }, 2200)
  }

  const copyInviteLink = async (link: string) => {
    if (!link) return

    try {
      if (!navigator?.clipboard?.writeText) {
        throw new Error('Clipboard API not available')
      }

      await navigator.clipboard.writeText(link)
      copyStatusTone = 'ok'
      copyStatus = 'Enlace copiado al portapapeles.'
      clearCopyStatusLater()
    } catch {
      copyStatusTone = 'error'
      copyStatus = 'No se pudo copiar automáticamente. Copia el enlace manualmente.'
      clearCopyStatusLater()
    }
  }

  onDestroy(() => {
    if (clearCopyStatusTimer) clearTimeout(clearCopyStatusTimer)
  })

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
  $: activeFamilyId = data.activeFamily?.id ?? ''
  $: filteredInvites = data.invites.filter((invite) => inviteMatchesFilter(invite, inviteFilter))

  let openSection: 'general' | 'member' | 'invites' | 'users' | null = 'general'

  const toggleSection = (section: 'general' | 'member' | 'invites' | 'users') => {
    openSection = openSection === section ? null : section
  }

  const handleFamilySelectChange = (event: Event) => {
    const target = event.currentTarget
    if (!(target instanceof HTMLSelectElement)) return
    if (target.value) target.form?.requestSubmit()
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

        <section class="admin-section open reveal-fade-up reveal-delay-1">
          <div class="section-body family-scope-row">
            <div class="scope-copy">
              <strong>Familia activa:</strong> {data.activeFamily?.name}
              <small>Tu rol aquí: {roleLabels[data.activeFamily?.role ?? 'viewer']}</small>
            </div>
            {#if data.families.length > 1}
              <form method="GET" class="family-picker-form">
                <label for="family-select">Cambiar familia</label>
                <select
                  id="family-select"
                  name="family"
                  value={activeFamilyId}
                  on:change={handleFamilySelectChange}
                >
                  {#each data.families as family}
                    <option value={family.id}>{family.name}</option>
                  {/each}
                </select>
              </form>
            {/if}
          </div>
        </section>

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
                  <input type="hidden" name="familyId" value={activeFamilyId} />
                  <select name="role" bind:value={generalRole}>
                    <option value="viewer">Solo lectura</option>
                    <option value="editor">Editor</option>
                    {#if data.activeFamily.role === 'admin'}
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
              {#if form?.inviteSuccess}<p class="ok-note" role="status">{form.inviteSuccess}</p>{/if}
              {#if form?.inviteLink}
                <div class="invite-link-card" role="status" aria-live="polite">
                  <p class="ok-note invite-link">
                    Enlace: <a href={form.inviteLink}>{form.inviteLink}</a>
                  </p>
                  <div class="invite-link-actions">
                    <button
                      type="button"
                      class="app-btn app-btn--secondary small"
                      on:click={() => {
                        copyInviteLink(form?.inviteLink ?? '')
                      }}
                    >
                      Copiar enlace
                    </button>
                    <span class="inline-help">Compártelo con quien quieras invitar</span>
                  </div>
                  {#if copyStatus}
                    <p class="copy-status" class:error={copyStatusTone === 'error'} role="status" aria-live="polite">
                      {copyStatus}
                    </p>
                  {/if}
                </div>
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
                  <input type="hidden" name="familyId" value={activeFamilyId} />
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
                    {#if data.activeFamily.role === 'admin'}
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
              {#if form?.inviteError}<p class="error-note" role="alert">{form.inviteError}</p>{/if}
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
                  <div class="invite-filters" role="toolbar" aria-label="Filtrar invitaciones">
                    <button
                      type="button"
                      class="filter-chip"
                      class:active={inviteFilter === 'all'}
                      aria-pressed={inviteFilter === 'all'}
                      on:click={() => {
                        inviteFilter = 'all'
                      }}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      class="filter-chip"
                      class:active={inviteFilter === 'active'}
                      aria-pressed={inviteFilter === 'active'}
                      on:click={() => {
                        inviteFilter = 'active'
                      }}
                    >
                      Activas
                    </button>
                    <button
                      type="button"
                      class="filter-chip"
                      class:active={inviteFilter === 'expired'}
                      aria-pressed={inviteFilter === 'expired'}
                      on:click={() => {
                        inviteFilter = 'expired'
                      }}
                    >
                      Caducadas
                    </button>
                    <button
                      type="button"
                      class="filter-chip"
                      class:active={inviteFilter === 'limit'}
                      aria-pressed={inviteFilter === 'limit'}
                      on:click={() => {
                        inviteFilter = 'limit'
                      }}
                    >
                      Límite
                    </button>
                    <button
                      type="button"
                      class="filter-chip"
                      class:active={inviteFilter === 'revoked'}
                      aria-pressed={inviteFilter === 'revoked'}
                      on:click={() => {
                        inviteFilter = 'revoked'
                      }}
                    >
                      Revocadas
                    </button>
                  </div>

                  <p class="filter-summary" aria-live="polite">
                    Mostrando {filteredInvites.length} de {data.invites.length} invitaciones.
                  </p>

                  {#if filteredInvites.length === 0}
                    <p class="empty-note">No hay invitaciones para este filtro.</p>
                  {/if}

                <ul class="list">
                    {#each filteredInvites as invite (invite.id)}
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
                        <small
                          class:status-ok={inviteStatusTone(inviteStatusLabel(invite)) === 'ok'}
                          class:status-warn={inviteStatusTone(inviteStatusLabel(invite)) === 'warn'}
                          >Estado: {inviteStatusLabel(invite)}</small
                        >
                      </span>
                      {#if !invite.revoked_at}
                        <form method="POST" action="?/revokeInvite" use:enhance>
                          <input type="hidden" name="familyId" value={activeFamilyId} />
                          <input type="hidden" name="inviteId" value={invite.id} />
                          <button type="submit" class="app-btn app-btn--danger small">Revocar</button>
                        </form>
                          {#if invite.type === 'general'}
                            <form method="POST" action="?/regenerateInviteLink" use:enhance>
                              <input type="hidden" name="familyId" value={activeFamilyId} />
                              <input type="hidden" name="inviteId" value={invite.id} />
                              <button type="submit" class="app-btn app-btn--secondary small">
                                Regenerar enlace
                              </button>
                            </form>
                          {/if}
                      {/if}
                    </li>
                  {/each}
                </ul>
                {#if form?.revokeSuccess}
                  <p class="ok-note" role="status">{form.revokeSuccess}</p>
                {/if}
                {#if form?.inviteError}
                  <p class="error-note" role="alert">{form.inviteError}</p>
                {/if}
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
                        <input type="hidden" name="familyId" value={activeFamilyId} />
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
      border: none;
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
        border: none;
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

    .family-scope-row {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 12px;
      flex-wrap: wrap;

      .scope-copy {
        display: flex;
        flex-direction: column;
        gap: 3px;

        small {
          color: var(--text-muted);
          font-size: var(--fs-xs);
        }
      }

      .family-picker-form {
        display: flex;
        flex-direction: column;
        gap: 4px;

        label {
          font-size: var(--fs-2xs);
          color: var(--text-muted);
          font-weight: 600;
        }
      }
    }

    select {
      min-width: 170px;
      min-height: 44px;
      border: none;
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
        border: none;
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

    .invite-link-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-top: 8px;

      .inline-help {
        color: var(--text-muted);
        font-size: var(--fs-2xs);
      }
    }

    .invite-link-card {
      margin-top: 0.5rem;
      background: rgba(255, 255, 255, 0.5);
      border-radius: 10px;
      padding: 8px 10px;
    }

    .invite-filters {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-bottom: 8px;
    }

    .filter-chip {
      border: 1px solid rgba(156, 90, 45, 0.24);
      background: rgba(255, 255, 255, 0.56);
      color: var(--text-main);
      border-radius: var(--radius-pill);
      font-size: var(--fs-2xs);
      font-weight: 600;
      min-height: 30px;
      padding: 0.28rem 0.62rem;
      cursor: pointer;

      &.active {
        background: rgba(156, 90, 45, 0.18);
        border-color: rgba(156, 90, 45, 0.45);
      }
    }

    .filter-summary {
      margin: 0 0 10px;
      color: var(--text-muted);
      font-size: var(--fs-2xs);
    }

    .copy-status {
      margin: 0.4rem 0 0;
      font-size: var(--fs-2xs);
      color: #166534;

      &.error {
        color: #b91c1c;
      }
    }

    .error-note {
      color: #dc2626;
      font-size: var(--fs-xs);
      margin: 0.5rem 0 0;
    }

    .status-ok {
      color: #166534;
      font-weight: 600;
    }

    .status-warn {
      color: #9a3412;
      font-weight: 600;
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
