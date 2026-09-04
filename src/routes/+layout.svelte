<script lang="ts">
  import { base } from '$app/paths'
  import { dev } from '$app/environment'
  import { goto, invalidate } from '$app/navigation'
  import { navigating, page } from '$app/stores'
  import { onMount } from 'svelte'
  import { fade } from 'svelte/transition'
  import { canEdit } from '$lib/types/auth'
  import { showAddMemberModal } from '../stores/modals'
  import BottomNav from '../components/bottomNav.svelte'
  import ModalShell from '../components/ui/modalShell.svelte'

  export let data
  export let params: Record<string, string> = {}
  $: routeParamsCount = Object.keys(params).length
  let showTopFade = false
  let profileMenu: HTMLDetailsElement | null = null
  let quickActionMenu: HTMLDetailsElement | null = null
  let showComposeModal = false
  let composeType: 'note' | 'news' = 'note'
  let composeTitle = ''
  let composeBody = ''
  let displayedHeaderCrumb = ''
  let displayedHeaderTitle = ''
  let headerTextVisible = true
  let headerTextSwapTimer: ReturnType<typeof setTimeout> | null = null
  let showBootOverlay = true
  let bootOverlayFadingOut = false

  const HEADER_TEXT_FADE_OUT_MS = 120
  const NEUMO_READY_ATTRIBUTE = 'data-neumo'
  const NEUMO_BOOT_VALUE = 'boot'
  const NEUMO_READY_VALUE = 'ready'
  const NEUMO_OVERLAY_COLOR_FADE_OUT_MS = 280
  const NEUMO_OVERLAY_BLUR_FADE_DELAY_MS = 140
  const NEUMO_OVERLAY_BLUR_FADE_OUT_MS = 520
  const NEUMO_OVERLAY_TOTAL_MS = Math.max(
    NEUMO_OVERLAY_COLOR_FADE_OUT_MS,
    NEUMO_OVERLAY_BLUR_FADE_DELAY_MS + NEUMO_OVERLAY_BLUR_FADE_OUT_MS
  )
  const NEUMO_SHADOW_ACTIVATION_OVERLAP_MS = 180
  const NEUMO_OVERLAY_EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'

  const roleLabel = (role: string | null) => {
    if (role === 'admin') return 'administrador'
    if (role === 'editor') return 'editor'
    if (role === 'viewer') return 'visualizador'
    return null
  }

  const inviteContextText = (family: string | null, role: string | null) => {
    const parts: string[] = []
    if (family) parts.push(`en ${family}`)
    if (role) parts.push(`como ${role}`)
    return parts.length > 0 ? ` ${parts.join(' ')}` : ''
  }

  const isFamilyTreePath = (value: string) => /^\/family\/[^/]+$/.test(value)
  const isFamilyFeedPath = (value: string) => /^\/family\/[^/]+\/feed$/.test(value)
  const isFamilyAdminPath = (value: string) => /^\/family\/[^/]+\/admin$/.test(value)
  const isProfilePath = (value: string) => value === '/profile'
  const isDashboardPath = (value: string) => value === '/dashboard'

  $: ({ supabase, user } = data)
  $: pathname = $page.url.pathname
  $: isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/auth')
  $: showPersistentHeader = Boolean(user || data.profile) && !isAuthRoute
  $: canManageTree = canEdit($page.data.profile ?? data.profile)
  $: availableFamilies = $page.data.availableFamilies ?? data.availableFamilies ?? []
  $: activeFamilyId = $page.data.activeFamilyId ?? data.activeFamilyId ?? null
  $: activeFamily =
    availableFamilies.find((family: { id: string }) => family.id === activeFamilyId) ?? null
  $: activeFamilyName =
    ($page.data.activeFamilyName as string | undefined) ?? activeFamily?.name ?? null
  $: displayName =
    ($page.data.displayName as string | undefined) ?? data.profile?.display_name ?? 'Familiar'
  $: showPendingInvites = Boolean(
    ($page.data.showPendingInvitations as boolean | undefined) ?? data.showPendingInvitations
  )
  $: pendingInvites = Number(
    ($page.data.pendingInvitations as number | undefined) ?? data.pendingInvitations ?? 0
  )
  $: signupNoticeCode = $page.url.searchParams.get('signup_notice')
  $: signupFamily = $page.url.searchParams.get('signup_family')
  $: signupRole = roleLabel($page.url.searchParams.get('signup_role'))
  $: isNavigating = Boolean($navigating)
  $: isFamilyLevel =
    isFamilyTreePath(pathname) || isFamilyFeedPath(pathname) || isFamilyAdminPath(pathname)
  $: isFamilyAdminLevel = isFamilyAdminPath(pathname)
  $: familyBasePath = activeFamilyId ? `/family/${encodeURIComponent(activeFamilyId)}` : null
  $: familyTreeHref = familyBasePath ?? '/dashboard?state=no_family'
  $: familyFeedHref = familyBasePath ? `${familyBasePath}/feed` : '/dashboard?state=no_family'
  $: canEditActiveFamily = Boolean(
    isFamilyAdminLevel && activeFamily && activeFamily.role !== 'viewer'
  )
  $: familySettingsHref = (() => {
    const url = new URL($page.url)
    url.searchParams.set('familySettings', '1')
    return `${url.pathname}${url.search}`
  })()
  $: headerCrumb = isFamilyTreePath(pathname)
    ? 'Árbol'
    : isFamilyFeedPath(pathname)
      ? 'Novedades familiares'
      : isFamilyAdminPath(pathname)
        ? 'Administración'
        : isProfilePath(pathname)
          ? 'Cuenta'
          : isDashboardPath(pathname)
            ? 'Panel personal'
            : 'Panel personal'
  $: headerTitle = isFamilyLevel
    ? activeFamilyName ?? 'Sin familia'
    : isProfilePath(pathname)
      ? displayName
      : `Hola, ${displayName}`
  $: composeAction = `${familyFeedHref}?/createNote`
  $: composeModalTitle = composeType === 'news' ? 'Nueva noticia' : 'Nueva nota'
  $: signupNoticeMessage =
    signupNoticeCode === 'invitation_accepted'
      ? `Tu cuenta está lista. Ya has entrado${inviteContextText(signupFamily, signupRole)}.`
      : signupNoticeCode === 'member_link_already_claimed'
        ? `Tu cuenta se creó correctamente${inviteContextText(
            signupFamily,
            signupRole
          )}, pero ese miembro ya está vinculado a otra cuenta.`
        : null

  $: if (!displayedHeaderCrumb && !displayedHeaderTitle && headerTitle) {
    displayedHeaderCrumb = headerCrumb
    displayedHeaderTitle = headerTitle
  }

  $: {
    const nextTextKey = `${headerCrumb}::${headerTitle}`
    const shownTextKey = `${displayedHeaderCrumb}::${displayedHeaderTitle}`

    if (headerTitle && nextTextKey !== shownTextKey) {
      if (headerTextSwapTimer) clearTimeout(headerTextSwapTimer)
      headerTextVisible = false
      headerTextSwapTimer = setTimeout(() => {
        displayedHeaderCrumb = headerCrumb
        displayedHeaderTitle = headerTitle
        headerTextVisible = true
        headerTextSwapTimer = null
      }, HEADER_TEXT_FADE_OUT_MS)
    }
  }

  function closeDetails(menu: HTMLDetailsElement | null) {
    if (menu) menu.open = false
  }

  function handleMenuToggle(
    activeMenu: HTMLDetailsElement | null,
    otherMenu: HTMLDetailsElement | null
  ) {
    if (activeMenu?.open) closeDetails(otherMenu)
  }

  async function openMemberComposer() {
    closeDetails(quickActionMenu)

    if (!activeFamilyId) return

    if (isFamilyTreePath(pathname)) {
      showAddMemberModal.set(true)
      return
    }

    await goto(`${familyTreeHref}?quickadd=member`)
  }

  function openNoteComposer(noteType: 'note' | 'news') {
    closeDetails(quickActionMenu)

    if (!activeFamilyId) return

    composeType = noteType
    composeTitle = ''
    composeBody = ''
    showComposeModal = true
  }

  function closeComposeModal() {
    showComposeModal = false
    composeTitle = ''
    composeBody = ''
  }

  function handleViewportScroll() {
    showTopFade = window.scrollY > 12
  }

  onMount(() => {
    const root = document.documentElement
    let shadowActivationFrameA = 0
    let shadowActivationFrameB = 0
    let shadowActivationTimer: ReturnType<typeof setTimeout> | null = null
    let hideBootOverlayTimer: ReturnType<typeof setTimeout> | null = null

    // Phase 1: render content with a short fade. Phase 2: activate depth a bit later.
    root.setAttribute(NEUMO_READY_ATTRIBUTE, NEUMO_BOOT_VALUE)
    shadowActivationFrameA = requestAnimationFrame(() => {
      shadowActivationFrameB = requestAnimationFrame(() => {
        bootOverlayFadingOut = true
        hideBootOverlayTimer = setTimeout(() => {
          showBootOverlay = false
        }, NEUMO_OVERLAY_TOTAL_MS)

        shadowActivationTimer = setTimeout(
          () => {
            root.setAttribute(NEUMO_READY_ATTRIBUTE, NEUMO_READY_VALUE)
          },
          Math.max(0, NEUMO_OVERLAY_TOTAL_MS - NEUMO_SHADOW_ACTIVATION_OVERLAP_MS)
        )
      })
    })

    handleViewportScroll()
    window.addEventListener('scroll', handleViewportScroll, { passive: true })

    if (dev && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister()))
        )
        .catch(() => {
          // Ignore SW cleanup failures in local development.
        })
    }

    if (!dev && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register(`${base}/service-worker.js`, { type: 'module' })
        .catch(() => {
          // The app works without SW; ignore registration failures.
        })
    }

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        invalidate('supabase:auth')
      }
    })

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return

      if (profileMenu?.open && !profileMenu.contains(target)) {
        closeDetails(profileMenu)
      }

      if (quickActionMenu?.open && !quickActionMenu.contains(target)) {
        closeDetails(quickActionMenu)
      }
    }

    const handleEscapeClose = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      closeDetails(profileMenu)
      closeDetails(quickActionMenu)
    }

    document.addEventListener('pointerdown', handleDocumentPointerDown)
    document.addEventListener('keydown', handleEscapeClose)

    return () => {
      cancelAnimationFrame(shadowActivationFrameA)
      cancelAnimationFrame(shadowActivationFrameB)
      if (shadowActivationTimer) clearTimeout(shadowActivationTimer)
      if (hideBootOverlayTimer) clearTimeout(hideBootOverlayTimer)
      window.removeEventListener('scroll', handleViewportScroll)
      subscription.unsubscribe()
      document.removeEventListener('pointerdown', handleDocumentPointerDown)
      document.removeEventListener('keydown', handleEscapeClose)
      if (headerTextSwapTimer) clearTimeout(headerTextSwapTimer)
    }
  })
</script>

{#if signupNoticeMessage}
  <div class="signup-notice" role="status">
    {signupNoticeMessage}
  </div>
{/if}

<div
  class="route-progress"
  class:active={isNavigating}
  data-route-params-count={routeParamsCount}
  aria-hidden="true"
></div>

{#if showBootOverlay}
  <div
    class="app-boot-overlay"
    aria-hidden="true"
    style="position:fixed;inset:0;z-index:2205;pointer-events:none;overflow:hidden;"
  >
    <div
      class="app-boot-overlay__color"
      style={`position:absolute;inset:0;background:var(--app-bg, #f1ece4);opacity:${
        bootOverlayFadingOut ? '0' : '1'
      };transition:opacity ${NEUMO_OVERLAY_COLOR_FADE_OUT_MS}ms ${NEUMO_OVERLAY_EASE};`}
    ></div>
    <div
      class="app-boot-overlay__blur"
      style={`position:absolute;inset:0;background:rgba(241,236,228,0.26);opacity:${
        bootOverlayFadingOut ? '0' : '1'
      };backdrop-filter:blur(8px) saturate(0.94);-webkit-backdrop-filter:blur(8px) saturate(0.94);transition:opacity ${NEUMO_OVERLAY_BLUR_FADE_OUT_MS}ms ${NEUMO_OVERLAY_EASE} ${NEUMO_OVERLAY_BLUR_FADE_DELAY_MS}ms;`}
    ></div>
  </div>
{/if}

{#if showPersistentHeader}
  <header class="app-route-header" aria-label="Cabecera principal">
    <div class="app-route-header-shell">
      <div class="app-route-header-layout">
        {#if isFamilyLevel}
          <a
            class="header-side-circle"
            href="/dashboard"
            aria-label="Volver al panel personal"
            data-sveltekit-preload-data="tap"
            data-sveltekit-preload-code="eager"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path d="m15.4 4.6 1.4 1.4L10.21 12l6.59 6-1.4 1.4L7.2 12l8.2-7.4z" />
            </svg>
          </a>
        {:else}
          <details
            class="header-side-circle header-menu header-menu--profile"
            bind:this={profileMenu}
            on:toggle={() => handleMenuToggle(profileMenu, quickActionMenu)}
          >
            <summary aria-label="Abrir menú de perfil">
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M4 9.25h13a1.25 1.25 0 0 0 0-2.5H4a1.25 1.25 0 0 0 0 2.5z" />
                <path d="M4 17.25h9a1.25 1.25 0 0 0 0-2.5H4a1.25 1.25 0 0 0 0 2.5z" />
              </svg>
            </summary>
            <div class="header-dropdown" role="menu">
              <a
                href="/profile"
                role="menuitem"
                data-sveltekit-preload-data="tap"
                data-sveltekit-preload-code="eager"
                on:click={() => closeDetails(profileMenu)}
              >
                Mi cuenta
              </a>
              <a
                href="/admin"
                role="menuitem"
                data-sveltekit-preload-data="tap"
                on:click={() => closeDetails(profileMenu)}
              >
                Crear familia
              </a>
              <form method="POST" action="/profile?/logout">
                <button
                  type="submit"
                  role="menuitem"
                  class="header-dropdown-danger"
                  on:click={() => closeDetails(profileMenu)}
                >
                  Cerrar sesión
                </button>
              </form>
            </div>
          </details>
        {/if}

        <div class="header-main-pill">
          {#if headerTextVisible}
            <div class="header-main-copy">
              <p class="header-crumb" in:fade={{ duration: 80 }} out:fade={{ duration: 70 }}>
                {displayedHeaderCrumb}
              </p>
              <div
                class="header-title-row"
                in:fade={{ duration: 120, delay: 30 }}
                out:fade={{ duration: 90, delay: 20 }}
              >
                <h1>{displayedHeaderTitle}</h1>
                {#if canEditActiveFamily}
                  <a
                    class="header-title-edit"
                    href={familySettingsHref}
                    aria-label={`Editar familia ${displayedHeaderTitle}`}
                    title="Editar familia"
                    data-sveltekit-preload-data="tap"
                    data-sveltekit-preload-code="eager"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d="M4 16.86V20h3.14l9.27-9.27-3.14-3.14L4 16.86zm14.71-8.37a1 1 0 0 0 0-1.41l-1.79-1.79a1 1 0 0 0-1.41 0l-1.4 1.4 3.14 3.14 1.46-1.34z"
                      />
                    </svg>
                  </a>
                {/if}
              </div>
            </div>
          {/if}
        </div>

        {#if isFamilyLevel}
          {#if canManageTree && activeFamilyId}
            <details
              class="header-side-circle header-menu header-menu--quick"
              bind:this={quickActionMenu}
              on:toggle={() => handleMenuToggle(quickActionMenu, profileMenu)}
            >
              <summary aria-label="Abrir acciones rápidas">
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5z" />
                </svg>
              </summary>
              <div class="header-dropdown" role="menu">
                <button type="button" role="menuitem" on:click={openMemberComposer}>
                  Miembro
                </button>
                <button type="button" role="menuitem" on:click={() => openNoteComposer('news')}>
                  Noticia
                </button>
              </div>
            </details>
          {:else}
            <span class="header-side-circle header-side-circle--ghost" aria-hidden="true"></span>
          {/if}
        {:else}
          <a
            class="header-side-circle header-notification-btn"
            href="/admin"
            aria-label="Ir a invitaciones"
            data-sveltekit-preload-data="tap"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M12 3a6 6 0 0 1 6 6v3.63l1.7 2.98A1 1 0 0 1 18.84 17H5.16a1 1 0 0 1-.86-1.39L6 12.63V9a6 6 0 0 1 6-6zm0 18a3 3 0 0 1-2.83-2h5.66A3 3 0 0 1 12 21z"
              />
            </svg>
            {#if showPendingInvites && pendingInvites > 0}
              <span class="header-badge">{pendingInvites}</span>
            {/if}
          </a>
        {/if}
      </div>
    </div>
  </header>
{/if}

<slot />

{#if showPersistentHeader && activeFamilyId}
  <ModalShell
    open={showComposeModal}
    ariaLabel="Cerrar formulario rápido"
    ariaLabelledby="header-compose-title"
    onClose={closeComposeModal}
    size="wide"
  >
    <section class="header-compose-modal">
      <div class="modal-heading">
        <h2 id="header-compose-title">{composeModalTitle}</h2>
        <p class="modal-subtitle">
          Se guardará en <strong>{activeFamilyName ?? 'la familia activa'}</strong>.
        </p>
      </div>

      <form method="POST" action={composeAction} class="header-compose-form modal-form">
        <input type="hidden" name="familyId" value={activeFamilyId} />
        <input type="hidden" name="noteType" value={composeType} />

        <div class="input-wrapper floating-input-wrapper compose-field">
          <input
            id="composeTitle"
            class="modern-input"
            name="title"
            bind:value={composeTitle}
            maxlength="120"
            required
          />
          <label for="composeTitle" class:label-active={composeTitle.length > 0}>Título</label>
        </div>

        <div class="input-wrapper floating-input-wrapper compose-field">
          <textarea
            id="composeBody"
            class="modern-textarea"
            name="body"
            bind:value={composeBody}
            rows="4"
            required
          ></textarea>
          <label for="composeBody" class:label-active={composeBody.length > 0}>Contenido</label>
        </div>

        <div class="header-compose-actions modal-form-actions">
          <button type="submit" class="app-btn app-btn--primary" on:click={closeComposeModal}>
            Guardar
          </button>
        </div>
      </form>
    </section>
  </ModalShell>
{/if}

<div class="viewport-fade viewport-fade-top" class:active={showTopFade} aria-hidden="true"></div>
<div class="viewport-fade viewport-fade-bottom" aria-hidden="true"></div>
{#if user || data.profile}
  <BottomNav />
{/if}

<style lang="scss">
  :global(:root) {
    /*
      Token naming convention (layered):
      1) Foundation literals: raw palette/effects (example: --neu-*, --glass-*)
      2) Semantic tokens: intent-driven UI meaning (example: --text-*, --feedback-*)
      3) Component aliases: localized composition hooks (example: --app-*, --header-*)
      Rule of thumb: prefer semantic tokens in components, reserve literals for foundations.
    */

    /* Foundation: page surfaces, glass and neumorphism */
    --app-bg: radial-gradient(circle at 10% 14%, rgba(235, 223, 204, 0.34), transparent 34%),
      radial-gradient(circle at 86% 10%, rgba(226, 212, 194, 0.34), transparent 30%),
      radial-gradient(circle at 22% 78%, rgba(208, 216, 194, 0.24), transparent 36%), #f1ece4;
    --app-bg-deep: #f1ece4;
    --surface-soft: rgba(255, 255, 255, 0.34);
    --glass-surface: rgba(250, 247, 243, 0.56);
    --glass-border: rgba(236, 226, 212, 0.9);
    --glass-shadow: none;
    --glass-shadow-active: 0 16px 34px rgba(79, 66, 53, 0.13),
      inset 0 1px 0 rgba(255, 255, 255, 0.75);
    --app-glass-panel-bg: rgba(255, 255, 255, 0.05);
    --app-glass-panel-bg-soft: rgba(255, 255, 255, 0.035);
    --app-glass-panel-bg-strong: rgba(255, 255, 255, 0.07);
    --app-glass-panel-border: transparent;
    --app-glass-panel-border-soft: transparent;
    --app-glass-panel-blur: 16px;
    --app-glass-panel-saturate: 1.06;
    --app-glass-menu-bg: var(--app-glass-panel-bg-strong);
    --app-glass-menu-blur: var(--app-glass-panel-blur);
    --app-glass-menu-saturate: var(--app-glass-panel-saturate);
    --app-modal-surface-bg: rgba(239, 232, 222, 0.78);
    --app-glass-panel-shadow: none;
    --app-glass-panel-shadow-active: var(--glass-shadow-active), var(--neu-shadow-out-active);
    --app-glass-panel-shadow-soft: none;
    --app-glass-panel-shadow-soft-active: var(--glass-shadow-active),
      var(--neu-shadow-out-soft-active);
    --app-glass-menu-item-hover-bg: rgba(230, 212, 192, 0.37);
    --app-glass-menu-item-hover-text: #6b4f38;
    --app-glass-menu-item-hover-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5),
      0 5px 10px rgba(103, 79, 56, 0.12);
    --app-glass-menu-item-active-bg: rgba(219, 198, 175, 0.36);
    --app-glass-menu-item-active-shadow: inset 2px 2px 5px rgba(142, 114, 89, 0.22),
      inset -2px -2px 5px rgba(255, 255, 255, 0.72);
    --app-glass-menu-danger-bg: rgba(189, 94, 94, 0.14);
    --app-glass-menu-danger-hover-bg: rgba(189, 94, 94, 0.22);
    --app-glass-menu-danger-hover-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.45),
      0 5px 10px rgba(133, 52, 52, 0.14);
    --app-modal-backdrop-bg: rgba(241, 236, 228, 0.14);
    --app-modal-backdrop-blur: 3px;
    --neu-surface: #efe8de;
    --neu-surface-soft: #f4efe7;
    --neu-light: rgba(255, 255, 255, 0.8);
    --neu-dark: rgba(154, 132, 109, 0.3);
    --neu-shadow-out: none;
    --neu-shadow-out-active: 8px 8px 16px var(--neu-dark), -8px -8px 16px var(--neu-light);
    --neu-shadow-out-soft: none;
    --neu-shadow-out-soft-active: 5px 5px 10px rgba(154, 132, 109, 0.24),
      -5px -5px 10px rgba(255, 255, 255, 0.76);
    --neu-shadow-hover-strong: none;
    --neu-shadow-hover-strong-active: 10px 10px 18px rgba(154, 132, 109, 0.26),
      -10px -10px 18px rgba(255, 255, 255, 0.86);
    --neu-shadow-hover-soft: none;
    --neu-shadow-hover-soft-active: 8px 8px 16px rgba(149, 121, 95, 0.22),
      -8px -8px 16px rgba(255, 255, 255, 0.82);
    --neu-shadow-inset: none;
    --neu-shadow-inset-active: inset 5px 5px 10px rgba(154, 132, 109, 0.24),
      inset -5px -5px 10px rgba(255, 255, 255, 0.76);
    --app-btn-active-shadow: none;
    --app-btn-active-shadow-active: inset 3px 3px 7px rgba(154, 132, 109, 0.18),
      inset -3px -3px 7px rgba(255, 255, 255, 0.72);
    --app-btn-disabled-shadow: none;
    --app-btn-disabled-shadow-active: inset 2px 2px 5px rgba(154, 132, 109, 0.15),
      inset -2px -2px 5px rgba(255, 255, 255, 0.72);
    --app-card-soft-shadow: none;
    --app-card-soft-shadow-active: inset 2px 2px 5px rgba(149, 121, 95, 0.1),
      inset -2px -2px 5px rgba(255, 255, 255, 0.68);
    --app-card-soft-raised-shadow: none;
    --app-card-soft-raised-shadow-active: 3px 3px 7px rgba(154, 132, 109, 0.14),
      -3px -3px 7px rgba(255, 255, 255, 0.7);
    --app-chip-interactive-shadow: none;
    --app-chip-interactive-shadow-active: 3px 3px 8px rgba(149, 121, 95, 0.12),
      -3px -3px 8px rgba(255, 255, 255, 0.72);
    --app-chip-interactive-active-shadow: none;
    --app-chip-interactive-active-shadow-active: inset 2px 2px 5px rgba(149, 121, 95, 0.16),
      inset -2px -2px 5px rgba(255, 255, 255, 0.7);
    --app-stat-item-shadow: none;
    --app-stat-item-shadow-active: inset 2px 2px 5px rgba(149, 121, 95, 0.1),
      inset -2px -2px 5px rgba(255, 255, 255, 0.7);
    --app-settings-trigger-shadow: none;
    --app-settings-trigger-shadow-active: 4px 4px 10px rgba(149, 121, 95, 0.14),
      -4px -4px 10px rgba(255, 255, 255, 0.6);
    --app-settings-trigger-active-shadow: none;
    --app-settings-trigger-active-shadow-active: inset 3px 3px 7px rgba(149, 121, 95, 0.2),
      inset -3px -3px 7px rgba(255, 255, 255, 0.75);
    --app-bottom-nav-current-shadow: none;
    --app-bottom-nav-current-shadow-active: inset 3px 3px 7px rgba(154, 132, 109, 0.22),
      inset -3px -3px 7px rgba(255, 255, 255, 0.76);
    /* Semantic: text, accents, controls and warm surfaces */
    --text-main: #2e2823;
    --text-muted: #544b43;
    --text-soft: #675c53;
    --brand: #806a54;
    --brand-soft: rgba(128, 106, 84, 0.14);
    --accent-sky: #89725f;
    --accent-clay: #9b7158;
    --accent-plum: #716453;
    --field-border: #cbbca9;
    --field-bg: #fcfaf7;
    --control-bg: #f2ece4;
    --control-bg-focus: #f7f2ea;
    --control-bg-error-soft: #f8efec;
    --control-bg-disabled: #edf1f5;
    --control-text-disabled: #6b7280;
    --control-border-disabled: #cdd5df;
    --surface-warm-elevated: #efe7dc;
    --surface-avatar: #f3ede5;
    --text-main-strong: #1f1f1f;
    --text-warm-strong: #8a4a22;
    --text-warm-chip: #6f4f39;
    --chip-warm-bg: rgba(236, 221, 203, 0.7);
    --chip-warm-bg-strong: rgba(236, 221, 203, 0.74);
    --chip-warm-bg-hover: rgba(230, 212, 192, 0.78);
    --chip-warm-bg-hover-strong: rgba(230, 212, 192, 0.8);
    /* Semantic: feedback states (success/warning/error) */
    --text-success: #166534;
    --text-success-strong: #16a31a;
    --text-warning: #9a3412;
    --text-error: #dc2626;
    --text-error-strong: #b91c1c;
    --feedback-success-text: var(--text-success-strong);
    --feedback-success-soft-text: var(--text-success);
    --feedback-error-text: var(--text-error);
    --feedback-error-strong-text: var(--text-error-strong);
    --text-on-accent: #ffffff;
    --feedback-success-border: rgba(87, 154, 113, 0.3);
    --feedback-error-border: rgba(204, 107, 107, 0.35);
    --feedback-warning-bg: #fff3cd;
    --feedback-warning-text: #5f4500;
    --feedback-warning-border: #f6df96;
    --feedback-warning-shadow: 0 10px 24px rgba(36, 23, 0, 0.13);

    /* Component aliases: recurring interaction surfaces */
    --fab-surface-bg: #e0e0e0;
    --fab-icon-color: #333333;
    --fab-shadow-rest: 6px 6px 12px #bebebe, -6px -6px 12px #ffffff;
    --chip-surface-bg: rgba(255, 255, 255, 0.7);
    --chip-surface-border: rgba(255, 255, 255, 0.82);
    --chip-surface-empty-bg: rgba(255, 249, 241, 0.5);
    --surface-corner-radius: 9px;

    /* Semantic: focus rings and shadow helpers */
    --focus-ring-soft: 0 0 0 2px rgba(156, 123, 95, 0.18);
    --focus-ring-soft-strong: 0 0 0 2px rgba(149, 121, 95, 0.52);
    --focus-ring-error: 0 0 0 2px rgba(220, 38, 38, 0.15);
    --focus-ring-error-strong: 0 0 0 2px rgba(188, 70, 70, 0.55);
    --focus-ring-error-pulse: 0 0 0 5px rgba(188, 70, 70, 0.2);
    --focus-ring-error-start: 0 0 0 0 rgba(188, 70, 70, 0.28);
    --focus-ring-warm: 0 0 0 4px rgba(198, 171, 139, 0.4);
    --shadow-soft-xs: 0 1px 2px rgba(149, 121, 95, 0.09);
    --shadow-soft-sm: 0 2px 5px rgba(149, 121, 95, 0.12);

    /* Semantic: compact spacing core (7 sizes) */
    --space-0: 2px;
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 20px;
    --space-6: 24px;

    /* Semantic: radii, motion and typography scales */
    --radius-lg: 16px;
    --radius-md: 12px;
    --radius-pill: 999px;
    --radius-sm: 8px;
    --radius-control: 10px;
    --radius-card: 14px;
    --radius-xl: 18px;
    --radius-round: 50%;
    --page-header-content-gap: 30px;
    --motion-standard: cubic-bezier(0.22, 1, 0.36, 1);
    --dur-fast: 0.18s;
    --dur-base: 0.2s;
    --dur-ui: 0.22s;
    --dur-slow: 0.24s;
    --neumo-shadow-transition-ease: cubic-bezier(0.16, 0.84, 0.26, 1.2);
    --neumo-overlay-blur-strength: 8px;
    --neumo-shadow-transition-duration: 0.42s;
    --fs-2xs: clamp(0.78rem, 0.74rem + 0.15vw, 0.84rem);
    --fs-xs: clamp(0.84rem, 0.8rem + 0.2vw, 0.9rem);
    --fs-sm: clamp(0.9rem, 0.86rem + 0.2vw, 0.98rem);
    --fs-md: clamp(1rem, 0.96rem + 0.2vw, 1.05rem);
    --fs-lg: clamp(1.12rem, 1.04rem + 0.35vw, 1.28rem);
    --fs-xl: clamp(1.35rem, 1.18rem + 0.8vw, 1.8rem);
    --lh-tight: 1.2;
    --lh-copy: 1.5;
    --nav-dock-shadow: none;
    --nav-dock-shadow-active: 0 14px 24px rgba(88, 71, 56, 0.15),
      inset 0 1px 0 rgba(255, 255, 255, 0.52);

    /* Component aliases: family-tree rendering */
    --tree-node-shadow: none;
    --tree-node-shadow-active: 0 14px 22px rgba(88, 69, 52, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.84);
    --tree-line-main: #85705f;
    --tree-line-secondary: #7f5a43;
    --tree-line-previous: #b38261;
    --tree-line-drop-shadow: drop-shadow(0 1px 2px rgba(255, 255, 255, 0.72));
    --page-shell-top-mobile: 24px;
    --page-shell-top-desktop: 30px;
    --page-shell-inline-mobile: 14px;
    --page-shell-inline-desktop: 18px;
    --page-content-max: 920px;
    --header-dropdown-offset-desktop: 42px;
    --header-dropdown-offset-mobile: 46px;
  }

  :global(html[data-neumo='ready']) {
    --glass-shadow: var(--glass-shadow-active);
    --neu-shadow-out: var(--neu-shadow-out-active);
    --neu-shadow-out-soft: var(--neu-shadow-out-soft-active);
    --neu-shadow-hover-strong: var(--neu-shadow-hover-strong-active);
    --neu-shadow-hover-soft: var(--neu-shadow-hover-soft-active);
    --neu-shadow-inset: var(--neu-shadow-inset-active);
    --app-btn-active-shadow: var(--app-btn-active-shadow-active);
    --app-btn-disabled-shadow: var(--app-btn-disabled-shadow-active);
    --app-card-soft-shadow: var(--app-card-soft-shadow-active);
    --app-card-soft-raised-shadow: var(--app-card-soft-raised-shadow-active);
    --app-chip-interactive-shadow: var(--app-chip-interactive-shadow-active);
    --app-chip-interactive-active-shadow: var(--app-chip-interactive-active-shadow-active);
    --app-stat-item-shadow: var(--app-stat-item-shadow-active);
    --app-settings-trigger-shadow: var(--app-settings-trigger-shadow-active);
    --app-settings-trigger-active-shadow: var(--app-settings-trigger-active-shadow-active);
    --app-bottom-nav-current-shadow: var(--app-bottom-nav-current-shadow-active);
    --nav-dock-shadow: var(--nav-dock-shadow-active);
    --tree-node-shadow: var(--tree-node-shadow-active);
    --app-glass-panel-shadow: var(--app-glass-panel-shadow-active);
    --app-glass-panel-shadow-soft: var(--app-glass-panel-shadow-soft-active);
  }

  :global(html[data-neumo='boot']) {
    --neu-shadow-hover-strong: none;
    --neu-shadow-hover-soft: none;
  }

  :global(html),
  :global(body) {
    min-height: 100%;
  }

  :global(body) {
    position: relative;
    margin: 0;
    background: var(--app-bg-deep);
    color: var(--text-main);
    font-family: 'Avenir Next', 'Gill Sans', 'Trebuchet MS', 'Noto Sans', sans-serif;
    font-size: 16px;
    line-height: var(--lh-copy);
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  :global(*) {
    box-sizing: border-box;
  }

  :global(a),
  :global(button),
  :global(summary),
  :global(input),
  :global(textarea),
  :global(select),
  :global(label) {
    -webkit-tap-highlight-color: transparent;
  }

  :global(:focus-visible) {
    outline: 2px solid var(--brand);
    outline-offset: 2px;
  }

  :global(button:focus-visible:not(:disabled)) {
    outline: 2px solid var(--brand);
    outline-offset: 2px;
  }

  :global(button:hover:not(:disabled):not([aria-disabled='true'])) {
    transform: none !important;
  }

  :global(.app-glass-surface) {
    background: var(--app-glass-local-bg, var(--app-glass-panel-bg));
    border: none;
    backdrop-filter: blur(var(--app-glass-panel-blur)) saturate(var(--app-glass-panel-saturate));
    -webkit-backdrop-filter: blur(var(--app-glass-panel-blur))
      saturate(var(--app-glass-panel-saturate));
    box-shadow: var(--app-glass-local-shadow, var(--app-glass-panel-shadow));
    transition:
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease),
      background-color var(--dur-ui) var(--motion-standard),
      opacity var(--dur-ui) var(--motion-standard);
  }

  :global(.app-glass-surface-soft) {
    --app-glass-local-bg: var(--app-glass-panel-bg-soft);
    --app-glass-local-shadow: var(--app-glass-panel-shadow-soft);
  }

  :global(button:disabled),
  :global(button[aria-disabled='true']) {
    cursor: not-allowed;
  }

  :global(button:disabled:hover),
  :global(button:disabled:active),
  :global(button[aria-disabled='true']:hover),
  :global(button[aria-disabled='true']:active) {
    scale: 1;
    transform: none;
  }

  :global(button:disabled:focus-visible),
  :global(button[aria-disabled='true']:focus-visible) {
    outline: none;
  }

  :global(.glass-panel) {
    background: var(--neu-surface);
    border: none;
    border-radius: var(--radius-lg);
    box-shadow: var(--neu-shadow-out);
    transition: box-shadow var(--neumo-shadow-transition-duration)
      var(--neumo-shadow-transition-ease);
  }

  :global(.app-btn) {
    position: relative;
    overflow: visible;
    min-height: 44px;
    padding: 0.62rem 0.9rem;
    border-radius: var(--radius-md);
    border: none;
    background: var(--neu-surface-soft);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    text-decoration: none;
    font-size: var(--fs-sm);
    line-height: 1;
    font-weight: 700;
    letter-spacing: 0.01em;
    cursor: pointer;
    box-shadow: var(--neu-shadow-out-soft);
    transition:
      transform var(--dur-ui) var(--motion-standard),
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease),
      background-color var(--dur-ui) var(--motion-standard),
      border-color var(--dur-ui) var(--motion-standard),
      color var(--dur-ui) var(--motion-standard);
  }

  :global(.app-btn:hover:not(:disabled):not([aria-disabled='true'])) {
    transform: none;
    box-shadow: var(--neu-shadow-hover-strong);
  }

  :global(.app-btn:active:not(:disabled):not([aria-disabled='true'])) {
    transform: translateY(0);
    box-shadow: var(--app-btn-active-shadow);
  }

  :global(.app-btn--primary) {
    background: #dbc8b2;
    color: #4b3a2d;
  }

  :global(.app-btn--primary:hover:not(:disabled):not([aria-disabled='true'])) {
    background: #e3d2be;
  }

  :global(.app-btn--secondary) {
    background: #f4eee6;
    color: var(--text-main);
  }

  :global(.app-btn--danger) {
    background: #e3c8c4;
    color: #7a2f2f;
  }

  :global(.app-btn--danger:hover:not(:disabled):not([aria-disabled='true'])) {
    background: #ebd4d1;
  }

  :global(.app-btn--ghost) {
    background: var(--control-bg);
    color: var(--brand);
  }

  :global(.app-btn:disabled),
  :global(.app-btn[aria-disabled='true']) {
    opacity: 1;
    color: #7f7366;
    background: #e3dbcf;
    box-shadow: var(--app-btn-disabled-shadow);
  }

  :global(.app-btn:disabled:hover),
  :global(.app-btn[aria-disabled='true']:hover) {
    background: #e3dbcf;
    box-shadow: var(--app-btn-disabled-shadow);
  }

  :global(.app-page-header) {
    position: sticky;
    top: 0;
    z-index: 10;
    pointer-events: none;
    padding: max(10px, env(safe-area-inset-top)) 16px 4px;
    margin-bottom: var(--page-header-content-gap, 30px);
  }

  :global(.app-page-header-shell) {
    pointer-events: auto;
    width: min(1040px, 100%);
    margin: 0 auto;
  }

  :global(.app-page-header-content) {
    width: 100%;
    padding: 12px 18px 11px;
    display: flex;
    flex-direction: column;
  }

  :global(.app-page-header-content h1) {
    margin: 0;
    font-size: var(--fs-xl);
    line-height: var(--lh-tight);
    letter-spacing: 0.012em;
    color: #4e392d;
  }

  :global(.app-page-header-note) {
    margin: 0.35rem 0 0;
    color: var(--text-muted);
    font-size: var(--fs-sm);
    line-height: var(--lh-copy);
    word-break: break-word;
  }

  :global(.app-card-soft) {
    border-radius: var(--radius-control);
    background: rgba(255, 255, 255, 0.5);
    box-shadow: var(--app-card-soft-shadow);
    transition: box-shadow var(--neumo-shadow-transition-duration)
      var(--neumo-shadow-transition-ease);
  }

  :global(.app-card-soft-raised) {
    border-radius: var(--radius-control);
    background: rgba(255, 255, 255, 0.52);
    box-shadow: var(--app-card-soft-raised-shadow);
    transition: box-shadow var(--neumo-shadow-transition-duration)
      var(--neumo-shadow-transition-ease);
  }

  :global(.app-chip) {
    border: none;
    border-radius: var(--radius-pill);
    font-size: var(--fs-2xs);
    font-weight: 600;
    min-height: 30px;
    padding: 0.28rem 0.62rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.3rem;
  }

  :global(.app-chip--static) {
    color: #5e4b3c;
    background: rgba(168, 132, 101, 0.18);
  }

  :global(.app-chip--accent) {
    color: #6f4a2e;
    background: rgba(205, 140, 92, 0.25);
  }

  :global(.app-chip--interactive) {
    cursor: pointer;
    text-decoration: none;
    color: var(--text-main);
    background: #f3eadf;
    box-shadow: var(--app-chip-interactive-shadow);
    transition:
      transform var(--dur-base) var(--motion-standard),
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease),
      background-color var(--dur-base) var(--motion-standard),
      color var(--dur-base) var(--motion-standard);
  }

  :global(.app-chip--interactive:hover) {
    transform: none;
    background: #f7efe6;
    box-shadow: var(--neu-shadow-hover-soft);
  }

  :global(.app-chip--interactive.active),
  :global(.app-chip--interactive[aria-pressed='true']) {
    background: #e9dccd;
    box-shadow: var(--app-chip-interactive-active-shadow);
  }

  :global(.app-stat-grid) {
    display: grid;
    gap: 8px;
  }

  :global(.app-stat-item) {
    margin: 0;
    padding: 0.48rem 0.55rem;
    border-radius: var(--radius-control);
    background: rgba(255, 255, 255, 0.48);
    box-shadow: var(--app-stat-item-shadow);
    display: flex;
    flex-direction: column;
    gap: 2px;
    transition: box-shadow var(--neumo-shadow-transition-duration)
      var(--neumo-shadow-transition-ease);
  }

  :global(.app-stat-item strong) {
    font-size: var(--fs-md);
    line-height: 1;
    color: #5a402d;
  }

  :global(.app-stat-item span) {
    color: var(--text-muted);
    font-size: var(--fs-2xs);
  }

  :global(.app-autocomplete-suggestions) {
    position: absolute;
    top: 110%;
    left: 0;
    right: 0;
    margin: 0;
    padding: 0;
    list-style: none;
    max-height: 180px;
    overflow-y: auto;
    border-radius: var(--radius-md);
    border: none;
    background: var(--app-glass-menu-bg);
    backdrop-filter: blur(var(--app-glass-menu-blur)) saturate(var(--app-glass-menu-saturate));
    -webkit-backdrop-filter: blur(var(--app-glass-menu-blur))
      saturate(var(--app-glass-menu-saturate));
    will-change: backdrop-filter;
    box-shadow: var(--app-glass-panel-shadow-soft);
    z-index: 10;
  }

  :global(.app-autocomplete-suggestions li) {
    padding: 10px 16px;
    cursor: pointer;
    transition:
      background-color var(--dur-base) var(--motion-standard),
      color var(--dur-base) var(--motion-standard);
  }

  :global(.app-autocomplete-suggestions li:hover),
  :global(.app-autocomplete-suggestions li.active) {
    background: var(--app-glass-menu-item-hover-bg);
    color: var(--text-warm-strong);
  }

  :global(.app-autocomplete-suggestions li button) {
    width: 100%;
    min-height: 38px;
    padding: 0;
    border: none;
    background: none;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  :global(.app-suggested-chip) {
    min-height: 30px;
    padding: 4px 10px;
    border: 1px dashed rgba(156, 90, 45, 0.45);
    border-radius: var(--radius-pill);
    background: rgba(255, 243, 228, 0.78);
    font-size: var(--fs-xs);
    color: #7e4520;
    cursor: pointer;
    transition: background-color var(--dur-base) var(--motion-standard);
  }

  :global(.app-suggested-chip:hover) {
    background: rgba(249, 227, 203, 0.88);
  }

  :global(.app-settings-trigger) {
    width: 38px;
    min-width: 38px;
    min-height: 38px;
    padding: 8px;
    border: none;
    border-radius: 12px;
    background: var(--surface-warm-elevated);
    color: var(--text-main-strong);
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: var(--app-settings-trigger-shadow);
    transition:
      transform var(--dur-base) var(--motion-standard),
      background-color var(--dur-base) var(--motion-standard),
      color var(--dur-base) var(--motion-standard),
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease);
  }

  :global(.app-settings-trigger svg) {
    display: block;
    width: 18px;
    height: 18px;
    fill: currentColor;
    margin: 0 auto;
  }

  :global(.app-settings-trigger:hover:not(:disabled):not([aria-disabled='true'])) {
    background: #f3ece2;
    color: #111111;
    transform: none;
    box-shadow: var(--neu-shadow-hover-strong);
  }

  :global(.app-settings-trigger.active),
  :global(.app-settings-trigger[aria-pressed='true']) {
    background: #ebe1d4;
    color: #6c3d20;
    box-shadow: var(--app-settings-trigger-active-shadow);
  }

  :global(.app-bottom-nav) {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :global(.app-bottom-nav .app-bottom-nav-link) {
    position: relative;
    text-decoration: none;
    color: #5b4635;
    background: var(--neu-surface-soft);
    box-shadow: var(--neu-shadow-out-soft);
    transition:
      transform var(--dur-base) var(--motion-standard),
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease),
      background-color var(--dur-base) var(--motion-standard),
      color var(--dur-base) var(--motion-standard);
  }

  :global(.app-bottom-nav .app-bottom-nav-link:hover) {
    transform: none;
    box-shadow: var(--neu-shadow-hover-strong);
  }

  :global(.app-bottom-nav .app-bottom-nav-link[aria-current='page']) {
    color: #795f49;
    background: #e6d8c8;
    box-shadow: var(--app-bottom-nav-current-shadow);
  }

  :global(.glass-panel),
  :global(.app-btn),
  :global(.app-card-soft),
  :global(.app-card-soft-raised),
  :global(.app-chip--interactive),
  :global(.app-stat-item),
  :global(.app-settings-trigger),
  :global(.app-bottom-nav-pill),
  :global(.app-bottom-nav-link),
  :global(.header-main-pill),
  :global(.header-side-circle),
  :global(.header-title-edit),
  :global(.header-dropdown),
  :global(.surface-wrapper),
  :global(.admin-section),
  :global(.preview-card),
  :global(.notes-card),
  :global(.notes-card li),
  :global(.add-family-member-button),
  :global(.empty-tree-message),
  :global(.modern-input),
  :global(.modern-textarea),
  :global(select) {
    transition:
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease),
      filter var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease),
      background-color var(--dur-ui) var(--motion-standard),
      color var(--dur-ui) var(--motion-standard),
      transform var(--dur-ui) var(--motion-standard);
  }

  :global(html[data-neumo='boot'] .glass-panel),
  :global(html[data-neumo='boot'] .app-btn),
  :global(html[data-neumo='boot'] .app-card-soft),
  :global(html[data-neumo='boot'] .app-card-soft-raised),
  :global(html[data-neumo='boot'] .app-chip--interactive),
  :global(html[data-neumo='boot'] .app-stat-item),
  :global(html[data-neumo='boot'] .app-settings-trigger),
  :global(html[data-neumo='boot'] .app-bottom-nav-pill),
  :global(html[data-neumo='boot'] .app-bottom-nav-link),
  :global(html[data-neumo='boot'] .header-main-pill),
  :global(html[data-neumo='boot'] .header-side-circle),
  :global(html[data-neumo='boot'] .header-title-edit),
  :global(html[data-neumo='boot'] .header-dropdown),
  :global(html[data-neumo='boot'] .surface-wrapper),
  :global(html[data-neumo='boot'] .admin-section),
  :global(html[data-neumo='boot'] .preview-card),
  :global(html[data-neumo='boot'] .notes-card),
  :global(html[data-neumo='boot'] .notes-card li),
  :global(html[data-neumo='boot'] .add-family-member-button),
  :global(html[data-neumo='boot'] .empty-tree-message),
  :global(html[data-neumo='boot'] .modern-input),
  :global(html[data-neumo='boot'] .modern-textarea),
  :global(html[data-neumo='boot'] select) {
    box-shadow: none !important;
    filter: none !important;
  }

  .app-boot-overlay__color,
  .app-boot-overlay__blur {
    will-change: opacity;
  }

  .app-boot-overlay__blur {
    /* Keep CSS variable support for future tuning when full stylesheet is loaded. */
    backdrop-filter: blur(var(--neumo-overlay-blur-strength, 8px)) saturate(0.94);
    -webkit-backdrop-filter: blur(var(--neumo-overlay-blur-strength, 8px)) saturate(0.94);
  }

  :global(.page-shell) {
    width: min(1040px, 100%);
    margin: 0 auto;
    padding: max(var(--page-shell-top-mobile), env(safe-area-inset-top))
      var(--page-shell-inline-mobile) max(20px, env(safe-area-inset-bottom));
  }

  @media (min-width: 760px) {
    :global(.page-shell) {
      padding-top: max(var(--page-shell-top-desktop), env(safe-area-inset-top));
      padding-left: var(--page-shell-inline-desktop);
      padding-right: var(--page-shell-inline-desktop);
    }
  }

  :global(.app-text-link) {
    color: #7a4f35;
    text-decoration: none;
    font-weight: 600;
  }

  :global(.app-text-link:hover) {
    text-decoration: underline;
  }

  :global(.floating-input-wrapper) {
    position: relative;
    display: flex;
  }

  :global(.floating-input-wrapper .modern-input) {
    width: 100%;
    height: 40px;
    padding: 0.6rem 0.75rem 0.4rem;
    border: none;
    border-radius: var(--radius-control);
    background: var(--control-bg);
    font-size: var(--fs-md);
    transition:
      border-color var(--dur-base),
      box-shadow var(--dur-base);
    box-shadow: var(--neu-shadow-inset);
    color: var(--text-main);
  }

  :global(.floating-input-wrapper .modern-input[type='date']:not(:focus)) {
    color: transparent;
  }

  :global(.floating-input-wrapper .modern-input[type='date']:open),
  :global(.floating-input-wrapper .modern-input[type='date']:has(+ label.label-active)) {
    color: var(--text-muted);
  }

  :global(.floating-input-wrapper .modern-input::-webkit-calendar-picker-indicator) {
    filter: invert(38%) brightness(95%) contrast(80%);
  }

  :global(.floating-input-wrapper .modern-input:focus) {
    outline: none;
    box-shadow: var(--neu-shadow-inset), var(--focus-ring-soft);
    background: var(--control-bg-focus);
  }

  :global(.floating-input-wrapper .modern-input:focus),
  :global(.floating-input-wrapper .modern-input:valid) {
    color: var(--text-main);
  }

  :global(.floating-input-wrapper .modern-input:disabled) {
    cursor: not-allowed;
    opacity: 0.7;
  }

  :global(.floating-input-wrapper label) {
    position: absolute;
    left: 0.5rem;
    top: 0.5rem;
    padding: 0 6px;
    color: var(--text-soft);
    font-size: var(--fs-md);
    pointer-events: none;
    background: transparent;
    transition:
      0.2s cubic-bezier(0.4, 0, 0.2, 1) transform,
      0.2s cubic-bezier(0.4, 0, 0.2, 1) font-size,
      0.2s cubic-bezier(0.4, 0, 0.2, 1) color,
      0.2s cubic-bezier(0.4, 0, 0.2, 1) top,
      0.2s cubic-bezier(0.4, 0, 0.2, 1) background;
  }

  :global(.floating-input-wrapper .modern-input:focus + label),
  :global(.floating-input-wrapper .modern-input[type='date']:open + label),
  :global(.floating-input-wrapper label.label-active) {
    top: 2px;
    left: 12px;
    font-size: var(--fs-2xs);
    color: var(--brand);
    background: var(--field-bg);
    transform: translateY(-60%);
    padding: 0 6px;
    border-radius: 6px;
  }

  :global(.floating-input-wrapper .modern-input:valid:not(:focus) + label.label-active) {
    color: #4d8a73;
  }

  :global(.reveal-fade-up) {
    opacity: 1;
    transform: translateY(0);
    animation: none;
  }

  :global(.reveal-delay-1) {
    animation-delay: 0s;
  }

  :global(.reveal-delay-2) {
    animation-delay: 0s;
  }

  :global(.reveal-delay-3) {
    animation-delay: 0s;
  }

  :global(.hover-lift) {
    transition:
      transform var(--dur-ui) var(--motion-standard),
      box-shadow var(--dur-ui) var(--motion-standard),
      border-color var(--dur-ui) var(--motion-standard);
  }

  :global(.hover-lift:hover) {
    transform: none;
    box-shadow: var(--neu-shadow-hover-strong);
  }

  @keyframes reveal-fade-up {
    from {
      opacity: 0.96;
      transform: translateY(3px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  :global(.floating-input-wrapper .modern-input:user-invalid:not(:focus) + label.label-active) {
    color: var(--feedback-error-text);
  }

  :global(.floating-input-wrapper .modern-input:user-invalid:not(:focus)) {
    border-color: var(--feedback-error-text);
    box-shadow: var(--focus-ring-error);
    background: #fff5f5;
  }

  :global(.modern-input:user-invalid:not(:focus)) {
    border-color: var(--feedback-error-text);
    box-shadow: var(--focus-ring-error);
    background: #fff5f5;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(*) {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }

    .viewport-fade {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }

    .app-boot-overlay__blur {
      backdrop-filter: none;
      -webkit-backdrop-filter: none;
    }
  }

  .viewport-fade {
    position: fixed;
    left: 0;
    right: 0;
    pointer-events: none;
    z-index: 9;
    backdrop-filter: blur(6px) saturate(0.94);
    -webkit-backdrop-filter: blur(6px) saturate(0.94);
    overflow: hidden;
  }

  .viewport-fade-top {
    top: 0;
    height: max(86px, calc(env(safe-area-inset-top) + 68px));
    opacity: 0;
    transform: translateY(-4px);
    transition:
      opacity 0.24s var(--motion-standard),
      transform 0.24s var(--motion-standard);
    background: linear-gradient(
      to bottom,
      rgba(241, 236, 228, 0.54) 0%,
      rgba(241, 236, 228, 0.3) 46%,
      rgba(241, 236, 228, 0.1) 78%,
      rgba(241, 236, 228, 0) 100%
    );
    -webkit-mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.98) 0%,
      rgba(0, 0, 0, 0.78) 45%,
      rgba(0, 0, 0, 0.34) 78%,
      rgba(0, 0, 0, 0) 100%
    );
    mask-image: linear-gradient(
      to bottom,
      rgba(0, 0, 0, 0.98) 0%,
      rgba(0, 0, 0, 0.78) 45%,
      rgba(0, 0, 0, 0.34) 78%,
      rgba(0, 0, 0, 0) 100%
    );
  }

  .viewport-fade-top.active {
    opacity: 1;
    transform: translateY(0);
  }

  .viewport-fade-bottom {
    bottom: 0;
    height: max(90px, calc(env(safe-area-inset-bottom) + 74px));
    background: linear-gradient(
      to top,
      rgba(241, 236, 228, 0.56) 0%,
      rgba(241, 236, 228, 0.3) 40%,
      rgba(241, 236, 228, 0.1) 72%,
      rgba(241, 236, 228, 0) 100%
    );
    -webkit-mask-image: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.98) 0%,
      rgba(0, 0, 0, 0.78) 42%,
      rgba(0, 0, 0, 0.28) 74%,
      rgba(0, 0, 0, 0) 100%
    );
    mask-image: linear-gradient(
      to top,
      rgba(0, 0, 0, 0.98) 0%,
      rgba(0, 0, 0, 0.78) 42%,
      rgba(0, 0, 0, 0.28) 74%,
      rgba(0, 0, 0, 0) 100%
    );
  }

  .signup-notice {
    position: fixed;
    top: max(10px, env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    max-width: min(92vw, 680px);
    padding: 10px 14px;
    border-radius: var(--radius-md);
    background: var(--feedback-warning-bg);
    color: var(--feedback-warning-text);
    border: 1px solid var(--feedback-warning-border);
    box-shadow: var(--feedback-warning-shadow);
    font-size: var(--fs-sm);
    line-height: 1.35;
    text-align: center;
  }

  .app-route-header {
    --header-icon-shadow: 2px 2px 6px rgba(149, 121, 95, 0.14),
      -2px -2px 6px rgba(255, 255, 255, 0.72);
    --header-icon-shadow-hover: 3px 3px 7px rgba(149, 121, 95, 0.17),
      -3px -3px 7px rgba(255, 255, 255, 0.74);
    --header-icon-shadow-active: inset 2px 2px 5px rgba(149, 121, 95, 0.22),
      inset -2px -2px 5px rgba(255, 255, 255, 0.74);
    --header-menu-open-shadow: inset 3px 3px 7px rgba(154, 132, 109, 0.2),
      inset -3px -3px 7px rgba(255, 255, 255, 0.75);
    --header-menu-open-hover-shadow: inset 4px 4px 9px rgba(154, 132, 109, 0.24),
      inset -4px -4px 9px rgba(255, 255, 255, 0.8);
    --header-badge-shadow: 0 3px 7px rgba(122, 49, 30, 0.35);
    position: sticky;
    top: 0;
    z-index: 14;
    padding: max(12px, env(safe-area-inset-top)) 26px 12px;
    pointer-events: none;
  }

  .app-route-header-shell {
    width: min(1080px, 100%);
    margin: 0 auto;
    pointer-events: auto;
  }

  .app-route-header-layout {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 22px;
  }

  .header-main-pill {
    min-height: 72px;
    border-radius: 999px;
    background: var(--app-glass-panel-bg);
    border: none;
    backdrop-filter: blur(var(--app-glass-panel-blur)) saturate(var(--app-glass-panel-saturate));
    -webkit-backdrop-filter: blur(var(--app-glass-panel-blur))
      saturate(var(--app-glass-panel-saturate));
    box-shadow: var(--app-glass-panel-shadow);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
    text-align: center;
    padding: 10px 34px;
  }

  .header-main-copy {
    min-height: 46px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 4px;
  }

  .header-main-pill h1 {
    margin: 0;
    font-size: clamp(1.08rem, 1.03rem + 0.45vw, 1.34rem);
    line-height: var(--lh-tight);
    letter-spacing: 0.01em;
    color: var(--text-main);
  }

  .header-title-row {
    min-height: 34px;
    display: flex;
    position: relative;
    width: fit-content;
    margin-inline: auto;
    align-items: center;
    justify-content: center;
  }

  .header-title-edit {
    width: 28px;
    height: 28px;
    position: absolute;
    left: calc(100% + 14px);
    top: 50%;
    transform: translateY(-50%);
    border-radius: var(--radius-pill);
    border: none;
    background: transparent;
    color: var(--text-soft);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-decoration: none;
    box-shadow: var(--header-icon-shadow);
    transition:
      color var(--dur-fast) var(--motion-standard),
      background-color var(--dur-fast) var(--motion-standard),
      box-shadow var(--dur-fast) var(--motion-standard);
  }

  .header-title-edit:hover {
    color: var(--text-main);
    background: transparent;
    box-shadow: var(--header-icon-shadow-hover);
  }

  .header-title-edit:active {
    background: transparent;
    box-shadow: var(--header-icon-shadow-active);
  }

  .header-title-edit svg {
    width: 14px;
    height: 14px;
    fill: currentColor;
    display: block;
  }

  .header-crumb {
    margin: 0;
    font-size: var(--fs-2xs);
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
  }

  .header-side-circle {
    width: 52px;
    height: 52px;
    border-radius: var(--radius-pill);
    border: none;
    background: var(--app-glass-panel-bg-soft);
    border: none;
    backdrop-filter: blur(var(--app-glass-panel-blur)) saturate(var(--app-glass-panel-saturate));
    -webkit-backdrop-filter: blur(var(--app-glass-panel-blur))
      saturate(var(--app-glass-panel-saturate));
    box-shadow: var(--app-glass-panel-shadow-soft);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-soft);
    text-decoration: none;
    position: relative;
    transition:
      transform var(--dur-base) var(--motion-standard),
      box-shadow var(--dur-base) var(--motion-standard),
      background-color var(--dur-base) var(--motion-standard),
      color var(--dur-base) var(--motion-standard);
  }

  .header-side-circle:hover {
    transform: none;
    box-shadow: var(--neu-shadow-hover-strong);
  }

  .header-side-circle svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
    display: block;
    transition: transform var(--dur-base) var(--motion-standard);
  }

  .header-menu[open] {
    color: var(--text-warm-chip);
  }

  .header-menu[open] summary {
    background: var(--app-glass-panel-bg-strong);
    box-shadow: var(--header-menu-open-shadow);
  }

  .header-menu[open] summary svg {
    transform: scale(0.96);
  }

  .header-menu--quick[open] summary svg {
    transform: rotate(45deg) scale(0.96);
  }

  .header-side-circle--ghost {
    visibility: hidden;
  }

  .header-badge {
    position: absolute;
    top: -3px;
    right: -2px;
    min-width: 19px;
    height: 19px;
    border-radius: var(--radius-pill);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    font-size: 0.67rem;
    font-weight: 700;
    color: var(--text-on-accent);
    background: var(--accent-clay);
    box-shadow: var(--header-badge-shadow);
  }

  .header-menu {
    position: relative;
    background: transparent;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
    box-shadow: none;
    overflow: visible;
  }

  .header-menu summary {
    list-style: none;
    width: 100%;
    height: 100%;
    border-radius: var(--radius-pill);
    border: none;
    background: var(--app-glass-panel-bg-soft);
    backdrop-filter: blur(var(--app-glass-panel-blur)) saturate(var(--app-glass-panel-saturate));
    -webkit-backdrop-filter: blur(var(--app-glass-panel-blur))
      saturate(var(--app-glass-panel-saturate));
    box-shadow: var(--app-glass-panel-shadow-soft);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition:
      box-shadow var(--dur-base) var(--motion-standard),
      background-color var(--dur-base) var(--motion-standard),
      color var(--dur-base) var(--motion-standard);
  }

  .header-menu:hover summary {
    box-shadow: var(--neu-shadow-hover-strong);
  }

  .header-menu[open].header-side-circle:hover {
    box-shadow: none;
  }

  .header-menu[open]:hover summary {
    box-shadow: var(--header-menu-open-hover-shadow);
  }

  .header-menu summary::-webkit-details-marker {
    display: none;
  }

  .header-dropdown {
    position: absolute;
    top: calc(100% + var(--header-dropdown-offset-desktop));
    left: 0;
    min-width: 190px;
    max-width: min(280px, calc(100vw - 24px));
    border-radius: var(--radius-card);
    border: none;
    background: var(--app-glass-menu-bg);
    backdrop-filter: blur(var(--app-glass-menu-blur)) saturate(var(--app-glass-menu-saturate));
    -webkit-backdrop-filter: blur(var(--app-glass-menu-blur))
      saturate(var(--app-glass-menu-saturate));
    will-change: backdrop-filter;
    box-shadow: var(--app-glass-panel-shadow);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 24;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--dur-ui) var(--motion-standard);
  }

  .header-menu[open] .header-dropdown {
    opacity: 1;
    pointer-events: auto;
  }

  .header-menu--quick .header-dropdown {
    left: auto;
    right: 0;
  }

  .header-dropdown a,
  .header-dropdown button {
    min-height: 42px;
    border: none;
    border-radius: var(--radius-control);
    background: transparent;
    color: var(--text-main);
    text-decoration: none;
    text-align: left;
    font: inherit;
    font-size: var(--fs-sm);
    padding: 0 12px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    box-shadow: none;
    transition:
      background-color 0.18s var(--motion-standard),
      color 0.18s var(--motion-standard),
      box-shadow 0.18s var(--motion-standard);
  }

  .header-dropdown a:hover,
  .header-dropdown button:hover {
    background: var(--app-glass-menu-item-hover-bg);
    color: var(--app-glass-menu-item-hover-text);
    box-shadow: var(--app-glass-menu-item-hover-shadow);
  }

  .header-dropdown a:active,
  .header-dropdown button:active {
    background: var(--app-glass-menu-item-active-bg);
    box-shadow: var(--app-glass-menu-item-active-shadow);
  }

  .header-dropdown .header-dropdown-danger {
    color: #8a3232;
    background: var(--app-glass-menu-danger-bg);
  }

  .header-dropdown .header-dropdown-danger:hover {
    background: var(--app-glass-menu-danger-hover-bg);
    color: #7a2222;
    box-shadow: var(--app-glass-menu-danger-hover-shadow);
  }

  .header-dropdown form {
    margin: 0;
  }

  .header-compose-modal {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .header-compose-modal h2,
  .header-compose-modal p {
    margin: 0;
  }

  .header-compose-modal p {
    color: var(--text-muted);
    font-size: var(--fs-sm);
  }

  .header-compose-form {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .header-compose-form .compose-field {
    margin: 0;
  }

  .header-compose-form .modern-input,
  .header-compose-form .modern-textarea {
    width: 100%;
    border: none;
    border-radius: var(--radius-control);
    background: var(--control-bg);
    color: var(--text-main);
    font-family: inherit;
    font-size: var(--fs-sm);
    padding: 0.56rem 0.7rem;
    box-shadow: var(--neu-shadow-inset);
    transition:
      box-shadow var(--dur-base) var(--motion-standard),
      background-color var(--dur-base) var(--motion-standard);
  }

  .header-compose-form .modern-textarea {
    min-height: 112px;
    padding-top: 1.1rem;
    resize: vertical;
    line-height: var(--lh-copy);
  }

  .header-compose-form .modern-input:focus,
  .header-compose-form .modern-textarea:focus {
    outline: none;
    background: var(--control-bg-focus);
    box-shadow: var(--neu-shadow-inset), var(--focus-ring-soft);
  }

  .header-compose-form .floating-input-wrapper .modern-textarea + label {
    top: 0.74rem;
  }

  .header-compose-form .floating-input-wrapper .modern-textarea:focus + label,
  .header-compose-form .floating-input-wrapper .modern-textarea:valid + label,
  .header-compose-form .floating-input-wrapper .modern-textarea + label.label-active {
    top: -0.38rem;
    left: 0.5rem;
    color: #8a5f3f;
    font-size: var(--fs-2xs);
    letter-spacing: 0.01em;
    background: #f4eee6;
    padding: 0 0.3rem;
    border-radius: var(--radius-sm);
    box-shadow: var(--shadow-soft-sm);
  }

  .header-compose-actions {
    justify-content: flex-end;
  }

  @media (max-width: 760px) {
    .app-route-header {
      padding-inline: 18px;
    }

    .app-route-header-layout {
      gap: 15px;
    }

    .header-main-pill {
      min-height: 66px;
      padding-inline: 22px;
    }

    .header-side-circle {
      width: 46px;
      height: 46px;
    }

    .header-side-circle svg {
      width: 22px;
      height: 22px;
    }

    .header-dropdown {
      min-width: 172px;
      max-width: min(250px, calc(100vw - 22px));
      top: calc(100% + var(--header-dropdown-offset-mobile));
      gap: 7px;
    }
  }

  .route-progress {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 3px;
    z-index: 2100;
    pointer-events: none;
    opacity: 0;
    transform: scaleX(0.08);
    transform-origin: left center;
    transition:
      opacity 0.12s var(--motion-standard),
      transform 0.28s var(--motion-standard);
    background: linear-gradient(90deg, rgba(114, 129, 95, 0.85), rgba(155, 113, 88, 0.92));
    box-shadow: 0 0 10px rgba(114, 129, 95, 0.28);
  }

  .route-progress.active {
    opacity: 1;
    transform: scaleX(0.88);
  }

  @media (prefers-reduced-motion: reduce) {
    .route-progress,
    .route-progress.active {
      opacity: 0;
      transform: none;
      transition: none;
    }
  }
</style>
