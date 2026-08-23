<script lang="ts">
  import { page } from '$app/stores'
  import type { SubmitFunction } from '@sveltejs/kit'
  import { onDestroy } from 'svelte'
  import type {
    AdminFamilySummary,
    AdminInviteFilter,
    AdminInviteSummary,
    AdminMemberOption,
    AdminUserDraft,
    AdminUserProfile
  } from '../../components/admin/types'
  import CollapsibleAdminSection from '../../components/admin/collapsibleAdminSection.svelte'
  import GearIcon from '../../components/icons/gearIcon.svelte'
  import FamilySettingsModal from '../../components/admin/familySettingsModal.svelte'
  import GeneralInvitePanel from '../../components/admin/generalInvitePanel.svelte'
  import IssuedInvitesPanel from '../../components/admin/issuedInvitesPanel.svelte'
  import MemberInvitePanel from '../../components/admin/memberInvitePanel.svelte'
  import UsersManagementPanel from '../../components/admin/usersManagementPanel.svelte'
  import UsersConfirmModal from '../../components/admin/usersConfirmModal.svelte'

  type AdminPageData = {
    families: AdminFamilySummary[]
    activeFamily: AdminFamilySummary | null
    canManageInvites: boolean
    profiles: Array<AdminUserProfile & { member_id: string | null; created_at: string }>
    invites: AdminInviteSummary[]
    members: AdminMemberOption[]
    currentUserId?: string | null
    manager?: { id?: string | null } | null
  }

  export let data: AdminPageData
  export let form: Record<string, any> | null | undefined
  export let params: Record<string, string> = {}
  $: routeParamsCount = Object.keys(params).length

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

  const inviteStatusLabel = (invite: AdminInviteSummary) => {
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

  let inviteFilter: AdminInviteFilter = 'all'
  const inviteFilterOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'active', label: 'Activas' },
    { value: 'expired', label: 'Caducadas' },
    { value: 'limit', label: 'Límite' },
    { value: 'revoked', label: 'Revocadas' }
  ]

  function onInviteFilterChange(event: CustomEvent<string>) {
    const nextFilter = event.detail
    if (
      nextFilter === 'all' ||
      nextFilter === 'active' ||
      nextFilter === 'expired' ||
      nextFilter === 'revoked' ||
      nextFilter === 'limit'
    ) {
      inviteFilter = nextFilter
    }
  }
  let showFamilySettingsModal = false
  let familySettingsFamilyId = ''
  let familyNameDraft = ''

  const inviteMatchesFilter = (invite: AdminInviteSummary, filter: AdminInviteFilter) => {
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

  $: memberNameById = new Map<string, string>(
    data.members.map((member) => [member.id, `${member.name} ${member.family_name}`])
  )
  $: preselectedMemberId = $page.url.searchParams.get('memberId') ?? ''
  $: if (!memberId && preselectedMemberId && memberNameById.has(preselectedMemberId)) {
    memberId = preselectedMemberId
  }
  $: activeFamilyId = data.activeFamily?.id ?? ''
  $: activeFamily = data.families.find((family) => family.id === activeFamilyId) ?? null
  $: activeFamilyRole = activeFamily?.role ?? 'viewer'
  $: filteredInvites = data.invites.filter((invite) => inviteMatchesFilter(invite, inviteFilter))
  $: currentUserId = data.currentUserId ?? data.manager?.id ?? ''

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

  let userDraftsById: Record<string, AdminUserDraft> = {}
  let userDraftsSeed = ''
  let usersChanges: UserDraftChange[] = []
  let usersChangesJson = '[]'
  let showUsersConfirmModal = false
  let roleChanges: UserDraftChange[] = []
  let linkChanges: UserDraftChange[] = []
  let availableMembersByProfileId: Record<string, AdminMemberOption[]> = {}

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

  const profileDisplayName = (profile: AdminUserProfile) =>
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

  const linkedMemberByProfileId = (profileId: string) =>
    normalizeMemberId(userDraftsById[profileId]?.memberId)

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
    const nextByProfileId: Record<string, AdminMemberOption[]> = {}
    for (const profile of data.profiles) {
      nextByProfileId[profile.id] = buildAvailableMembersForProfile(profile.id)
    }
    availableMembersByProfileId = nextByProfileId
  }

  const openFamilySettingsModal = (family: AdminFamilySummary | null) => {
    if (!family || family.role === 'viewer') return
    familySettingsFamilyId = family.id
    familyNameDraft = family.name
    showFamilySettingsModal = true
  }

  const closeFamilySettingsModal = () => {
    showFamilySettingsModal = false
  }
</script>

<svelte:head>
  <title>Administración — Orikara</title>
</svelte:head>

<main class="admin-page page-shell" data-route-params-count={routeParamsCount}>
  <section class="family-context reveal-fade-up reveal-delay-1" aria-label="Contexto familiar">
    <div class="family-context-card app-card-soft">
      <div class="family-context-header">
        <h2>{activeFamily?.name ?? 'Sin familia'}</h2>

        {#if activeFamily && activeFamily.role !== 'viewer'}
          <button
            type="button"
            class="app-settings-trigger"
            aria-label={`Abrir ajustes de ${activeFamily.name}`}
            title="Ajustes de familia"
            on:click={() => openFamilySettingsModal(activeFamily)}
          >
            <GearIcon />
          </button>
        {/if}
      </div>

      {#if activeFamily}
        <div class="family-metrics-grid app-stat-grid">
          <p class="app-stat-item">
            <strong>{activeFamily.metrics.membersCount}</strong>
            <span>Miembros</span>
          </p>
          <p class="app-stat-item">
            <strong>{activeFamily.metrics.usersCount}</strong>
            <span>Usuarios</span>
          </p>
          <p class="app-stat-item">
            <strong>{activeFamily.metrics.unlinkedMembersCount}</strong>
            <span>Sin vincular</span>
          </p>
          <p class="app-stat-item">
            <strong>{activeFamily.metrics.activeInvitesCount}</strong>
            <span>Invitaciones activas</span>
          </p>
          <p class="app-stat-item">
            <strong>{activeFamily.metrics.managersCount}</strong>
            <span>Gestores</span>
          </p>
        </div>
      {/if}
    </div>
  </section>

  {#if data.canManageInvites}
    <CollapsibleAdminSection
      open={openSection === 'general'}
      title="Invitación general"
      subtitle="Enlace reutilizable"
      revealClass="reveal-fade-up reveal-delay-1"
      onToggle={() => {
        toggleSection('general')
      }}
    >
      <GeneralInvitePanel
        {activeFamilyId}
        {activeFamilyRole}
        bind:generalRole
        bind:generalExpiry
        bind:generalMaxUses
        created={Boolean(form?.invitedGeneral)}
        successMessage={form?.inviteSuccess ?? ''}
        inviteLink={form?.inviteLink ?? ''}
        errorMessage={form?.inviteError ?? ''}
        {copyStatus}
        {copyStatusTone}
        onCopyLink={copyInviteLink}
      />
    </CollapsibleAdminSection>

    <CollapsibleAdminSection
      open={openSection === 'member'}
      title="Invitación vinculada"
      subtitle="Asignada a persona"
      revealClass="reveal-fade-up reveal-delay-1"
      onToggle={() => {
        toggleSection('member')
      }}
    >
      <MemberInvitePanel
        {activeFamilyId}
        {activeFamilyRole}
        members={data.members}
        bind:memberEmail
        bind:memberId
        bind:memberRole
        bind:memberExpiry
        successMessage={form?.invitedMember
          ? `Invitación vinculada lista para ${form.invitedMember}.`
          : ''}
        errorMessage={form?.inviteError ?? ''}
      />
    </CollapsibleAdminSection>

    <CollapsibleAdminSection
      open={openSection === 'invites'}
      title="Invitaciones emitidas"
      subtitle={`${data.invites.length} registradas`}
      revealClass="reveal-fade-up reveal-delay-2"
      onToggle={() => {
        toggleSection('invites')
      }}
    >
      <IssuedInvitesPanel
        invites={data.invites}
        {filteredInvites}
        {activeFamilyId}
        {inviteFilter}
        {inviteFilterOptions}
        {roleLabels}
        {inviteTypeLabels}
        {memberNameById}
        {formatDate}
        {inviteStatusLabel}
        {inviteStatusTone}
        onFilterChange={onInviteFilterChange}
        successMessage={form?.revokeSuccess ?? ''}
        errorMessage={form?.inviteError ?? ''}
      />
    </CollapsibleAdminSection>
  {/if}

  <CollapsibleAdminSection
    open={openSection === 'users'}
    title="Usuarios"
    subtitle={`${data.profiles.length} usuarios`}
    revealClass="reveal-fade-up reveal-delay-2"
    onToggle={() => {
      toggleSection('users')
    }}
  >
    <UsersManagementPanel
      profiles={data.profiles}
      {userDraftsById}
      {availableMembersByProfileId}
      changesCount={usersChanges.length}
      successCount={form?.usersSaved}
      errorMessage={form?.usersError ?? ''}
      {canEditRole}
      {canEditLink}
      {canShowAdminRole}
      onRoleChange={onRoleDraftChange}
      onMemberChange={onMemberDraftChange}
      onOpenConfirm={openUsersConfirmDialog}
    />
  </CollapsibleAdminSection>

  <UsersConfirmModal
    open={showUsersConfirmModal}
    onClose={closeUsersConfirmDialog}
    {usersChanges}
    {roleLabels}
    roleChangesCount={roleChanges.length}
    linkChangesCount={linkChanges.length}
    {activeFamilyId}
    {usersChangesJson}
    {usersSaveEnhance}
    {memberDisplayName}
  />

  <FamilySettingsModal
    open={showFamilySettingsModal}
    onClose={closeFamilySettingsModal}
    {familySettingsFamilyId}
    bind:familyNameDraft
    successMessage={form?.familySettingsSuccess &&
    form?.familySettingsFamilyId === familySettingsFamilyId
      ? form.familySettingsSuccess
      : ''}
    errorMessage={form?.familySettingsError ?? ''}
  />
</main>

<style lang="scss">
  .admin-page {
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 100vh;
    padding-bottom: max(114px, env(safe-area-inset-bottom));
  }

  .family-context {
    width: min(var(--page-content-max), 100%);
    margin-inline: auto;
    margin-bottom: 0.8rem;
    padding: 2px 2px 4px;
  }

  .admin-page :global(.admin-section) {
    width: min(var(--page-content-max), 100%);
    margin-inline: auto;
  }

  .family-context-card {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    padding: 1rem 1.05rem;
    background: color-mix(in srgb, var(--neu-surface) 92%, #ffffff 8%);
    box-shadow:
      inset 5px 5px 12px rgba(149, 121, 95, 0.18),
      inset -5px -5px 12px rgba(255, 255, 255, 0.72);
  }

  .family-context-header {
    display: flex;
    justify-content: space-between;
    gap: 0.75rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .family-context-header h2 {
    margin: 0;
    font-size: var(--fs-lg);
    line-height: var(--lh-tight);
  }

  .family-metrics-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;

    p:last-child {
      grid-column: 1 / -1;
    }
  }
</style>
