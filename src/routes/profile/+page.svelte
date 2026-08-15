<script lang="ts">
  import { enhance } from '$app/forms'
  import SurfaceWrapper from '../../components/surfaceWrapper.svelte'

  export let data
  export let form

  let password = ''
</script>

<svelte:head>
  <title>Mi perfil — Familia Castaño</title>
</svelte:head>

<header class="profile-header reveal-fade-up" aria-label="Cabecera del perfil">
  <SurfaceWrapper>
    <div class="profile-header-content">
      <h1>Mi perfil</h1>
      {#if data.profile?.email}
        <p class="profile-email" aria-label="Email de la cuenta">{data.profile.email}</p>
      {/if}
    </div>
  </SurfaceWrapper>
</header>

<main class="profile-page page-shell">
  <section class="profile-content reveal-fade-up reveal-delay-1">
    <h2>Contraseña</h2>
    <p class="hint">
      Opcional: crea una contraseña para poder entrar sin esperar el enlace por email.
    </p>
    <form method="POST" action="?/setPassword" use:enhance>
      <div class="input-wrapper floating-input-wrapper">
        <input
          id="newPassword"
          class="modern-input"
          type="password"
          name="password"
          bind:value={password}
          minlength="8"
          autocomplete="new-password"
        />
        <label for="newPassword" class:label-active={password.length > 0}>Nueva contraseña</label>
      </div>
      <button class="app-btn app-btn--primary" type="submit">Guardar contraseña</button>
      {#if form?.passwordSaved}<span class="saved-note" role="status">Guardada ✓</span>{/if}
      {#if form?.passwordError}<div class="form-error" role="alert">{form.passwordError}</div>{/if}
    </form>

    <form class="logout-form" method="POST" action="?/logout" use:enhance>
      <button type="submit" class="app-btn app-btn--danger logout-button">Cerrar sesión</button>
    </form>
  </section>
</main>

<style lang="scss">
  .profile-page {
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 100vh;
    padding-top: 0;
    padding-bottom: max(108px, env(safe-area-inset-bottom));
  }

  .profile-header {
    position: sticky;
    top: 0;
    z-index: 10;
    pointer-events: none;
    padding: max(8px, env(safe-area-inset-top)) 10px 0;
    margin-bottom: var(--page-header-content-gap, 30px);
  }

  .profile-header :global(.surface-wrapper) {
    pointer-events: auto;
    width: min(1040px, 100%);
    margin: 0 auto;
  }

  .profile-header-content {
    width: 100%;
    padding: 16px 18px 15px;

    h1 {
      margin: 0;
      font-family: 'Iowan Old Style', 'Palatino Linotype', 'Book Antiqua', serif;
      font-size: var(--fs-xl);
      line-height: var(--lh-tight);
      letter-spacing: 0.012em;
      color: #4e392d;
    }

    .profile-email {
      margin: 0.35rem 0 0;
      color: var(--text-muted);
      font-size: var(--fs-sm);
      line-height: var(--lh-copy);
      word-break: break-word;
    }
  }

  .profile-content {
    display: flex;
    flex-direction: column;
    width: min(920px, 100%);
    margin-inline: auto;
    padding: 2px 4px 2px;
    border-radius: 15px;

    h2 {
      margin: 1.5rem 0 0.25rem;
      font-size: var(--fs-lg);
      line-height: 1.25;
    }

    .hint {
      margin: 0 0 0.75rem;
      color: var(--text-muted);
      font-size: var(--fs-sm);
      line-height: var(--lh-copy);
    }

    form {
      display: flex;
      flex-direction: column;
    }

    .input-wrapper {
      margin-bottom: 1rem;
    }

    button {
      align-self: flex-start;
    }

    .saved-note {
      color: #16a31a;
      font-size: var(--fs-xs);
      margin-top: 4px;
    }

    .form-error {
      margin-top: 0.5rem;
      color: #dc2626;
      font-size: var(--fs-xs);
    }

    .logout-form {
      margin-top: 2rem;
    }

    .logout-button {
      width: 100%;
    }
  }

  :global(.profile-header .surface-content) {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 0;
  }

  @media (min-width: 720px) {
    .profile-header {
      padding-inline: 14px;
    }

    .profile-header-content {
      padding: 18px 20px 16px;
    }

    .profile-content {
      border-radius: 16px;
    }

    .profile-content {
      .logout-button {
        width: fit-content;
      }
    }
  }
</style>
