<script lang="ts">
  import { goto } from '$app/navigation'
  import { page } from '$app/stores'
  import type { SubmitFunction } from '@sveltejs/kit'
  import { onDestroy, onMount } from 'svelte'
  import type {
    AdminFamilySummary,
    AdminInviteFilter,
    AdminInviteSummary,
    AdminMemberOption,
    AdminUserDraft,
    AdminUserProfile
  } from '../../components/admin/types'
  import type { ActionData, PageData } from './$types'
  import CollapsibleAdminSection from '../../components/admin/collapsibleAdminSection.svelte'
  import FamilyScopeCarousel from '../../components/admin/familyScopeCarousel.svelte'
  import FamilySettingsModal from '../../components/admin/familySettingsModal.svelte'
  import GeneralInvitePanel from '../../components/admin/generalInvitePanel.svelte'
  import IssuedInvitesPanel from '../../components/admin/issuedInvitesPanel.svelte'
  import MemberInvitePanel from '../../components/admin/memberInvitePanel.svelte'
  import UsersManagementPanel from '../../components/admin/usersManagementPanel.svelte'
  import UsersConfirmModal from '../../components/admin/usersConfirmModal.svelte'

  export let data: PageData
  export let form: ActionData | null | undefined
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
  let familyCarousel: HTMLDivElement | null = null
  const familyCards = new Map<string, HTMLElement>()
  let focusedFamilyId = ''
  let pendingFamilyId: string | null = null
  let switchFamilyTimer: ReturnType<typeof setTimeout> | null = null
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
    if (switchFamilyTimer) clearTimeout(switchFamilyTimer)
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
  $: activeFamilyRole = activeFamily?.role ?? 'viewer'
  $: focusedFamilyId = activeFamilyId
  $: if (pendingFamilyId && pendingFamilyId === activeFamilyId) {
    pendingFamilyId = null
  }
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

  const switchFamily = async (familyId: string) => {
    if (!familyId || familyId === activeFamilyId) return

    pendingFamilyId = familyId
    const nextHref = `/family/${encodeURIComponent(familyId)}/admin`

    try {
      await goto(nextHref, {
        keepFocus: true,
        noScroll: true
      })
    } catch {
      pendingFamilyId = null
    }
  }

  const focusAndSwitchFamily = (familyId: string) => {
    focusedFamilyId = familyId
    switchFamily(familyId)
  }

  const openFamilySettingsModal = (family: AdminFamilySummary) => {
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
  <title>Administración — Orikara</title>
</svelte:head>

<main class="admin-page page-shell" data-route-params-count={routeParamsCount}>
  <FamilyScopeCarousel
    families={data.families}
    {focusedFamilyId}
    {activeFamilyId}
    bind:familyCarousel
    {trackFamilyCard}
    onDetectCenteredFamily={detectCenteredFamily}
    onSwitchFamily={focusAndSwitchFamily}
    onOpenFamilySettings={openFamilySettingsModal}
    onGoToFamilyAt={goToFamilyAt}
  />

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
        activeFamilyRole={data.activeFamily.role}
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
        activeFamilyRole={data.activeFamily.role}
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
    padding-top: 0;
    padding-bottom: max(114px, env(safe-area-inset-bottom));
  }
</style>
