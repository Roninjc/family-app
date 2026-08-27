<script lang="ts">
  import { enhance } from '$app/forms'

  export let form
  export let params: Record<string, string> = {}
  $: routeParamsCount = Object.keys(params).length

  let password = ''
</script>

<svelte:head>
  <title>Mi perfil — Orikara</title>
</svelte:head>

<main class="profile-page page-shell" data-route-params-count={routeParamsCount}>
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
    padding-bottom: max(108px, env(safe-area-inset-bottom));
  }

  .profile-content {
    display: flex;
    flex-direction: column;
    width: min(var(--page-content-max), 100%);
    margin-inline: auto;
    padding: var(--space-0) var(--space-1) var(--space-0);
    border-radius: var(--radius-card);

    h2 {
      margin: var(--space-6) 0 var(--space-1);
      font-size: var(--fs-lg);
      line-height: 1.25;
    }

    .hint {
      margin: 0 0 var(--space-3);
      color: var(--text-muted);
      font-size: var(--fs-sm);
      line-height: var(--lh-copy);
    }

    form {
      display: flex;
      flex-direction: column;
    }

    .input-wrapper {
      margin-bottom: var(--space-4);
    }

    button {
      align-self: flex-start;
    }

    .saved-note {
      color: var(--feedback-success-text);
      font-size: var(--fs-xs);
      margin-top: var(--space-1);
    }

    .form-error {
      margin-top: var(--space-2);
      color: var(--feedback-error-text);
      font-size: var(--fs-xs);
    }

    .logout-form {
      margin-top: calc(var(--space-6) + var(--space-2));
    }

    .logout-button {
      width: 100%;
    }
  }

  @media (min-width: 720px) {
    .profile-content {
      border-radius: var(--radius-lg);
    }

    .profile-content {
      .logout-button {
        width: fit-content;
      }
    }
  }
</style>
