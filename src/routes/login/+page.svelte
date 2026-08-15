<script lang="ts">
  import { enhance } from '$app/forms'
  import { page } from '$app/stores'
  import SurfaceWrapper from '../../components/surfaceWrapper.svelte'

  export let form

  let email = form?.email ?? ''
  let password = ''
  let showPasswordForm = false
  let submitting = false

  const resolveUrlError = (value: string | null) => {
    if (value === 'link_expired') return 'El enlace ha caducado. Pide uno nuevo.'
    if (value === 'link_invalid') return 'El enlace no es válido. Solicita uno nuevo.'
    if (value === 'auth_confirm_failed') {
      return 'No se pudo completar el acceso con ese enlace. Inténtalo otra vez.'
    }
    if (value === 'oauth_failed') return 'No se pudo completar el inicio de sesión con Google.'
    return value
  }

  $: urlError = resolveUrlError($page.url.searchParams.get('error'))
  $: inviteToken = $page.url.searchParams.get('invite') ?? ''
</script>

<svelte:head>
  <title>Entrar — Familia Castaño</title>
</svelte:head>

<main>
  <div class="login-card reveal-fade-up">
    <SurfaceWrapper>
      <div class="login-content">
        <h1>Familia Castaño</h1>
        <p class="subtitle">Inicia sesión con tu email para entrar al hub familiar.</p>

        {#if form?.sent}
          <p class="sent-message app-card-soft">
            Te enviamos un enlace a <b>{form.email}</b>. Ábrelo desde este dispositivo para entrar.
          </p>
        {:else}
          <form
            method="POST"
            action={showPasswordForm ? '?/password' : '?/magic'}
            use:enhance={() => {
              submitting = true
              return async ({ update }) => {
                submitting = false
                await update()
              }
            }}
          >
            {#if inviteToken}
              <input type="hidden" name="inviteToken" value={inviteToken} />
            {/if}

            <div class="input-wrapper floating-input-wrapper">
              <input
                id="loginEmail"
                class="modern-input"
                type="email"
                name="email"
                bind:value={email}
                required
                autocomplete="email"
              />
              <label for="loginEmail" class:label-active={email.length > 0}>Email</label>
            </div>

            {#if showPasswordForm}
              <div class="input-wrapper floating-input-wrapper">
                <input
                  id="loginPassword"
                  class="modern-input"
                  type="password"
                  name="password"
                  bind:value={password}
                  required
                  autocomplete="current-password"
                />
                <label for="loginPassword" class:label-active={password.length > 0}
                  >Contraseña</label
                >
              </div>
            {/if}

            <button class="app-btn app-btn--primary" type="submit" disabled={submitting}>
              {#if showPasswordForm}
                Entrar
              {:else}
                Enviarme un enlace de acceso
              {/if}
            </button>
          </form>

          <button
            type="button"
            class="toggle-method app-btn app-btn--secondary"
            on:click={() => (showPasswordForm = !showPasswordForm)}
          >
            {#if showPasswordForm}
              Prefiero recibir un enlace por email
            {:else}
              Prefiero usar mi contraseña
            {/if}
          </button>

          <div class="divider"><span>o</span></div>

          {#if inviteToken}
            <p class="invite-hint">
              Esta invitación se valida con un enlace mágico enviado al email invitado.
            </p>
          {:else}
            <form method="POST" action="?/google" use:enhance>
              <button type="submit" class="app-btn app-btn--secondary google-button">
                Continuar con Google
              </button>
            </form>
          {/if}
        {/if}

        {#if form?.error || urlError}
          <div class="form-error app-card-soft" role="alert">{form?.error ?? urlError}</div>
        {/if}
      </div>
    </SurfaceWrapper>
  </div>
</main>

<style lang="scss">
  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: max(16px, env(safe-area-inset-top)) 14px max(16px, env(safe-area-inset-bottom));
  }

  .login-card {
    width: min(430px, 100%);
    border-radius: var(--radius-lg);
    background-color: transparent;
  }

  .login-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 10px;

    h1 {
      margin: 0;
      font-size: var(--fs-xl);
      line-height: var(--lh-tight);
      text-align: left;
      letter-spacing: 0.01em;
    }

    .subtitle {
      margin: 0 0 0.45rem;
      color: var(--text-muted);
      line-height: var(--lh-copy);
      font-size: var(--fs-sm);
    }

    .sent-message {
      margin: 0;
      color: var(--text-main);
      line-height: var(--lh-copy);
      font-size: var(--fs-sm);
      border: 1px solid rgba(87, 154, 113, 0.3);
      padding: 10px 12px;
    }

    form {
      display: flex;
      flex-direction: column;
    }

    .input-wrapper {
      margin-bottom: 1.5rem;
    }

    button {
      width: 100%;
      cursor: pointer;
      font-size: var(--fs-sm);

      &[type='submit'] {
        &:disabled {
          opacity: 1;
          cursor: not-allowed;
          background: #c3ccd6;
          color: #5c6673;
          border: 1px solid #aeb8c5;
          box-shadow: none;
        }
      }

      &.google-button {
        margin-top: 2px;
      }
    }

    .toggle-method {
      margin-top: 0.25rem;
      color: #6c4a31;
      font-size: var(--fs-xs);
      padding: 8px 10px;
      min-height: 36px;
      text-align: left;
      justify-content: flex-start;
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 1rem 0;
      color: var(--text-soft);
      font-size: var(--fs-xs);

      &::before,
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: #c9c9c9;
      }

      span {
        padding: 0 10px;
      }
    }

    .invite-hint {
      margin: 0;
      text-align: left;
      color: var(--text-muted);
      font-size: var(--fs-xs);
      line-height: var(--lh-copy);
    }

    .form-error {
      margin-top: 0.4rem;
      color: #9d1f1f;
      font-size: var(--fs-xs);
      line-height: var(--lh-copy);
      border: 1px solid rgba(204, 107, 107, 0.35);
      padding: 8px 10px;
    }
  }

  :global(.login-card .surface-content) {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 24px 18px 18px;
  }

  @media (min-width: 760px) {
    :global(.login-card .surface-content) {
      padding: 28px 24px 24px;
    }
  }
</style>
