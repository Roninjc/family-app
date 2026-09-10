<script lang="ts">
  import { navigating, page } from '$app/stores'
  import { browser } from '$app/environment'
  import { onDestroy, tick } from 'svelte'

  const treeRoutePattern = /^\/family\/[^/]+$/
  const familyFeedRoutePattern = /^\/family\/[^/]+\/feed$/
  const familyAdminRoutePattern = /^\/family\/[^/]+\/admin$/
  const dashboardRoutePattern = /^\/dashboard$/

  // Matches the header copy swap timing so both persistent shells feel the same.
  const NAV_FADE_MS = 200
  const NAV_RESIZE_MS = 360

  let pillEl: HTMLDivElement | null = null
  let displayedLevel: 'family' | 'personal' | null = null
  let navContentVisible = true
  let pillWidth: number | null = null
  let swapping = false
  let destroyed = false

  $: pathname = $page.url.pathname
  // Highlight the pending destination right away instead of waiting for its data.
  $: markedPathname = $navigating?.to?.url.pathname ?? pathname
  $: activeFamilyId = $page.data.activeFamilyId ?? null
  $: familyBasePath = activeFamilyId ? `/family/${encodeURIComponent(activeFamilyId)}` : null
  $: treeHref = familyBasePath ?? '/dashboard?state=no_family'
  $: adminHref = familyBasePath ? `${familyBasePath}/admin` : '/dashboard?state=no_family'
  $: familyFeedHref = familyBasePath ? `${familyBasePath}/feed` : '/dashboard?state=no_family'
  $: isFamilyLevel =
    treeRoutePattern.test(pathname) ||
    familyFeedRoutePattern.test(pathname) ||
    familyAdminRoutePattern.test(pathname)
  $: isFamilyTreePath = treeRoutePattern.test(markedPathname)
  $: isFamilyFeedPath = familyFeedRoutePattern.test(markedPathname)
  $: isFamilyAdminPath = familyAdminRoutePattern.test(markedPathname)
  $: isDashboardPath = dashboardRoutePattern.test(markedPathname)
  $: isProfilePath = markedPathname === '/profile'
  $: level = (isFamilyLevel ? 'family' : 'personal') as 'family' | 'personal'

  $: if (displayedLevel === null) displayedLevel = level
  $: if (displayedLevel !== null && level !== displayedLevel) void runLevelSwap()

  const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  async function runLevelSwap() {
    if (swapping) return
    swapping = true

    try {
      while (!destroyed && displayedLevel !== level) {
        const target = level
        navContentVisible = false
        await wait(NAV_FADE_MS)
        if (destroyed) return

        const el = pillEl

        if (!browser || !el) {
          displayedLevel = target
          navContentVisible = true
          continue
        }

        const from = el.getBoundingClientRect().width
        displayedLevel = target
        await tick()
        const to = el.getBoundingClientRect().width

        if (Math.abs(to - from) > 0.5) {
          pillWidth = from
          await tick()
          void el.offsetWidth
          pillWidth = to
          await wait(NAV_RESIZE_MS)
          if (destroyed) return
        }

        pillWidth = null
        await tick()
        navContentVisible = true
        await wait(NAV_FADE_MS)
      }
    } finally {
      swapping = false
    }
  }

  onDestroy(() => {
    destroyed = true
  })
</script>

<footer class="app-footer-nav" aria-label="Navegación principal fija">
  <div class="app-footer-nav-content">
    <nav class="app-bottom-nav" aria-label="Navegación principal">
      <div
        class="app-bottom-nav-pill"
        data-level={displayedLevel ?? (isFamilyLevel ? 'family' : 'personal')}
        bind:this={pillEl}
        style={pillWidth === null ? '' : `width:${pillWidth}px`}
      >
        <div class="app-bottom-nav-items" class:visible={navContentVisible}>
          {#if displayedLevel === 'family'}
            <a
              class="app-bottom-nav-link"
              aria-current={isFamilyTreePath ? 'page' : undefined}
              href={treeHref}
              data-sveltekit-preload-data="tap"
              aria-label="Ir al árbol familiar"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M16 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm0 2c-2.7 0-6.5 1.35-6.5 3.9V19H14v-2.1C14 14.35 10.2 13 8 13zm8 0c-.34 0-.73.03-1.13.1 1.1.82 1.88 1.95 1.88 3.35V19h5.75v-2.1C22.5 14.35 18.7 13 16 13z"
                />
              </svg>
              <span class="sr-only">Árbol</span>
            </a>
            <a
              class="app-bottom-nav-link"
              aria-current={isFamilyFeedPath ? 'page' : undefined}
              href={familyFeedHref}
              data-sveltekit-preload-data="tap"
              aria-label="Ir a novedades familiares"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 3a9 9 0 0 1 0 18v-2.2a6.8 6.8 0 1 0-6.8-6.8H3A9 9 0 0 1 12 3z" />
                <path d="M12 7a5 5 0 0 1 0 10v-2.1a2.9 2.9 0 1 0-2.9-2.9H7A5 5 0 0 1 12 7z" />
                <path d="M12 10.55a1.45 1.45 0 1 1 0 2.9 1.45 1.45 0 0 1 0-2.9z" />
              </svg>
              <span class="sr-only">Novedades</span>
            </a>
            <a
              class="app-bottom-nav-link"
              aria-current={isFamilyAdminPath ? 'page' : undefined}
              href={adminHref}
              data-sveltekit-preload-data="tap"
              aria-label="Ir a administración familiar"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M3 6h9v2H3V6zm14 0h4v2h-4V6zm-7 5h11v2H10v-2zm-7 0h2v2H3v-2zm0 5h14v2H3v-2zm18 0h0v2h-2v-2h2zM13 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm-7 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4zm12 5a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"
                />
              </svg>
              <span class="sr-only">Admin familiar</span>
            </a>
          {:else}
            <a
              class="app-bottom-nav-link"
              aria-current={isDashboardPath ? 'page' : undefined}
              href="/dashboard"
              data-sveltekit-preload-data="tap"
              aria-label="Ir al panel personal"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M12 3 2.5 10.2V21h7v-6h5V21h7V10.2L12 3z" />
              </svg>
              <span class="sr-only">Familias</span>
            </a>
            <a
              class="app-bottom-nav-link"
              aria-current={isProfilePath ? 'page' : undefined}
              href="/profile"
              data-sveltekit-preload-data="tap"
              aria-label="Ir a cuenta y perfil"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M12 2.5a4.75 4.75 0 1 1 0 9.5 4.75 4.75 0 0 1 0-9.5zM4 19.2C4 16.5 7.58 14 12 14s8 2.5 8 5.2V21H4v-1.8z"
                />
              </svg>
              <span class="sr-only">Cuenta</span>
            </a>
          {/if}
        </div>
      </div>
    </nav>
  </div>
</footer>

<style lang="scss">
  .app-footer-nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 40;
    pointer-events: none;
    padding: 0 10px max(10px, env(safe-area-inset-bottom));
  }

  .app-footer-nav-content {
    width: min(1080px, 100%);
    margin: 0 auto;
    pointer-events: auto;
    display: flex;
    justify-content: center;
  }

  .app-footer-nav :global(.app-bottom-nav) {
    width: auto;
  }

  .app-footer-nav :global(.app-bottom-nav-pill) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    min-width: 0;
    margin: 0 auto;
    padding: 13px 16px;
    border-radius: 999px;
    background: var(--app-glass-panel-bg-soft);
    border: 1px solid var(--app-glass-panel-border-soft);
    backdrop-filter: blur(var(--app-glass-panel-blur)) saturate(var(--app-glass-panel-saturate));
    -webkit-backdrop-filter: blur(var(--app-glass-panel-blur))
      saturate(var(--app-glass-panel-saturate));
    box-shadow: var(--app-glass-panel-shadow);
    transition:
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease),
      background-color 0.22s var(--motion-standard),
      width 360ms var(--motion-standard);
  }

  .app-bottom-nav-items {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 16px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 200ms var(--motion-standard);
  }

  .app-bottom-nav-items.visible {
    opacity: 1;
    pointer-events: auto;
  }

  .app-footer-nav :global(.app-bottom-nav-link) {
    width: 52px;
    height: 52px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .app-footer-nav :global(.app-bottom-nav-link svg) {
    width: 24px;
    height: 24px;
    display: block;
    fill: currentColor;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (min-width: 760px) {
    .app-footer-nav {
      padding-inline: 14px;
    }
  }
</style>
