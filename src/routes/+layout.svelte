<script lang="ts">
  import { base } from '$app/paths'
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

  const HEADER_TEXT_FADE_OUT_MS = 120

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

  const isFamilyTreePath = (value: string) => value === '/' || /^\/family\/[^/]+$/.test(value)
  const isFamilyHubPath = (value: string) => /^\/family\/[^/]+\/hub$/.test(value)
  const isFamilyAdminPath = (value: string) =>
    value === '/admin' || /^\/family\/[^/]+\/admin$/.test(value)
  const isProfilePath = (value: string) => value === '/profile'

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
    isFamilyTreePath(pathname) || isFamilyHubPath(pathname) || isFamilyAdminPath(pathname)
  $: familyBasePath = activeFamilyId ? `/family/${encodeURIComponent(activeFamilyId)}` : null
  $: familyTreeHref = familyBasePath ?? '/hub?state=no_family'
  $: familyHubHref = familyBasePath ? `${familyBasePath}/hub` : '/hub?state=no_family'
  $: familyAdminHref = familyBasePath ? `${familyBasePath}/admin` : '/hub?state=no_family'
  $: headerCrumb = isFamilyTreePath(pathname)
    ? 'Árbol'
    : isFamilyHubPath(pathname)
      ? 'Hub familiar'
      : isFamilyAdminPath(pathname)
        ? 'Administración'
        : isProfilePath(pathname)
          ? 'Cuenta'
          : 'Nivel personal'
  $: headerTitle = isFamilyLevel
    ? activeFamilyName ?? 'Sin familia'
    : isProfilePath(pathname)
      ? displayName
      : `Hola, ${displayName}`
  $: composeAction = `${familyHubHref}?/createNote`
  $: composeModalTitle = composeType === 'news' ? 'Nueva noticia' : 'Nueva nota'
  $: headerTextKey = `${headerCrumb}::${headerTitle}`
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

  function handleMenuToggle(activeMenu: HTMLDetailsElement | null, otherMenu: HTMLDetailsElement | null) {
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
    handleViewportScroll()
    window.addEventListener('scroll', handleViewportScroll, { passive: true })

    if ('serviceWorker' in navigator) {
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

{#if showPersistentHeader}
  <header class="app-route-header" aria-label="Cabecera principal">
    <div class="app-route-header-shell">
      <div class="app-route-header-layout">
        {#if isFamilyLevel}
          <a
            class="header-side-circle"
            href="/hub"
            aria-label="Volver al nivel personal"
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
                data-sveltekit-preload-code="eager"
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
              <p
                class="header-crumb"
                in:fade={{ duration: 80 }}
                out:fade={{ duration: 70 }}
              >
                {displayedHeaderCrumb}
              </p>
              <h1
                in:fade={{ duration: 120, delay: 30 }}
                out:fade={{ duration: 90, delay: 20 }}
              >
                {displayedHeaderTitle}
              </h1>
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
                  Nuevo miembro
                </button>
                <button type="button" role="menuitem" on:click={() => openNoteComposer('news')}>
                  Nueva noticia
                </button>
                <button type="button" role="menuitem" on:click={() => openNoteComposer('note')}>
                  Nueva nota
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
            data-sveltekit-preload-code="eager"
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
      <h2 id="header-compose-title">{composeModalTitle}</h2>
      <p>
        Se guardará en <strong>{activeFamilyName ?? 'la familia activa'}</strong>.
      </p>

      <form method="POST" action={composeAction} class="header-compose-form">
        <input type="hidden" name="familyId" value={activeFamilyId} />
        <input type="hidden" name="noteType" value={composeType} />

        <label>
          Título
          <input class="modern-input" name="title" bind:value={composeTitle} maxlength="120" required />
        </label>

        <label>
          Contenido
          <textarea
            class="modern-textarea"
            name="body"
            bind:value={composeBody}
            rows="4"
            required
          ></textarea>
        </label>

        <div class="header-compose-actions">
          <button type="button" class="app-btn app-btn--ghost" on:click={closeComposeModal}>
            Cancelar
          </button>
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
    --app-bg: radial-gradient(circle at 10% 14%, rgba(235, 223, 204, 0.34), transparent 34%),
      radial-gradient(circle at 86% 10%, rgba(226, 212, 194, 0.34), transparent 30%),
      radial-gradient(circle at 22% 78%, rgba(208, 216, 194, 0.24), transparent 36%), #f1ece4;
    --app-bg-deep: #f1ece4;
    --surface-soft: rgba(255, 255, 255, 0.34);
    --surface-strong: rgba(255, 255, 255, 0.56);
    --glass-surface: rgba(250, 247, 243, 0.56);
    --glass-surface-strong: rgba(255, 254, 251, 0.78);
    --glass-border: rgba(236, 226, 212, 0.9);
    --glass-border-soft: rgba(219, 205, 188, 0.62);
    --glass-shadow: 0 16px 34px rgba(79, 66, 53, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.75);
    --neu-surface: #efe8de;
    --neu-surface-soft: #f4efe7;
    --neu-light: rgba(255, 255, 255, 0.8);
    --neu-dark: rgba(154, 132, 109, 0.3);
    --neu-shadow-out: 8px 8px 16px var(--neu-dark), -8px -8px 16px var(--neu-light);
    --neu-shadow-out-soft: 5px 5px 10px rgba(154, 132, 109, 0.24),
      -5px -5px 10px rgba(255, 255, 255, 0.76);
    --neu-shadow-hover-strong: 10px 10px 18px rgba(154, 132, 109, 0.26),
      -10px -10px 18px rgba(255, 255, 255, 0.86);
    --neu-shadow-hover-soft: 8px 8px 16px rgba(149, 121, 95, 0.22),
      -8px -8px 16px rgba(255, 255, 255, 0.82);
    --neu-shadow-inset: inset 5px 5px 10px rgba(154, 132, 109, 0.24),
      inset -5px -5px 10px rgba(255, 255, 255, 0.76);
    --text-main: #2e2823;
    --text-muted: #544b43;
    --text-soft: #675c53;
    --brand: #806a54;
    --brand-soft: rgba(128, 106, 84, 0.14);
    --accent-sky: #89725f;
    --accent-sage: #72815f;
    --accent-clay: #9b7158;
    --accent-plum: #716453;
    --accent-sky-soft: rgba(137, 114, 95, 0.14);
    --accent-sage-soft: rgba(114, 129, 95, 0.14);
    --accent-clay-soft: rgba(155, 113, 88, 0.14);
    --accent-plum-soft: rgba(113, 100, 83, 0.14);
    --ok: #3f7965;
    --danger: #b23333;
    --field-border: #cbbca9;
    --field-bg: #fcfaf7;
    --radius-lg: 16px;
    --radius-md: 12px;
    --radius-pill: 999px;
    --page-header-content-gap: 30px;
    --motion-standard: cubic-bezier(0.22, 1, 0.36, 1);
    --fs-2xs: clamp(0.78rem, 0.74rem + 0.15vw, 0.84rem);
    --fs-xs: clamp(0.84rem, 0.8rem + 0.2vw, 0.9rem);
    --fs-sm: clamp(0.9rem, 0.86rem + 0.2vw, 0.98rem);
    --fs-md: clamp(1rem, 0.96rem + 0.2vw, 1.05rem);
    --fs-lg: clamp(1.12rem, 1.04rem + 0.35vw, 1.28rem);
    --fs-xl: clamp(1.35rem, 1.18rem + 0.8vw, 1.8rem);
    --lh-tight: 1.2;
    --lh-copy: 1.5;
    --nav-dock-shadow: 0 14px 24px rgba(88, 71, 56, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.52);
    --tree-node-surface: linear-gradient(
      165deg,
      rgba(255, 253, 250, 0.94),
      rgba(242, 234, 223, 0.72)
    );
    --tree-node-border: rgba(187, 167, 147, 0.5);
    --tree-node-shadow: 0 14px 22px rgba(88, 69, 52, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.84);
    --tree-line-main: #85705f;
    --tree-line-soft: #a29182;
    --tree-band-a: rgba(250, 245, 238, 0.2);
    --tree-band-b: rgba(234, 225, 214, 0.12);
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

  :global(body::before),
  :global(body::after) {
    content: '';
    position: fixed;
    inset: auto;
    pointer-events: none;
    z-index: -1;
  }

  :global(body::before) {
    width: min(52vw, 520px);
    height: min(52vw, 520px);
    top: -110px;
    right: -120px;
    background: radial-gradient(circle, rgba(198, 171, 139, 0.2), transparent 68%);
    filter: blur(10px);
    animation: float-ambient-a 16s ease-in-out infinite alternate;
  }

  :global(body::after) {
    width: min(58vw, 580px);
    height: min(58vw, 580px);
    bottom: -220px;
    left: -200px;
    background: radial-gradient(circle, rgba(173, 188, 156, 0.18), transparent 70%);
    filter: blur(14px);
    animation: float-ambient-b 19s ease-in-out infinite alternate;
  }

  :global(*) {
    box-sizing: border-box;
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
    box-shadow: none;
  }

  :global(button:disabled:focus-visible),
  :global(button[aria-disabled='true']:focus-visible) {
    outline: none;
    box-shadow: none;
  }

  :global(.glass-panel) {
    background: var(--neu-surface);
    border: none;
    border-radius: var(--radius-lg);
    box-shadow: var(--neu-shadow-out);
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
      transform 0.22s var(--motion-standard),
      box-shadow 0.22s var(--motion-standard),
      background-color 0.22s var(--motion-standard),
      border-color 0.22s var(--motion-standard),
      color 0.22s var(--motion-standard);
  }

  :global(.app-btn:hover:not(:disabled):not([aria-disabled='true'])) {
    transform: none;
    box-shadow: var(--neu-shadow-hover-strong);
  }

  :global(.app-btn:active:not(:disabled):not([aria-disabled='true'])) {
    transform: translateY(0);
    box-shadow:
      inset 3px 3px 7px rgba(154, 132, 109, 0.18),
      inset -3px -3px 7px rgba(255, 255, 255, 0.72);
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
    background: #f2ece4;
    color: var(--brand);
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
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.5);
    box-shadow:
      inset 2px 2px 5px rgba(149, 121, 95, 0.1),
      inset -2px -2px 5px rgba(255, 255, 255, 0.68);
  }

  :global(.app-card-soft-raised) {
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.52);
    box-shadow:
      3px 3px 7px rgba(154, 132, 109, 0.14),
      -3px -3px 7px rgba(255, 255, 255, 0.7);
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
    box-shadow:
      3px 3px 8px rgba(149, 121, 95, 0.12),
      -3px -3px 8px rgba(255, 255, 255, 0.72);
    transition:
      transform 0.2s var(--motion-standard),
      box-shadow 0.2s var(--motion-standard),
      background-color 0.2s var(--motion-standard),
      color 0.2s var(--motion-standard);
  }

  :global(.app-chip--interactive:hover) {
    transform: none;
    background: #f7efe6;
    box-shadow: var(--neu-shadow-hover-soft);
  }

  :global(.app-chip--interactive.active),
  :global(.app-chip--interactive[aria-pressed='true']) {
    background: #e9dccd;
    box-shadow:
      inset 2px 2px 5px rgba(149, 121, 95, 0.16),
      inset -2px -2px 5px rgba(255, 255, 255, 0.7);
  }

  :global(.app-stat-grid) {
    display: grid;
    gap: 8px;
  }

  :global(.app-stat-item) {
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
    border-radius: 10px;
    border: 1px solid var(--field-border);
    background: #fffdf9;
    box-shadow: 0 8px 18px rgba(106, 62, 30, 0.14);
    z-index: 10;
  }

  :global(.app-autocomplete-suggestions li) {
    padding: 10px 16px;
    cursor: pointer;
    transition:
      background-color 0.2s var(--motion-standard),
      color 0.2s var(--motion-standard);
  }

  :global(.app-autocomplete-suggestions li:hover),
  :global(.app-autocomplete-suggestions li.active) {
    background: rgba(246, 225, 203, 0.58);
    color: #8a4a22;
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
    transition: background-color 0.2s var(--motion-standard);
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
    background: #efe7dc;
    color: #1f1f1f;
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow:
      4px 4px 10px rgba(149, 121, 95, 0.14),
      -4px -4px 10px rgba(255, 255, 255, 0.6);
    transition:
      transform 0.2s var(--motion-standard),
      background-color 0.2s var(--motion-standard),
      color 0.2s var(--motion-standard),
      box-shadow 0.2s var(--motion-standard);
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
    box-shadow:
      inset 3px 3px 7px rgba(149, 121, 95, 0.2),
      inset -3px -3px 7px rgba(255, 255, 255, 0.75);
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
      transform 0.2s var(--motion-standard),
      box-shadow 0.2s var(--motion-standard),
      background-color 0.2s var(--motion-standard),
      color 0.2s var(--motion-standard);
  }

  :global(.app-bottom-nav .app-bottom-nav-link:hover) {
    transform: none;
    box-shadow: var(--neu-shadow-hover-strong);
  }

  :global(.app-bottom-nav .app-bottom-nav-link[aria-current='page']) {
    color: #795f49;
    background: #e6d8c8;
    box-shadow:
      inset 3px 3px 7px rgba(154, 132, 109, 0.22),
      inset -3px -3px 7px rgba(255, 255, 255, 0.76);
  }

  :global(.page-shell) {
    width: min(1040px, 100%);
    margin: 0 auto;
    padding: max(18px, env(safe-area-inset-top)) 14px max(20px, env(safe-area-inset-bottom));
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
    border-radius: 10px;
    background: #f2ece4;
    font-size: var(--fs-md);
    transition:
      border-color 0.2s,
      box-shadow 0.2s;
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
    box-shadow:
      var(--neu-shadow-inset),
      0 0 0 2px rgba(156, 123, 95, 0.18);
    background: #f7f2ea;
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
    opacity: 0;
    transform: translateY(10px);
    animation: reveal-fade-up 0.52s var(--motion-standard) forwards;
  }

  :global(.reveal-delay-1) {
    animation-delay: 0.06s;
  }

  :global(.reveal-delay-2) {
    animation-delay: 0.14s;
  }

  :global(.reveal-delay-3) {
    animation-delay: 0.22s;
  }

  :global(.hover-lift) {
    transition:
      transform 0.22s var(--motion-standard),
      box-shadow 0.22s var(--motion-standard),
      border-color 0.22s var(--motion-standard);
  }

  :global(.hover-lift:hover) {
    transform: none;
    box-shadow: var(--neu-shadow-hover-strong);
  }

  @keyframes reveal-fade-up {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes float-ambient-a {
    from {
      transform: translate3d(0, 0, 0) scale(1);
    }

    to {
      transform: translate3d(12px, -16px, 0) scale(1.05);
    }
  }

  @keyframes float-ambient-b {
    from {
      transform: translate3d(0, 0, 0) scale(1);
    }

    to {
      transform: translate3d(-8px, 14px, 0) scale(1.04);
    }
  }

  :global(.floating-input-wrapper .modern-input:user-invalid:not(:focus) + label.label-active) {
    color: #dc2626;
  }

  :global(.floating-input-wrapper .modern-input:user-invalid:not(:focus)) {
    border-color: #dc2626;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.15);
    background: #fff5f5;
  }

  :global(.modern-input:user-invalid:not(:focus)) {
    border-color: #dc2626;
    box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.15);
    background: #fff5f5;
  }

  @media (prefers-reduced-motion: reduce) {
    :global(*) {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }

    :global(body::before),
    :global(body::after) {
      animation: none !important;
    }

    .viewport-fade {
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
    border-radius: 12px;
    background: #fff3cd;
    color: #5f4500;
    border: 1px solid #f6df96;
    box-shadow: 0 10px 24px rgba(36, 23, 0, 0.13);
    font-size: var(--fs-sm);
    line-height: 1.35;
    text-align: center;
  }

  .app-route-header {
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
    background: var(--neu-surface);
    box-shadow: var(--neu-shadow-out);
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
    color: #4e392d;
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
    border-radius: 999px;
    border: none;
    background: var(--neu-surface-soft);
    box-shadow: var(--neu-shadow-out-soft);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #5f4a39;
    text-decoration: none;
    position: relative;
    transition:
      transform 0.2s var(--motion-standard),
      box-shadow 0.2s var(--motion-standard),
      background-color 0.2s var(--motion-standard),
      color 0.2s var(--motion-standard);
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
    transition: transform 0.2s var(--motion-standard);
  }

  .header-menu[open] {
    background: #e8dbc9;
    color: #735741;
    box-shadow:
      inset 3px 3px 7px rgba(154, 132, 109, 0.2),
      inset -3px -3px 7px rgba(255, 255, 255, 0.75);
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
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0 5px;
    font-size: 0.67rem;
    font-weight: 700;
    color: #fff;
    background: #c25f45;
    box-shadow: 0 3px 7px rgba(122, 49, 30, 0.35);
  }

  .header-menu {
    position: relative;
  }

  .header-menu summary {
    list-style: none;
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  }

  .header-menu summary::-webkit-details-marker {
    display: none;
  }

  .header-dropdown {
    position: absolute;
    top: calc(100% + 32px);
    left: 0;
    transform: translateY(-6px) scale(0.96);
    min-width: 190px;
    max-width: min(280px, calc(100vw - 24px));
    border-radius: 14px;
    background: var(--neu-surface);
    box-shadow: var(--neu-shadow-out);
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    z-index: 24;
    opacity: 0;
    transform: translateX(-50%) translateY(-6px) scale(0.96);
    pointer-events: none;
    transition:
      opacity 0.22s var(--motion-standard),
      transform 0.22s var(--motion-standard);
  }

  .header-menu[open] .header-dropdown {
    opacity: 1;
    transform: translateY(0) scale(1);
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
    border-radius: 10px;
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
  }

  .header-dropdown a:hover,
  .header-dropdown button:hover {
    background: #e9dece;
  }

  .header-dropdown .header-dropdown-danger {
    color: #8a3232;
    background: rgba(189, 94, 94, 0.12);
  }

  .header-dropdown .header-dropdown-danger:hover {
    background: rgba(189, 94, 94, 0.2);
    color: #7a2222;
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

  .header-compose-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    color: var(--text-muted);
    font-size: var(--fs-xs);
  }

  .header-compose-form .modern-input,
  .header-compose-form .modern-textarea {
    width: 100%;
    border: 1px solid rgba(168, 132, 101, 0.32);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.78);
    color: var(--text-main);
    font-family: inherit;
    font-size: var(--fs-sm);
    padding: 0.5rem 0.62rem;
  }

  .header-compose-form .modern-textarea {
    resize: vertical;
  }

  .header-compose-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
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
      top: calc(100% + 26px);
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
