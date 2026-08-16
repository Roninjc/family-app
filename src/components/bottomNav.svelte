<script lang="ts">
  import { page } from '$app/stores'
  import { canEdit } from '$lib/types/auth'

  $: canManage = canEdit($page.data.profile)
  $: activeFamilyId = $page.data.activeFamilyId ?? null
  $: treeHref = activeFamilyId ? `/?family=${encodeURIComponent(activeFamilyId)}` : '/'
</script>

<footer class="app-footer-nav" aria-label="Navegación principal fija">
  <div class="app-footer-nav-content">
    <nav class="app-bottom-nav app-nav-dock" aria-label="Navegación principal">
      <a
        aria-current={$page.url.pathname === '/' ? 'page' : undefined}
        href={treeHref}
        data-sveltekit-preload-data="tap"
        data-sveltekit-preload-code="eager"
        aria-label="Ir al árbol"
      >
        Árbol
      </a>
      <a
        aria-current={$page.url.pathname === '/hub' ? 'page' : undefined}
        href="/hub"
        data-sveltekit-preload-data="tap"
        data-sveltekit-preload-code="eager"
        aria-label="Ir al hub"
      >
        Hub
      </a>
      <a
        aria-current={$page.url.pathname === '/profile' ? 'page' : undefined}
        href="/profile"
        data-sveltekit-preload-data="tap"
        data-sveltekit-preload-code="eager"
        aria-label="Ir al perfil"
      >
        Perfil
      </a>
      {#if canManage}
        <a
          aria-current={$page.url.pathname === '/admin' ? 'page' : undefined}
          href="/admin"
          data-sveltekit-preload-data="tap"
          data-sveltekit-preload-code="eager"
          aria-label="Ir a administración"
        >
          Admin
        </a>
      {:else}
        <span class="nav-slot-placeholder" aria-hidden="true"></span>
      {/if}
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
  }

  .app-footer-nav :global(.app-bottom-nav) {
    width: 100%;
  }

  .nav-slot-placeholder {
    min-height: 44px;
    visibility: hidden;
  }

  @media (min-width: 760px) {
    .app-footer-nav {
      padding-inline: 14px;
    }
  }
</style>
