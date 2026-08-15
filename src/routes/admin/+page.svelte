<script lang="ts">
  import { goto } from '$app/navigation'
  import { enhance } from '$app/forms'
  import { page } from '$app/stores'
  import type { SubmitFunction } from '@sveltejs/kit'
  import { onDestroy, onMount } from 'svelte'
  import { fade, slide } from 'svelte/transition'
  import SurfaceWrapper from '../../components/surfaceWrapper.svelte'

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
  let familyCarousel: HTMLDivElement | null = null
  const familyCards = new Map<string, HTMLElement>()
  let focusedFamilyId = ''
  let pendingFamilyId: string | null = null
  let switchFamilyTimer: ReturnType<typeof setTimeout> | null = null
  const FAMILY_NAME_FADE_MS = 220
  let displayedFamilyName = ''
  let displayedFamilyRoleLabel = ''
  let pendingFamilyName: string | null = null
  let pendingFamilyRoleLabel: string | null = null
  let previousActiveFamilyName = ''
  let previousActiveFamilyRole = ''
  let familyNameSwitchTimer: ReturnType<typeof setTimeout> | null = null
  let isFamilyNameVisible = true
  let familyNameReady = false
  let showFamilySettingsModal = false
  let familySettingsFamilyId = ''
  let familyNameDraft = ''

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
    if (switchFamilyTimer) clearTimeout(switchFamilyTimer)
    if (familyNameSwitchTimer) clearTimeout(familyNameSwitchTimer)
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
  $: activeFamily = data.families.find((family) => family.id === activeFamilyId) ?? null
  $: activeFamilyName = activeFamily?.name ?? ''
  $: activeFamilyRole = activeFamily?.role ?? 'viewer'
  $: activeFamilyRoleLabel = roleLabels[activeFamilyRole] ?? roleLabels.viewer
  $: if (activeFamilyName !== previousActiveFamilyName || activeFamilyRole !== previousActiveFamilyRole) {
    previousActiveFamilyName = activeFamilyName
    previousActiveFamilyRole = activeFamilyRole

    if (!familyNameReady) {
      displayedFamilyName = activeFamilyName
      displayedFamilyRoleLabel = activeFamilyRoleLabel
      isFamilyNameVisible = true
      familyNameReady = true
    } else {
      pendingFamilyName = activeFamilyName
      pendingFamilyRoleLabel = activeFamilyRoleLabel
      isFamilyNameVisible = false

      if (familyNameSwitchTimer) clearTimeout(familyNameSwitchTimer)
      familyNameSwitchTimer = setTimeout(() => {
        displayedFamilyName = pendingFamilyName ?? ''
        displayedFamilyRoleLabel = pendingFamilyRoleLabel ?? roleLabels.viewer
        pendingFamilyName = null
        pendingFamilyRoleLabel = null
        isFamilyNameVisible = true
      }, FAMILY_NAME_FADE_MS)
    }
  }
  $: focusedFamilyId = activeFamilyId
  $: if (pendingFamilyId && pendingFamilyId === activeFamilyId) {
    pendingFamilyId = null
  }
  $: filteredInvites = data.invites.filter((invite) => inviteMatchesFilter(invite, inviteFilter))
  $: currentUserId = data.currentUserId ?? data.manager?.id ?? ''

  type UserDraft = {
    role: string
    memberId: string
  }

  type UserDraftChange = {
    profileId: string
    displayName: string
    previousRole: string
    nextRole: string
    previousMemberId: string
    nextMemberId: string
    roleChanged: boolean
    linkChanged: boolean
  }

  let userDraftsById: Record<string, UserDraft> = {}
  let userDraftsSeed = ''
  let usersChanges: UserDraftChange[] = []
  let usersChangesJson = '[]'
  let showUsersConfirmModal = false
  let roleChanges: UserDraftChange[] = []
  let linkChanges: UserDraftChange[] = []
  let availableMembersByProfileId: Record<
    string,
    Array<{ id: string; name: string; family_name: string }>
  > = {}

  const normalizeMemberId = (value: string | null | undefined) => value?.trim() ?? ''

  const memberDisplayName = (memberId: string) => {
    if (!memberId) return 'Sin vínculo'
    return memberNameById.get(memberId) ?? memberId
  }

  const initializeUserDrafts = () => {
    userDraftsById = Object.fromEntries(
      data.profiles.map((profile) => [
        profile.id,
        {
          role: profile.role,
          memberId: normalizeMemberId(profile.member_id)
        }
      ])
    )
  }

  const profileDisplayName = (profile: { display_name: string | null; email: string }) =>
    profile.display_name?.trim() || profile.email

  const updateUserDraftRole = (profileId: string, value: string) => {
    const current = userDraftsById[profileId]
    if (!current) return
    userDraftsById = {
      ...userDraftsById,
      [profileId]: {
        ...current,
        role: value
      }
    }
  }

  const updateUserDraftMember = (profileId: string, value: string) => {
    const current = userDraftsById[profileId]
    if (!current) return
    userDraftsById = {
      ...userDraftsById,
      [profileId]: {
        ...current,
        memberId: value
      }
    }
  }

  const onRoleDraftChange = (profileId: string, event: Event) => {
    const select = event.currentTarget as HTMLSelectElement | null
    if (!select) return
    updateUserDraftRole(profileId, select.value)
  }

  const onMemberDraftChange = (profileId: string, event: Event) => {
    const select = event.currentTarget as HTMLSelectElement | null
    if (!select) return
    updateUserDraftMember(profileId, select.value)
  }

  const linkedMemberByProfileId = (profileId: string) => normalizeMemberId(userDraftsById[profileId]?.memberId)

  const buildAvailableMembersForProfile = (profileId: string) => {
    const selectedMemberId = linkedMemberByProfileId(profileId)
    const linkedByOthers = new Set(
      Object.entries(userDraftsById)
        .filter(([otherProfileId]) => otherProfileId !== profileId)
        .map(([, draft]) => normalizeMemberId(draft.memberId))
        .filter((memberId) => memberId.length > 0)
    )

    return data.members.filter((member) => {
      if (member.id === selectedMemberId) return true
      return !linkedByOthers.has(member.id)
    })
  }

  const openUsersConfirmDialog = () => {
    if (usersChanges.length === 0) return
    showUsersConfirmModal = true
  }

  const closeUsersConfirmDialog = () => {
    showUsersConfirmModal = false
  }

  const usersSaveEnhance: SubmitFunction = () => {
    return async ({ update }) => {
      await update()
      showUsersConfirmModal = false
    }
  }

  let openSection: 'general' | 'member' | 'invites' | 'users' | null = data.canManageInvites
    ? 'general'
    : 'users'

  const toggleSection = (section: 'general' | 'member' | 'invites' | 'users') => {
    openSection = openSection === section ? null : section
  }

  const canEditLink = (profileId: string) =>
    activeFamilyRole === 'admin' || activeFamilyRole === 'editor' || profileId === currentUserId

  const canEditRole = (profileRole: string) => {
    if (activeFamilyRole === 'admin') return true
    if (activeFamilyRole === 'editor') return profileRole !== 'admin'
    return false
  }

  const canShowAdminRole = (profileRole: string, draftRole: string) =>
    activeFamilyRole === 'admin' || profileRole === 'admin' || draftRole === 'admin'

  $: if (!data.canManageInvites && openSection === 'general') {
    openSection = 'users'
  }

  $: {
    const nextSeed = `${activeFamilyId}|${data.profiles
      .map((profile) => `${profile.id}:${profile.role}:${normalizeMemberId(profile.member_id)}`)
      .join('|')}`
    if (nextSeed !== userDraftsSeed) {
      initializeUserDrafts()
      userDraftsSeed = nextSeed
    }
  }

  $: {
    usersChanges = data.profiles
      .map((profile) => {
        const draft = userDraftsById[profile.id]
        if (!draft) return null

        const previousMemberId = normalizeMemberId(profile.member_id)
        const nextMemberId = normalizeMemberId(draft.memberId)
        const roleChanged = profile.role !== draft.role
        const linkChanged = previousMemberId !== nextMemberId

        if (!roleChanged && !linkChanged) return null

        return {
          profileId: profile.id,
          displayName: profileDisplayName(profile),
          previousRole: profile.role,
          nextRole: draft.role,
          previousMemberId,
          nextMemberId,
          roleChanged,
          linkChanged
        } as UserDraftChange
      })
      .filter((entry): entry is UserDraftChange => Boolean(entry))

    usersChangesJson = JSON.stringify(
      usersChanges.map((change) => ({
        profileId: change.profileId,
        role: change.nextRole,
        memberId: change.nextMemberId
      }))
    )

    roleChanges = usersChanges.filter((change) => change.roleChanged)
    linkChanges = usersChanges.filter((change) => change.linkChanged)
  }

  $: {
    // TODO: Revisar actualización en vivo de opciones de vínculo entre filas.
    // En ciertos flujos el borrador no refleja inmediatamente la disponibilidad
    // al cambiar de usuario; retomar este ajuste en una iteración posterior.
    const nextByProfileId: Record<string, Array<{ id: string; name: string; family_name: string }>> = {}
    for (const profile of data.profiles) {
      nextByProfileId[profile.id] = buildAvailableMembersForProfile(profile.id)
    }
    availableMembersByProfileId = nextByProfileId
  }

  const switchFamily = async (familyId: string) => {
    if (!familyId || familyId === activeFamilyId) return

    pendingFamilyId = familyId

    try {
      await goto(`?family=${encodeURIComponent(familyId)}`, {
        keepFocus: true,
        noScroll: true
      })
    } catch {
      pendingFamilyId = null
    }
  }

  const openFamilySettingsModal = (family: { id: string; name: string; role: string }) => {
    if (family.role === 'viewer') return
    familySettingsFamilyId = family.id
    familyNameDraft = family.name
    showFamilySettingsModal = true
  }

  const closeFamilySettingsModal = () => {
    showFamilySettingsModal = false
  }

  const goToFamilyAt = (index: number) => {
    const family = data.families[index]
    if (!family) return

    const card = familyCards.get(family.id)
    if (card && typeof card.scrollIntoView === 'function') {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }

    focusedFamilyId = family.id
    switchFamily(family.id)
  }

  const setFamilyCardRef = (familyId: string, element: HTMLElement | null) => {
    if (!element) {
      familyCards.delete(familyId)
      return
    }
    familyCards.set(familyId, element)
  }

  const trackFamilyCard = (node: HTMLElement, familyId: string) => {
    setFamilyCardRef(familyId, node)
    return {
      destroy() {
        setFamilyCardRef(familyId, null)
      }
    }
  }

  const scheduleFamilySwitch = (familyId: string) => {
    if (!familyId || familyId === activeFamilyId) return
    if (switchFamilyTimer) clearTimeout(switchFamilyTimer)
    switchFamilyTimer = setTimeout(() => {
      switchFamily(familyId)
    }, 220)
  }

  const detectCenteredFamily = () => {
    if (!familyCarousel) return

    const trackRect = familyCarousel.getBoundingClientRect()
    const trackCenter = trackRect.left + trackRect.width / 2
    let closestId = ''
    let minDistance = Number.POSITIVE_INFINITY

    for (const family of data.families) {
      const card = familyCards.get(family.id)
      if (!card) continue
      const rect = card.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      const distance = Math.abs(center - trackCenter)

      if (distance < minDistance) {
        minDistance = distance
        closestId = family.id
      }
    }

    if (!closestId) return
    focusedFamilyId = closestId
    scheduleFamilySwitch(closestId)
  }

  onMount(() => {
    if (!activeFamilyId) return
    const activeCard = familyCards.get(activeFamilyId)
    if (activeCard && typeof activeCard.scrollIntoView === 'function') {
      activeCard.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' })
    }
  })
</script>

<svelte:head>
  <title>Administración — Familia Castaño</title>
</svelte:head>

<header class="admin-header reveal-fade-up" aria-label="Cabecera de administración">
  <SurfaceWrapper>
    <div class="admin-header-content">
      <div class="page-heading">
        <h1>Administración</h1>
        <div class="heading-family-context">
          <p
            class="heading-family-name"
            class:is-hidden={!isFamilyNameVisible}
          >
            {displayedFamilyName}
          </p>
          <p
            class="heading-family-role"
            class:is-hidden={!isFamilyNameVisible}
          >
            {displayedFamilyRoleLabel}
          </p>
        </div>
      </div>
    </div>
  </SurfaceWrapper>
</header>

<main class="admin-page page-shell">

  <section class="family-scope-section reveal-fade-up reveal-delay-1">
    <div class="section-body family-scope-row">
      <div class="family-carousel-shell" class:multi={data.families.length > 1}>
        <div
          class="family-carousel"
          bind:this={familyCarousel}
          on:scroll={detectCenteredFamily}
          role="tablist"
          aria-label="Cambiar familia administrada"
        >
          {#each data.families as family (family.id)}
            <div
              class="family-card"
              class:active={family.id === focusedFamilyId}
              role="tab"
              tabindex={family.id === focusedFamilyId ? 0 : -1}
              aria-selected={family.id === activeFamilyId}
              use:trackFamilyCard={family.id}
              on:click={() => {
                focusedFamilyId = family.id
                switchFamily(family.id)
              }}
              on:keydown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  focusedFamilyId = family.id
                  switchFamily(family.id)
                }
              }}
            >
              <div class="family-card-header">
                <span>{family.name}</span>
                {#if family.role !== 'viewer'}
                  <button
                    type="button"
                    class="app-settings-trigger"
                    aria-label={`Abrir ajustes de ${family.name}`}
                    title="Ajustes de familia"
                    on:click|stopPropagation={() => {
                      openFamilySettingsModal(family)
                    }}
                    on:keydown|stopPropagation={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openFamilySettingsModal(family)
                      }
                    }}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d="M19.14 12.94a7.9 7.9 0 0 0 .05-.94 7.9 7.9 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.27 7.27 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54a7.27 7.27 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58a7.9 7.9 0 0 0-.05.94 7.9 7.9 0 0 0 .05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.05.71 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.8a.5.5 0 0 0 .49-.42l.36-2.54c.58-.23 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.4A3.4 3.4 0 1 1 12 8.6a3.4 3.4 0 0 1 0 6.8Z"
                      />
                    </svg>
                  </button>
                {/if}
              </div>
              <div class="family-metrics-grid">
                <p>
                  <strong>{family.metrics.membersCount}</strong>
                  <span>Miembros</span>
                </p>
                <p>
                  <strong>{family.metrics.usersCount}</strong>
                  <span>Usuarios</span>
                </p>
                <p>
                  <strong>{family.metrics.unlinkedMembersCount}</strong>
                  <span>Sin vincular</span>
                </p>
                <p>
                  <strong>{family.metrics.activeInvitesCount}</strong>
                  <span>Invitaciones activas</span>
                </p>
                <p>
                  <strong>{family.metrics.managersCount}</strong>
                  <span>Gestores (admin/editor)</span>
                </p>
              </div>
            </div>
          {/each}
        </div>
      </div>

      {#if data.families.length > 1}
        <div class="carousel-dots" role="tablist" aria-label="Paginación de familias">
          {#each data.families as family, index (family.id)}
            <button
              type="button"
              class="dot"
              class:active={family.id === focusedFamilyId}
              role="tab"
              aria-selected={family.id === focusedFamilyId}
              aria-label={`Ir a ${family.name}`}
              on:click={() => {
                goToFamilyAt(index)
              }}
            ></button>
          {/each}
        </div>
      {/if}
    </div>
  </section>

  {#if data.canManageInvites}
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
            <small>
              Enlace reutilizable
              <b class="toggle-state" aria-hidden="true">{openSection === 'general' ? '−' : '+'}</b>
            </small>
          </button>
          {#if openSection === 'general'}
            <div class="section-body" transition:slide={{ duration: 220 }}>
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
              {#if form?.invitedGeneral}<p class="ok-note" role="status">Invitación general lista.</p>{/if}
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
                    <span class="inline-help">Compártelo por WhatsApp o email</span>
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
            <small>
              Asignada a persona
              <b class="toggle-state" aria-hidden="true">{openSection === 'member' ? '−' : '+'}</b>
            </small>
          </button>
          {#if openSection === 'member'}
            <div class="section-body" transition:slide={{ duration: 220 }}>
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
                    Invitación vinculada lista para {form.invitedMember}.
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
            <small>
              {data.invites.length} registradas
              <b class="toggle-state" aria-hidden="true">{openSection === 'invites' ? '−' : '+'}</b>
            </small>
          </button>
          {#if openSection === 'invites'}
            <div class="section-body" transition:slide={{ duration: 220 }}>
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
                    <p class="empty-note">No hay resultados para este filtro.</p>
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
                  <p class="empty-note">Todavía no has creado invitaciones en esta familia.</p>
              {/if}
            </div>
          {/if}
    </section>
  {/if}

    <section class="admin-section reveal-fade-up reveal-delay-2" class:open={openSection === 'users'}>
      <button
        type="button"
        class="section-toggle"
        on:click={() => {
          toggleSection('users')
        }}
        aria-expanded={openSection === 'users'}
      >
        <span>Usuarios</span>
        <small>
          {data.profiles.length} usuarios
          <b class="toggle-state" aria-hidden="true">{openSection === 'users' ? '−' : '+'}</b>
        </small>
      </button>
      {#if openSection === 'users'}
        <div class="section-body" transition:slide={{ duration: 220 }}>
          <div class="bulk-save-row">
            <button
              type="button"
              class="app-btn app-btn--primary"
              on:click={openUsersConfirmDialog}
              disabled={usersChanges.length === 0}
            >
              Guardar cambios ({usersChanges.length})
            </button>
          </div>

          <ul class="list">
            {#each data.profiles as profile (profile.id)}
              <li>
                <span class="user-name">{profile.display_name ?? profile.email}</span>
                <div class="user-edit-controls">
                  <label>
                    <span>Rol</span>
                    <select
                      value={userDraftsById[profile.id]?.role ?? profile.role}
                      disabled={!canEditRole(profile.role)}
                      on:change={(event) => onRoleDraftChange(profile.id, event)}
                    >
                      {#if canShowAdminRole(profile.role, userDraftsById[profile.id]?.role ?? profile.role)}
                        <option value="admin">Administrador</option>
                      {/if}
                      <option value="editor">Editor</option>
                      <option value="viewer">Solo lectura</option>
                    </select>
                  </label>

                  <label>
                    <span>Vinculación</span>
                    <select
                      value={userDraftsById[profile.id]?.memberId ?? ''}
                      disabled={!canEditLink(profile.id)}
                      on:input={(event) => onMemberDraftChange(profile.id, event)}
                      on:change={(event) => onMemberDraftChange(profile.id, event)}
                    >
                      <option value="">Sin vínculo</option>
                      {#each availableMembersByProfileId[profile.id] ?? [] as member (member.id)}
                        <option value={member.id}>
                          {member.name} {member.family_name}
                        </option>
                      {/each}
                    </select>
                  </label>
                </div>
              </li>
            {/each}
          </ul>

          <div class="bulk-save-row bottom">
            <button
              type="button"
              class="app-btn app-btn--primary"
              on:click={openUsersConfirmDialog}
              disabled={usersChanges.length === 0}
            >
              Guardar cambios ({usersChanges.length})
            </button>
          </div>

          {#if form?.usersSaved !== undefined}
            <p class="ok-note" role="status">
              Cambios guardados: {form.usersSaved}
            </p>
          {/if}
          {#if form?.usersError}<p class="error-note" role="alert">{form.usersError}</p>{/if}
        </div>
      {/if}
    </section>

    {#if showUsersConfirmModal}
      <div
        class="users-modal-backdrop"
        role="button"
        tabindex="0"
        aria-label="Cerrar confirmación"
        on:click|stopPropagation={closeUsersConfirmDialog}
        on:keydown={(event) => {
          if (event.key === 'Escape') closeUsersConfirmDialog()
        }}
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <div
          class="users-confirm-modal modal-shell modal-shell--wide"
          role="dialog"
          aria-modal="true"
          aria-labelledby="users-save-title"
          on:click|stopPropagation
        >
          <SurfaceWrapper>
            <div class="users-confirm-card" in:fade={{ duration: 140 }}>
              <h2 id="users-save-title">Confirmar cambios</h2>

              {#if usersChanges.length > 0}
                <div class="users-summary-grid" role="status" aria-live="polite">
                  <p>
                    <strong>{usersChanges.length}</strong>
                    <span>Total</span>
                  </p>
                  <p>
                    <strong>{roleChanges.length}</strong>
                    <span>Roles</span>
                  </p>
                  <p>
                    <strong>{linkChanges.length}</strong>
                    <span>Vínculos</span>
                  </p>
                </div>

                <ul class="users-changes-list">
                  {#each usersChanges as change (change.profileId)}
                    <li>
                      <strong>{change.displayName}</strong>
                      {#if change.roleChanged}
                        <small>Rol: {roleLabels[change.previousRole]} → {roleLabels[change.nextRole]}</small>
                      {/if}
                      {#if change.linkChanged}
                        <small>
                          Vínculo: {memberDisplayName(change.previousMemberId)} →
                          {memberDisplayName(change.nextMemberId)}
                        </small>
                      {/if}
                    </li>
                  {/each}
                </ul>

                <form method="POST" action="?/saveUsers" use:enhance={usersSaveEnhance}>
                  <input type="hidden" name="familyId" value={activeFamilyId} />
                  <input type="hidden" name="changesJson" value={usersChangesJson} />
                  <div class="users-confirm-actions">
                    <button
                      type="button"
                      class="app-btn app-btn--secondary"
                      on:click={closeUsersConfirmDialog}
                    >
                      Cancelar
                    </button>
                    <button type="submit" class="app-btn app-btn--primary">Confirmar y guardar</button>
                  </div>
                </form>
              {:else}
                <p class="users-confirm-summary">No hay cambios para guardar.</p>
                <div class="users-confirm-actions">
                  <button
                    type="button"
                    class="app-btn app-btn--secondary"
                    on:click={closeUsersConfirmDialog}
                  >
                    Cerrar
                  </button>
                </div>
              {/if}
            </div>
          </SurfaceWrapper>
        </div>
      </div>
    {/if}

    {#if showFamilySettingsModal}
      <div
        class="users-modal-backdrop"
        role="button"
        tabindex="0"
        aria-label="Cerrar ajustes de familia"
        on:click|stopPropagation={closeFamilySettingsModal}
        on:keydown={(event) => {
          if (event.key === 'Escape') closeFamilySettingsModal()
        }}
      >
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
        <div
          class="users-confirm-modal family-settings-modal modal-shell modal-shell--compact"
          role="dialog"
          aria-modal="true"
          aria-labelledby="family-settings-title"
          on:click|stopPropagation
        >
          <SurfaceWrapper>
            <div class="users-confirm-card family-settings-card" in:fade={{ duration: 140 }}>
              <h2 id="family-settings-title">Ajustes de familia</h2>

              <form method="POST" action="?/updateFamilySettings" use:enhance>
                <input type="hidden" name="familyId" value={familySettingsFamilyId} />
                <div class="input-wrapper floating-input-wrapper family-settings-field">
                  <input
                    id="familySettingsName"
                    class="modern-input"
                    type="text"
                    name="familyName"
                    maxlength="80"
                    bind:value={familyNameDraft}
                    required
                    autocomplete="off"
                  />
                  <label
                    for="familySettingsName"
                    class:label-active={familyNameDraft.length > 0}
                  >
                    Nombre de la familia
                  </label>
                </div>

                {#if form?.familySettingsSuccess && form?.familySettingsFamilyId === familySettingsFamilyId}
                  <p class="ok-note" role="status">{form.familySettingsSuccess}</p>
                {/if}
                {#if form?.familySettingsError}
                  <p class="error-note" role="alert">{form.familySettingsError}</p>
                {/if}

                <div class="users-confirm-actions">
                  <button
                    type="button"
                    class="app-btn app-btn--secondary"
                    on:click={closeFamilySettingsModal}
                  >
                    Cancelar
                  </button>
                  <button type="submit" class="app-btn app-btn--primary">Guardar</button>
                </div>
              </form>
            </div>
          </SurfaceWrapper>
        </div>
      </div>
    {/if}
</main>

<style lang="scss">
  .admin-page {
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 100vh;
    padding-top: 0;
    padding-bottom: max(114px, env(safe-area-inset-bottom));
  }

  .admin-header {
    position: sticky;
    top: 0;
    z-index: 10;
    pointer-events: none;
    padding: max(8px, env(safe-area-inset-top)) 10px 0;
    margin-bottom: var(--page-header-content-gap, 30px);
  }

  .admin-header :global(.surface-wrapper) {
    pointer-events: auto;
    width: min(1040px, 100%);
    margin: 0 auto;
  }

  .admin-header-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    padding: 16px 18px 15px;
  }

  .admin-header-content h1 {
    margin: 0;
    font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif;
    font-size: var(--fs-xl);
    line-height: var(--lh-tight);
    letter-spacing: 0.012em;
    color: #4e392d;
  }

  .page-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 0.55rem;
    flex-wrap: wrap;
  }

  .heading-family-context {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .heading-family-name {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--text-muted);
    font-weight: 700;
    opacity: 1;
    transition: opacity 600ms var(--motion-standard);

    &.is-hidden {
      opacity: 0;
    }
  }

  .heading-family-role {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--text-muted);
    font-weight: 600;
    opacity: 1;
    transition: opacity 600ms var(--motion-standard);

    &.is-hidden {
      opacity: 0;
    }
  }

  .admin-section {
    margin-bottom: 1.05rem;
    background: transparent;
    border: none;
    border-radius: 15px;
    overflow: clip;
    box-shadow:
      5px 5px 12px rgba(149, 121, 95, 0.14),
      -5px -5px 12px rgba(255, 255, 255, 0.74);
    transition:
      box-shadow 0.22s var(--motion-standard),
      background-color 0.22s var(--motion-standard);

    &.open {
      background: transparent;
      box-shadow:
        7px 7px 15px rgba(149, 121, 95, 0.18),
        -6px -6px 15px rgba(255, 255, 255, 0.8);
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
      border-radius: 14px;
      box-shadow: none;
      transition:
        background-color 0.22s var(--motion-standard),
        transform 0.22s var(--motion-standard),
        box-shadow 0.22s var(--motion-standard);

      &[aria-expanded='false']:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
        box-shadow: none;
      }

      span {
        font-size: var(--fs-md);
        font-weight: 700;
      }

      small {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-size: var(--fs-2xs);
        color: var(--text-muted);
        font-weight: 600;

        .toggle-state {
          display: inline-grid;
          place-items: center;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          font-size: 0.9rem;
          line-height: 1;
          font-weight: 700;
          color: #6b4b31;
          background: #f1e6d8;
          box-shadow:
            inset 2px 2px 5px rgba(149, 121, 95, 0.16),
            inset -2px -2px 5px rgba(255, 255, 255, 0.74);
        }
      }
    }

    .section-body {
      padding: 12px 12px 14px;
    }
  }

  .family-scope-section {
    margin-bottom: 0.8rem;

    .section-body {
      padding: 2px 2px 6px;
    }
  }

  .family-scope-row {
    display: flex;
    justify-content: center;
    align-items: stretch;
    gap: 12px;
    flex-wrap: wrap;
  }

  .family-carousel-shell {
    width: min(980px, 100%);
    border-radius: 15px;
    padding: 6px;
    background: color-mix(in srgb, var(--neu-surface) 74%, transparent);
    box-shadow:
      inset 2px 2px 6px rgba(149, 121, 95, 0.12),
      inset -2px -2px 6px rgba(255, 255, 255, 0.64);

    &.multi {
      margin-inline: auto;
    }
  }

  .family-carousel {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(100%, 100%);
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding: 4px;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .family-card {
    scroll-snap-align: center;
    min-width: 0;
    border-radius: 13px;
    border: none;
    border-radius: inherit;
    min-height: 168px;
    width: 100%;
    padding: 0.8rem 0.9rem;
    background: transparent;
    color: #5d4735;
    cursor: default;
    text-align: left;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;

    &:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--brand) 86%, #fff 14%);
      outline-offset: 2px;
    }

    .family-card-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;

      span {
        font-size: var(--fs-md);
        font-weight: 800;
        color: #5d4735;
      }

    }

    .family-metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;

      p {
        margin: 0;
        padding: 0.48rem 0.55rem;
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.48);
        box-shadow:
          inset 2px 2px 5px rgba(149, 121, 95, 0.1),
          inset -2px -2px 5px rgba(255, 255, 255, 0.7);
        display: flex;
        flex-direction: column;
        gap: 2px;

        strong {
          font-size: var(--fs-md);
          line-height: 1;
          color: #5a402d;
        }

        span {
          font-size: var(--fs-2xs);
          color: var(--text-muted);
        }
      }

      p:last-child {
        grid-column: 1 / -1;
      }
    }

    &.active,
    &[aria-selected='true'] {
      background: transparent;
      border: none;
    }
  }

  .carousel-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 0.55rem;

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      border: none;
      background: #d7ccbe;
      cursor: pointer;
      box-shadow:
        2px 2px 5px rgba(149, 121, 95, 0.14),
        -2px -2px 5px rgba(255, 255, 255, 0.72);
      transition:
        transform 0.2s var(--motion-standard),
        background-color 0.2s var(--motion-standard),
        box-shadow 0.2s var(--motion-standard);

      &.active {
        transform: scale(1.2);
        background: #bfa58f;
        box-shadow:
          inset 1px 1px 3px rgba(149, 121, 95, 0.2),
          inset -1px -1px 3px rgba(255, 255, 255, 0.6);
      }
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

      .user-name {
        color: #4a3426;
        font-size: var(--fs-sm);
        font-weight: 700;
      }

      .user-edit-controls {
        display: grid;
        grid-template-columns: repeat(2, minmax(180px, 1fr));
        gap: 8px;
        width: min(100%, 560px);

        label {
          display: flex;
          flex-direction: column;
          gap: 4px;

          span {
            color: var(--text-muted);
            font-size: var(--fs-2xs);
            font-weight: 600;
          }
        }
      }
    }
  }

  .bulk-save-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;

    &.bottom {
      margin-top: 10px;
      margin-bottom: 0;
    }
  }

  .users-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(241, 236, 228, 0.68);
    backdrop-filter: blur(2px);
    z-index: 999;
  }

  .users-confirm-modal {
    --modal-width: min(560px, calc(100vw - 24px));
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 16px;
    background-color: transparent;
    z-index: 1000;
    width: var(--modal-width);

    .users-confirm-card {
      h2 {
        margin: 0 0 1rem;
        font-size: var(--fs-lg);
        color: #4a3426;
      }
    }
  }

  .users-confirm-modal :global(.surface-wrapper) {
    width: 100%;
  }

  .users-confirm-modal :global(.surface-content) {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    box-sizing: border-box;
    padding: 30px 20px 20px;
    width: var(--modal-width);
    max-height: 80vh;
    overflow-y: auto;
  }

  .modal-shell--wide {
    --modal-width: min(560px, calc(100vw - 24px));
  }

  .modal-shell--compact {
    --modal-width: min(340px, calc(100vw - 24px));
  }

  .users-confirm-card {
    padding: 0;
  }

  .users-summary-grid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;

    p {
      margin: 0;
      padding: 0.45rem 0.5rem;
      border-radius: 10px;
      background: rgba(255, 255, 255, 0.5);
      box-shadow:
        inset 2px 2px 5px rgba(149, 121, 95, 0.1),
        inset -2px -2px 5px rgba(255, 255, 255, 0.68);
      display: flex;
      flex-direction: column;
      gap: 2px;

      strong {
        font-size: var(--fs-md);
        line-height: 1;
        color: #5a402d;
      }

      span {
        color: var(--text-muted);
        font-size: var(--fs-2xs);
      }
    }
  }

  .users-changes-list {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    max-height: min(42vh, 360px);
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;

    li {
      background: rgba(255, 255, 255, 0.52);
      border-radius: 10px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;

      strong {
        font-size: var(--fs-sm);
        color: #4a3426;
      }

      small {
        font-size: var(--fs-xs);
        color: var(--text-muted);
      }
    }
  }

  .users-confirm-actions {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-top: 12px;

    :global(.app-btn) {
      width: 100%;
      min-height: 42px;
    }

    @media (min-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }
  }

  .family-settings-card {
    padding: 0;

    form {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .users-confirm-actions {
      margin-top: 0.1rem;
      gap: 8px;
    }

    .ok-note,
    .error-note {
      margin: 0;
    }
  }

  .family-settings-modal {
    min-width: 280px;
    border-radius: 16px;
  }

  .family-settings-field {
    margin: 0 0 1.5rem;
  }

  :global(.family-settings-modal .surface-content) {
    width: var(--modal-width);
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
    border: none;
    background: #f3eadf;
    color: var(--text-main);
    border-radius: var(--radius-pill);
    font-size: var(--fs-2xs);
    font-weight: 600;
    min-height: 30px;
    padding: 0.28rem 0.62rem;
    cursor: pointer;
    box-shadow:
      3px 3px 8px rgba(149, 121, 95, 0.12),
      -3px -3px 8px rgba(255, 255, 255, 0.72);
    transition:
      transform 0.2s var(--motion-standard),
      box-shadow 0.2s var(--motion-standard),
      background-color 0.2s var(--motion-standard);

    &:hover {
      transform: translateY(-1px);
      background: #f7efe6;
    }

    &.active {
      background: #e9dccd;
      box-shadow:
        inset 2px 2px 5px rgba(149, 121, 95, 0.16),
        inset -2px -2px 5px rgba(255, 255, 255, 0.7);
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

  :global(.admin-header .surface-content) {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 0;
  }

  @media (max-width: 720px) {
    .invite-row {
      > * {
        width: 100%;
      }
    }

    .list li .user-edit-controls {
      width: 100%;
      grid-template-columns: 1fr;
    }

    .bulk-save-row {
      justify-content: stretch;

      .app-btn {
        width: 100%;
      }
    }

    .users-confirm-actions {
      > * {
        width: 100%;
      }
    }

    .users-summary-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (min-width: 760px) {
    .admin-header {
      padding-inline: 14px;
    }

    .admin-header-content {
      padding: 18px 20px 16px;
    }

    .admin-section {
      border-radius: 16px;
    }
  }
</style>
