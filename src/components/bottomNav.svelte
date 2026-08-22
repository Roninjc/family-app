<script lang="ts">
  import { page } from '$app/stores'
  import { canEdit } from '$lib/types/auth'

  $: canManage = canEdit($page.data.profile)
  $: pathname = $page.url.pathname
  $: activeFamilyId = $page.data.activeFamilyId ?? null
  $: treeHref = activeFamilyId ? `/?family=${encodeURIComponent(activeFamilyId)}` : '/hub?state=no_family'
  $: adminHref = activeFamilyId
    ? `/admin?family=${encodeURIComponent(activeFamilyId)}`
    : '/hub?state=no_family'
  $: familyHubHref = activeFamilyId
    ? `/hub?family=${encodeURIComponent(activeFamilyId)}`
    : '/hub?state=no_family'
  $: isFamilyLevel = pathname === '/' || pathname === '/admin'
</script>

<footer class="app-footer-nav" aria-label="Navegación principal fija">
  <div class="app-footer-nav-content">
    <nav class="app-bottom-nav app-nav-dock" aria-label="Navegación principal">
      {#if isFamilyLevel}
        <a
          aria-current={pathname === '/' ? 'page' : undefined}
          href={treeHref}
          data-sveltekit-preload-data="tap"
          data-sveltekit-preload-code="eager"
          aria-label="Ir al árbol familiar"
        >
          Árbol
        </a>
        <a
          aria-current={pathname === '/hub' ? 'page' : undefined}
          href={familyHubHref}
          data-sveltekit-preload-data="tap"
          data-sveltekit-preload-code="eager"
          aria-label="Ir al hub familiar"
        >
          Hub fam
        </a>
        <a
          aria-current={pathname === '/hub' ? 'page' : undefined}
          href="/hub"
          data-sveltekit-preload-data="tap"
          data-sveltekit-preload-code="eager"
          aria-label="Volver al nivel personal"
        >
          Personal
        </a>
        {#if canManage}
          <a
            aria-current={pathname === '/admin' ? 'page' : undefined}
            href={adminHref}
            data-sveltekit-preload-data="tap"
            data-sveltekit-preload-code="eager"
            aria-label="Ir a administración familiar"
          >
            Admin
          </a>
        {:else}
          <span class="nav-slot-placeholder" aria-hidden="true"></span>
        {/if}
      {:else}
        <a
          aria-current={pathname === '/hub' ? 'page' : undefined}
          href="/hub"
          data-sveltekit-preload-data="tap"
          data-sveltekit-preload-code="eager"
          aria-label="Ir al panel personal"
        >
          Familias
        </a>
        <a
          aria-current={pathname === '/profile' ? 'page' : undefined}
          href="/profile"
          data-sveltekit-preload-data="tap"
          data-sveltekit-preload-code="eager"
          aria-label="Ir a cuenta y perfil"
        >
          Cuenta
        </a>
        {#if activeFamilyId}
          <a
            aria-current={pathname === '/' ? 'page' : undefined}
            href={treeHref}
            data-sveltekit-preload-data="tap"
            data-sveltekit-preload-code="eager"
            aria-label="Entrar al nivel familiar"
          >
            Entrar
          </a>
        {:else}
          <span class="nav-disabled" aria-hidden="true">Sin familia</span>
        {/if}
        {#if canManage && activeFamilyId}
          <a
            aria-current={pathname === '/admin' ? 'page' : undefined}
            href={adminHref}
            data-sveltekit-preload-data="tap"
            data-sveltekit-preload-code="eager"
            aria-label="Abrir administración de la familia activa"
          >
            Admin
          </a>
        {:else}
          <span class="nav-slot-placeholder" aria-hidden="true"></span>
        {/if}
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

  .nav-disabled {
    min-height: 44px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    opacity: 0.62;
    font-size: var(--fs-xs);
    border-radius: var(--radius-pill);
  }

  @media (min-width: 760px) {
    .app-footer-nav {
      padding-inline: 14px;
    }
  }
</style>
