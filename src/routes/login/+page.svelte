<script lang="ts">
  import { enhance } from '$app/forms'
  import { page } from '$app/stores'
  import SurfaceWrapper from '../../components/surfaceWrapper.svelte'

  export let form
  export let params: Record<string, string> = {}
  $: routeParamsCount = Object.keys(params).length

  let email = form?.email ?? ''
  let password = ''
  let mode: 'login' | 'register' = 'login'
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
  $: if (inviteToken) mode = 'register'
  $: passwordAutocomplete = mode === 'login' ? 'current-password' : 'new-password'
  $: formAction = mode === 'login' ? '?/password' : '?/register'
</script>

<svelte:head>
  <title>Entrar — Orikara</title>
</svelte:head>

<main data-route-params-count={routeParamsCount}>
  <div class="login-card reveal-fade-up">
    <SurfaceWrapper>
      <div class="login-content">
        <h1>Orikara</h1>
        <p class="subtitle">
          {#if inviteToken}
            Completa tu invitación creando tu cuenta para entrar en la app.
          {:else if mode === 'register'}
            Crea tu cuenta personal para entrar a Orikara.
          {:else}
            Inicia sesión con tu email para entrar a Orikara.
          {/if}
        </p>

        {#if form?.registered && form?.message}
          <p class="status-message app-card-soft">{form.message}</p>
        {/if}

        <form
          method="POST"
          action={formAction}
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
              autocomplete="username"
              inputmode="email"
            />
            <label for="loginEmail" class:label-active={email.length > 0}>Email</label>
          </div>

          <div class="input-wrapper floating-input-wrapper">
            <input
              id="loginPassword"
              class="modern-input"
              type="password"
              name="password"
              bind:value={password}
              required
              minlength="8"
              autocomplete={passwordAutocomplete}
            />
            <label for="loginPassword" class:label-active={password.length > 0}>Contraseña</label>
          </div>

          <button class="app-btn app-btn--primary" type="submit" disabled={submitting}>
            {mode === 'login' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        {#if !inviteToken}
          <button
            type="button"
            class="toggle-method app-btn app-btn--secondary"
            on:click={() => {
              mode = mode === 'login' ? 'register' : 'login'
              password = ''
            }}
          >
            {mode === 'login' ? 'Registrarse' : 'Ya tengo cuenta'}
          </button>

          <div class="divider"><span>o</span></div>

          <form method="POST" action="?/google" use:enhance>
            <button type="submit" class="app-btn app-btn--secondary google-button">
              Continuar con Google
            </button>
          </form>
        {:else}
          <p class="invite-hint">Las invitaciones generales se completan con email y contraseña.</p>
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
    padding: max(var(--space-4), env(safe-area-inset-top)) var(--space-3)
      max(var(--space-4), env(safe-area-inset-bottom));
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
    gap: var(--space-2);

    h1 {
      margin: 0;
      font-size: var(--fs-xl);
      line-height: var(--lh-tight);
      text-align: center;
      letter-spacing: 0.01em;
    }

    .subtitle {
      margin: 0 0 var(--space-2);
      color: var(--text-muted);
      line-height: var(--lh-copy);
      font-size: var(--fs-sm);
      text-align: center;
    }

    .status-message {
      margin: 0;
      color: var(--text-main);
      line-height: var(--lh-copy);
      font-size: var(--fs-sm);
      border: 1px solid var(--feedback-success-border);
      padding: var(--space-2) var(--space-3);
    }

    form {
      display: flex;
      flex-direction: column;
    }

    .input-wrapper {
      margin-bottom: var(--space-6);
    }

    button {
      width: 100%;
      cursor: pointer;
      font-size: var(--fs-sm);

      &[type='submit'] {
        &:disabled {
          opacity: 1;
          cursor: not-allowed;
          background: var(--control-bg-disabled);
          color: var(--control-text-disabled);
          border: 1px solid var(--control-border-disabled);
          box-shadow: none;
        }
      }

      &.google-button {
        margin-top: var(--space-0);
      }
    }

    .toggle-method {
      margin-top: var(--space-1);
      color: var(--text-main);
      font-size: var(--fs-xs);
      padding: var(--space-2) var(--space-2);
      min-height: 36px;
      text-align: left;
    }

    .divider {
      display: flex;
      align-items: center;
      margin: var(--space-4) 0;
      color: var(--text-soft);
      font-size: var(--fs-xs);

      &::before,
      &::after {
        content: '';
        flex: 1;
        height: 1px;
        background: var(--field-border);
      }

      span {
        padding: 0 var(--space-2);
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
      margin-top: var(--space-1);
      color: var(--feedback-error-strong-text);
      font-size: var(--fs-xs);
      line-height: var(--lh-copy);
      border: 1px solid var(--feedback-error-border);
      padding: var(--space-2) var(--space-2);
    }
  }

  :global(.login-card .surface-content) {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: var(--space-6) var(--space-4) var(--space-4);
  }

  @media (min-width: 760px) {
    :global(.login-card .surface-content) {
      padding: var(--space-6) var(--space-6) var(--space-6);
    }
  }
</style>
