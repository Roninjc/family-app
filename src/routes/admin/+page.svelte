<script lang="ts">
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
  import CollapsibleAdminSection from '../../components/admin/collapsibleAdminSection.svelte'
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
    stopCrowdAnimation()
    crowdObserver?.disconnect()
    crowdVisibilityObserver?.disconnect()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  })

  onMount(() => {
    isPageVisible = typeof document === 'undefined' ? true : document.visibilityState === 'visible'
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibilityChange)
      }
      crowdObserver?.disconnect()
      crowdVisibilityObserver?.disconnect()
      crowdObserver = null
      crowdVisibilityObserver = null
    }
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
  $: familyMembersCount = activeFamily?.metrics.membersCount ?? 0
  $: unlinkedMembersCount = activeFamily?.metrics.unlinkedMembersCount ?? 0
  $: filteredInvites = data.invites.filter((invite) => inviteMatchesFilter(invite, inviteFilter))
  $: currentUserId = data.currentUserId ?? data.manager?.id ?? ''

  type CrowdAvatar = {
    id: number
    x: number
    y: number
    vx: number
    vy: number
    phase: number
    speed: number
    ampX: number
    ampY: number
    isLinked: boolean
  }

  let crowdCircleEl: HTMLDivElement | null = null
  let crowdAvatars: CrowdAvatar[] = []
  let crowdAvatarSize = 14
  let crowdRadius = 110
  let crowdSeedKey = ''
  let crowdAnimationFrame: number | null = null
  let crowdLastFrameTs = 0
  let crowdObserver: ResizeObserver | null = null
  let crowdRandom = Math.random
  let crowdTickAccumulatorMs = 0
  let crowdFrameIntervalMs = 16.67
  let crowdCollisionStride = 1
  let crowdCollisionPhase = 0
  let isCrowdInViewport = true
  let isPageVisible = true
  let crowdVisibilityObserver: IntersectionObserver | null = null

  const canUseAnimationFrame = () =>
    typeof window !== 'undefined' &&
    typeof requestAnimationFrame === 'function' &&
    typeof cancelAnimationFrame === 'function'

  const hashSeed = (value: string) => {
    let hash = 2166136261
    for (let i = 0; i < value.length; i += 1) {
      hash ^= value.charCodeAt(i)
      hash = Math.imul(hash, 16777619)
    }
    return hash >>> 0
  }

  const makeSeededRandom = (seed: number) => {
    let state = seed || 123456789
    return () => {
      state = (1664525 * state + 1013904223) >>> 0
      return state / 4294967296
    }
  }

  const stopCrowdAnimation = () => {
    if (!canUseAnimationFrame()) return

    if (crowdAnimationFrame !== null) {
      cancelAnimationFrame(crowdAnimationFrame)
      crowdAnimationFrame = null
    }
  }

  const updateCrowdPerformanceProfile = () => {
    const count = crowdAvatars.length
    const isCoarsePointer =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(pointer: coarse)').matches
        : false

    crowdFrameIntervalMs = isCoarsePointer || count > 36 ? 33.34 : 16.67
    crowdCollisionStride = count > 58 ? 3 : count > 36 ? 2 : 1
  }

  const shouldRunCrowdAnimation = () =>
    crowdAvatars.length > 0 && isPageVisible && isCrowdInViewport

  const updateCrowdAnimationState = () => {
    if (!canUseAnimationFrame()) return

    if (shouldRunCrowdAnimation()) {
      if (crowdAnimationFrame === null) {
        crowdLastFrameTs = 0
        crowdTickAccumulatorMs = 0
        crowdAnimationFrame = requestAnimationFrame(tickCrowdAnimation)
      }
      return
    }

    stopCrowdAnimation()
  }

  const onVisibilityChange = () => {
    isPageVisible = typeof document === 'undefined' ? true : document.visibilityState === 'visible'
    updateCrowdAnimationState()
  }

  const buildCrowdAvatars = () => {
    const count = Math.max(0, familyMembersCount)
    if (count === 0) {
      crowdAvatars = []
      updateCrowdPerformanceProfile()
      return
    }

    const random = makeSeededRandom(hashSeed(`${activeFamilyId}:${count}:${unlinkedMembersCount}`))
    crowdRandom = random
    const denseFactor = Math.max(0, Math.min(1, (count - 16) / 38))
    const nextSize = Math.max(3.9, Math.min(10.4, 17.8 - Math.sqrt(count) * 1.48 - denseFactor * 0.45))
    const maxRadius = Math.max(10, crowdRadius - nextSize * 0.72)
    const minDistance = Math.max(3.9, nextSize * (0.67 + denseFactor * 0.1))
    crowdAvatarSize = nextSize

    const avatars: CrowdAvatar[] = []
    for (let i = 0; i < count; i += 1) {
      let placed = false
      let x = 0
      let y = 0

      for (let attempt = 0; attempt < 380; attempt += 1) {
        const angle = random() * Math.PI * 2
        const distance = Math.sqrt(random()) * maxRadius
        x = Math.cos(angle) * distance
        y = Math.sin(angle) * distance

        let overlaps = false
        for (const other of avatars) {
          const dx = x - other.x
          const dy = y - other.y
          if (dx * dx + dy * dy < minDistance * minDistance) {
            overlaps = true
            break
          }
        }

        if (!overlaps) {
          placed = true
          break
        }
      }

      if (!placed) {
        const fallbackAngle = (i / Math.max(count, 1)) * Math.PI * 2
        const fallbackDistance = maxRadius * (0.65 + random() * 0.25)
        x = Math.cos(fallbackAngle) * fallbackDistance
        y = Math.sin(fallbackAngle) * fallbackDistance
      }

      avatars.push({
        id: i,
        x,
        y,
        vx: (random() - 0.5) * 0.12,
        vy: (random() - 0.5) * 0.12,
        phase: random() * Math.PI * 2,
        speed: 0.00045 + random() * 0.00018,
        ampX: nextSize * (0.1 + random() * 0.2),
        ampY: nextSize * (0.1 + random() * 0.2),
        isLinked: i >= unlinkedMembersCount
      })
    }

    crowdAvatars = avatars
    updateCrowdPerformanceProfile()
  }

  const tickCrowdAnimation = (time: number) => {
    if (!shouldRunCrowdAnimation()) {
      stopCrowdAnimation()
      return
    }

    const elapsedMs = crowdLastFrameTs ? Math.min(time - crowdLastFrameTs, 64) : crowdFrameIntervalMs
    crowdLastFrameTs = time
    crowdTickAccumulatorMs += elapsedMs

    if (crowdTickAccumulatorMs < crowdFrameIntervalMs) {
      crowdAnimationFrame = requestAnimationFrame(tickCrowdAnimation)
      return
    }

    const deltaMs = crowdTickAccumulatorMs
    crowdTickAccumulatorMs = 0
    const dt = deltaMs / 16.67
    const maxRadius = Math.max(8, crowdRadius - crowdAvatarSize * 0.72)
    const collisionDistance = Math.max(5.6, crowdAvatarSize * 0.95)
    const collisionDistanceSq = collisionDistance * collisionDistance

    for (const avatar of crowdAvatars) {
      const t = time * avatar.speed + avatar.phase
      const driftX = Math.cos(t) * avatar.ampX * 0.0048
      const driftY = Math.sin(t * 1.07) * avatar.ampY * 0.0048
      avatar.vx += driftX * dt
      avatar.vy += driftY * dt
    }

    for (let i = 0; i < crowdAvatars.length; i += 1) {
      const avatar = crowdAvatars[i]
      for (let j = i + 1; j < crowdAvatars.length; j += 1) {
        if (crowdCollisionStride > 1 && (i + j + crowdCollisionPhase) % crowdCollisionStride !== 0) {
          continue
        }

        const other = crowdAvatars[j]
        const dx = avatar.x - other.x
        const dy = avatar.y - other.y
        const distanceSq = dx * dx + dy * dy

        if (distanceSq > 0.0001 && distanceSq < collisionDistanceSq) {
          const distance = Math.sqrt(distanceSq)
          const overlap = collisionDistance - distance
          const nx = dx / distance
          const ny = dy / distance
          const push = overlap * 0.5

          avatar.x += nx * push
          avatar.y += ny * push
          other.x -= nx * push
          other.y -= ny * push

          const impulse = overlap * 0.024 * dt
          avatar.vx += nx * impulse
          avatar.vy += ny * impulse
          other.vx -= nx * impulse
          other.vy -= ny * impulse
        }
      }
    }

    for (const avatar of crowdAvatars) {
      const distanceFromCenter = Math.hypot(avatar.x, avatar.y) || 0.001
      if (distanceFromCenter > maxRadius) {
        const excess = distanceFromCenter - maxRadius
        const nx = avatar.x / distanceFromCenter
        const ny = avatar.y / distanceFromCenter
        avatar.x -= nx * excess
        avatar.y -= ny * excess
        avatar.vx -= nx * excess * 0.068
        avatar.vy -= ny * excess * 0.068
      }

      avatar.vx *= 0.92
      avatar.vy *= 0.92
      avatar.x += avatar.vx * dt * 0.7
      avatar.y += avatar.vy * dt * 0.7
    }

    if (crowdCollisionStride > 1) {
      crowdCollisionPhase = (crowdCollisionPhase + 1) % crowdCollisionStride
    }

    crowdAvatars = [...crowdAvatars]
    crowdAnimationFrame = requestAnimationFrame(tickCrowdAnimation)
  }

  const startCrowdAnimation = () => {
    updateCrowdAnimationState()
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

  let openSection: 'general' | 'member' | 'invites' | 'users' | null = null

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

  const clearFamilySettingsQueryFlag = () => {
    if (typeof window === 'undefined') return
    const nextUrl = new URL(window.location.href)
    if (!nextUrl.searchParams.has('familySettings')) return
    nextUrl.searchParams.delete('familySettings')
    window.history.replaceState(window.history.state, '', `${nextUrl.pathname}${nextUrl.search}`)
  }

  const closeFamilySettingsModal = () => {
    showFamilySettingsModal = false
    clearFamilySettingsQueryFlag()
  }

  $: shouldOpenFamilySettingsFromQuery =
    $page.url.searchParams.get('familySettings') === '1' ||
    $page.url.searchParams.get('familySettings') === 'true'

  $: if (shouldOpenFamilySettingsFromQuery && activeFamily && activeFamily.role !== 'viewer') {
    openFamilySettingsModal(activeFamily)
    clearFamilySettingsQueryFlag()
  }

  $: if (crowdCircleEl && !crowdObserver && typeof ResizeObserver !== 'undefined') {
    crowdObserver = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (!entry) return
      crowdRadius = Math.max(30, Math.min(entry.contentRect.width, entry.contentRect.height) * 0.5 - 5)
      updateCrowdAnimationState()
    })

    crowdObserver.observe(crowdCircleEl)
    const initialRect = crowdCircleEl.getBoundingClientRect()
    crowdRadius = Math.max(30, Math.min(initialRect.width, initialRect.height) * 0.5 - 5)
    updateCrowdAnimationState()
  }

  $: if (crowdCircleEl && !crowdVisibilityObserver && typeof IntersectionObserver !== 'undefined') {
    crowdVisibilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (!entry) return
        isCrowdInViewport = entry.isIntersecting
        updateCrowdAnimationState()
      },
      {
        rootMargin: '220px 0px',
        threshold: 0.01
      }
    )

    crowdVisibilityObserver.observe(crowdCircleEl)
  }

  $: nextCrowdSeedKey = `${activeFamilyId}:${familyMembersCount}:${unlinkedMembersCount}`
  $: if (nextCrowdSeedKey !== crowdSeedKey) {
    crowdSeedKey = nextCrowdSeedKey
    buildCrowdAvatars()
    updateCrowdAnimationState()
  }
</script>

<svelte:head>
  <title>Administración — Orikara</title>
</svelte:head>

<main class="admin-page page-shell" data-route-params-count={routeParamsCount}>
  <section class="family-context reveal-fade-up reveal-delay-1" aria-label="Contexto familiar">
    <div class="family-context-card">
      {#if activeFamily}
        <div class="family-crowd-wrap" aria-label="Miembros de la familia">
          <div
            class="family-crowd-circle"
            bind:this={crowdCircleEl}
            role="img"
            aria-label={`${familyMembersCount} miembros en la familia`}
          >
            {#each crowdAvatars as avatar (avatar.id)}
              <div
                class="mini-person"
                class:mini-person--linked={avatar.isLinked}
                style={`--x:${avatar.x.toFixed(2)}px; --y:${avatar.y.toFixed(2)}px; --size:${crowdAvatarSize.toFixed(2)}px; --depth:${Math.round((avatar.y + crowdRadius) * 10) * 100 + avatar.id}; --front:${Math.max(0, Math.min(1, (avatar.y + crowdRadius) / Math.max(crowdRadius * 2, 1))).toFixed(3)}; --walk-duration:${1250 + (avatar.id % 7) * 90}ms; --walk-delay-a:${-(avatar.id % 11) * 90}ms; --walk-delay-b:${-((avatar.id % 11) * 90 + (1250 + (avatar.id % 7) * 90) / 2)}ms;`}
                aria-hidden="true"
              >
                <span class="mini-head"></span>
                <span class="mini-body"></span>
                <span class="mini-legs"></span>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </section>

  {#if data.canManageInvites}
    <div
      class="admin-section-group admin-section-group--after-context reveal-fade-up reveal-delay-1"
      aria-label="Grupo de invitaciones"
    >
      <CollapsibleAdminSection
        open={openSection === 'general'}
        title="Invitación general"
        subtitle="Enlace reutilizable"
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
    </div>

    <div
      class="admin-section-group admin-section-group--spaced reveal-fade-up reveal-delay-2"
      aria-label="Grupo de invitaciones emitidas"
    >
      <CollapsibleAdminSection
        open={openSection === 'invites'}
        title="Invitaciones emitidas"
        subtitle={`${data.invites.length} registradas`}
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
    </div>
  {/if}

  <div class="admin-section-group admin-section-group--spaced reveal-fade-up reveal-delay-2">
    <CollapsibleAdminSection
      open={openSection === 'users'}
      title="Usuarios"
      subtitle={`${data.profiles.length} usuarios`}
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
  </div>

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
    margin-bottom: 1.4rem;
    padding: 2px 4px;
    content-visibility: auto;
    contain-intrinsic-size: auto none auto 470px;
  }

  .admin-section-group {
    width: min(var(--page-content-max), 100%);
    margin-inline: auto;
  }

  .admin-section-group--spaced {
    position: relative;
    margin-top: 2.8rem;
  }

  .admin-section-group--after-context {
    position: relative;
    margin-top: 2.2rem;
  }

  .admin-section-group--spaced::before,
  .admin-section-group--after-context::before {
    content: '';
    position: absolute;
    top: -1.4rem;
    left: 6px;
    right: 6px;
    height: 1px;
    background: linear-gradient(
      90deg,
      rgba(149, 121, 95, 0),
      rgba(149, 121, 95, 0.34) 22%,
      rgba(149, 121, 95, 0.34) 78%,
      rgba(149, 121, 95, 0)
    );
  }

  .admin-section-group--after-context::before {
    top: -1.1rem;
  }

  .admin-page :global(.admin-section) {
    width: min(var(--page-content-max), 100%);
    margin-inline: 0;
    margin-bottom: 0.72rem;
  }

  .admin-section-group :global(.admin-section:last-child) {
    margin-bottom: 0;
  }

  .family-context-card {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    padding: 0.35rem 0.1rem 0.2rem;
    background: transparent;
    box-shadow: none;
  }

  .family-crowd-wrap {
    width: 100%;
    display: grid;
    place-items: center;
  }

  .family-crowd-circle {
    position: relative;
    width: min(92vw, 410px);
    aspect-ratio: 1;
    border-radius: 999px;
    background: radial-gradient(circle at 34% 26%, rgba(255, 253, 250, 0.98), rgba(236, 225, 211, 0.8));
    box-shadow:
      10px 10px 26px rgba(140, 109, 83, 0.18),
      -10px -10px 26px rgba(255, 255, 255, 0.82),
      inset 7px 7px 14px rgba(149, 121, 95, 0.14),
      inset -7px -7px 14px rgba(255, 255, 255, 0.82);
    overflow: clip;
  }

  .mini-person {
    position: absolute;
    left: 50%;
    top: 50%;
    z-index: var(--depth, 10);
    width: calc(var(--size) * 1.08);
    height: calc(var(--size) * 2.14);
    transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y)));
    --person-tone-light: #f6f2eb;
    --person-tone-mid: #e8dfd4;
    --person-tone-dark: #d7cabe;
    --shadow-rgb: 122 93 68;
    filter: drop-shadow(
      1px
      calc(0.65px + var(--front, 0.5) * 0.95px)
      calc(1.35px + var(--front, 0.5) * 1.55px)
      rgb(var(--shadow-rgb) / calc(0.14 + var(--front, 0.5) * 0.18))
    );
    pointer-events: none;
    animation: person-bob calc(var(--walk-duration, 1450ms) * 0.9) ease-in-out infinite;

    .mini-head,
    .mini-body,
    .mini-legs {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      display: block;
    }

    .mini-head {
      top: 0;
      width: calc(var(--size) * 0.9);
      height: calc(var(--size) * 0.9);
      border-radius: 999px;
      background: radial-gradient(
        circle at 34% 28%,
        var(--person-tone-light) 0%,
        var(--person-tone-mid) 64%,
        var(--person-tone-dark) 100%
      );
      box-shadow:
        inset 0.8px 0.8px 1.6px rgba(255, 255, 255, 0.75),
        inset -0.9px -0.9px 1.6px rgba(161, 130, 102, 0.2),
        0.8px 1.1px 2px rgba(122, 94, 70, 0.2);
      z-index: 3;
      animation: head-bob var(--walk-duration, 1450ms) ease-in-out infinite;
      animation-delay: var(--walk-delay-a, 0ms);
    }

    .mini-body {
      top: calc(var(--size) * 0.66);
      width: calc(var(--size) * 0.82);
      height: calc(var(--size) * 1.24);
      border-radius: 45% 45% 40% 40% / 35% 35% 58% 58%;
      background: radial-gradient(
        ellipse at 38% 26%,
        color-mix(in srgb, var(--person-tone-light) 88%, #ffffff 12%) 0%,
        var(--person-tone-mid) 58%,
        var(--person-tone-dark) 100%
      );
      box-shadow:
        inset 1px 1px 2px rgba(255, 255, 255, 0.72),
        inset -1px -1px 2px rgba(160, 129, 101, 0.18),
        1px 1.2px 2.6px rgba(124, 95, 71, 0.2);
      z-index: 2;
      animation: body-bob var(--walk-duration, 1450ms) ease-in-out infinite;
      animation-delay: var(--walk-delay-a, 0ms);
    }

    .mini-legs {
      top: calc(var(--size) * 1.56);
      width: calc(var(--size) * 0.8);
      height: calc(var(--size) * 0.72);
      background: transparent;
      z-index: 1;

      &::before,
      &::after {
        content: '';
        position: absolute;
        top: calc(var(--size) * -0.02);
        width: calc(var(--size) * 0.34);
        height: calc(var(--size) * 0.72);
        border-radius: 999px;
        background: linear-gradient(
          170deg,
          color-mix(in srgb, var(--person-tone-light) 72%, #ffffff 28%),
          var(--person-tone-mid) 54%,
          var(--person-tone-dark) 100%
        );
        box-shadow:
          inset 0.7px 0.7px 1.3px rgba(255, 255, 255, 0.66),
          inset -0.7px -0.7px 1.3px rgba(160, 129, 101, 0.16),
          0.8px 1px 1.8px rgba(118, 90, 67, 0.17),
          0 0.8px 0.4px rgba(110, 82, 60, 0.14);
        transform-origin: 50% 10%;
      }

      &::before {
        left: calc(var(--size) * 0.02);
        animation: leg-swing var(--walk-duration, 1450ms) cubic-bezier(0.45, 0.02, 0.55, 0.98)
          infinite;
        animation-delay: var(--walk-delay-a, 0ms);
      }

      &::after {
        right: calc(var(--size) * 0.02);
        animation: leg-swing var(--walk-duration, 1450ms)
          cubic-bezier(0.45, 0.02, 0.55, 0.98) infinite;
        animation-delay: var(--walk-delay-b, -700ms);
      }
    }
  }

  .mini-person--linked {
    --person-tone-light: #f1ede6;
    --person-tone-mid: #dfd5c9;
    --person-tone-dark: #cfc0b2;
    --shadow-rgb: 126 97 73;
  }

  .mini-person:not(.mini-person--linked) {
    .mini-head,
    .mini-body,
    .mini-legs {
      opacity: 0.9;
    }
  }

  @media (min-width: 780px) {
    .family-crowd-circle {
      width: 430px;
    }
  }

  @keyframes leg-swing {
    0% {
      transform: rotate(16deg) translateY(0.32px) scaleY(1.04);
    }
    25% {
      transform: rotate(6deg) translateY(-0.22px) scaleY(1.01);
    }
    50% {
      transform: rotate(-16deg) translateY(-1.02px) scaleY(0.94);
    }
    75% {
      transform: rotate(-6deg) translateY(-0.2px) scaleY(0.98);
    }
    100% {
      transform: rotate(16deg) translateY(0.32px) scaleY(1.04);
    }
  }

  @keyframes person-bob {
    0% {
      transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y)));
    }
    50% {
      transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y) - 0.55px));
    }
    100% {
      transform: translate(calc(-50% + var(--x)), calc(-50% + var(--y)));
    }
  }

  @keyframes head-bob {
    0% {
      transform: translateX(-50%) rotate(-2.5deg);
    }
    50% {
      transform: translateX(-50%) rotate(2.5deg) translateY(-0.2px);
    }
    100% {
      transform: translateX(-50%) rotate(-2.5deg);
    }
  }

  @keyframes body-bob {
    0% {
      transform: translateX(-50%) translateY(0);
    }
    50% {
      transform: translateX(-50%) translateY(-0.32px);
    }
    100% {
      transform: translateX(-50%) translateY(0);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .mini-person,
    .mini-head,
    .mini-body,
    .mini-legs::before,
    .mini-legs::after {
      animation: none;
      transform: none;
    }
  }
</style>
