<script lang="ts">
  import { enhance } from '$app/forms'
  import { page } from '$app/stores'
  import LiquidGlassWrapper from '../../components/liquidGlassWrapper.svelte'

  export let form

  let email = form?.email ?? ''
  let password = ''
  let showPasswordForm = false
  let submitting = false

  $: urlError = $page.url.searchParams.get('error')
  $: inviteToken = $page.url.searchParams.get('invite') ?? ''
</script>

<svelte:head>
  <title>Entrar — Familia Castaño</title>
</svelte:head>

<main>
  <div class="login-card">
    <LiquidGlassWrapper>
      <div class="login-content">
        <h1>Familia Castaño</h1>
        <p class="subtitle">Accede con tu email para entrar al hub familiar.</p>

        {#if form?.sent}
          <p class="sent-message">
            Te hemos enviado un enlace a <b>{form.email}</b>. Ábrelo desde este dispositivo para
            entrar.
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

            <div class="input-wrapper">
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
              <div class="input-wrapper">
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

            <button type="submit" disabled={submitting}>
              {#if showPasswordForm}
                Entrar
              {:else}
                Enviarme un enlace de acceso
              {/if}
            </button>
          </form>

          <button class="toggle-method" on:click={() => (showPasswordForm = !showPasswordForm)}>
            {#if showPasswordForm}
              Prefiero un enlace por email
            {:else}
              Prefiero usar mi contraseña
            {/if}
          </button>

          <div class="divider"><span>o</span></div>

          {#if inviteToken}
            <p class="invite-hint">
              Esta invitación se valida con el enlace mágico al email indicado.
            </p>
          {:else}
            <form method="POST" action="?/google" use:enhance>
              <button type="submit" class="google-button">Continuar con Google</button>
            </form>
          {/if}
        {/if}

        {#if form?.error || urlError}
          <div class="form-error">{form?.error ?? urlError}</div>
        {/if}
      </div>
    </LiquidGlassWrapper>
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
    border-radius: 18px;
    background-color: var(--surface-soft);
  }

  .login-content {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: 10px;

    h1 {
      margin: 0;
      font-size: clamp(1.4rem, 4.2vw, 1.7rem);
      text-align: left;
      letter-spacing: 0.01em;
    }

    .subtitle {
      margin: 0 0 0.45rem;
      color: var(--text-muted);
      line-height: 1.45;
      font-size: 0.92rem;
    }

    .sent-message {
      margin: 0;
      color: var(--text-main);
      line-height: 1.5;
      font-size: 0.92rem;
      background: rgba(184, 236, 206, 0.36);
      border: 1px solid rgba(87, 154, 113, 0.3);
      border-radius: 10px;
      padding: 10px 12px;
    }

    form {
      display: flex;
      flex-direction: column;
    }

    .input-wrapper {
      position: relative;
      margin-bottom: 1.5rem;
      display: flex;

      .modern-input {
        width: 100%;
        min-height: 48px;
        padding: 1rem 0.78rem 0.4rem;
        border: 1px solid var(--field-border);
        border-radius: 10px;
        background: var(--field-bg);
        font-size: 1rem;
        transition:
          border-color 0.2s,
          box-shadow 0.2s;
        color: var(--text-main);

        &:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(31, 79, 123, 0.16);
          background: #fff;
        }
      }

      label {
        position: absolute;
        left: 0.55rem;
        top: 0.75rem;
        padding: 0 6px;
        color: #7a7a86;
        font-size: 1rem;
        pointer-events: none;
        background: transparent;
        transition:
          0.2s cubic-bezier(0.4, 0, 0.2, 1) transform,
          0.2s cubic-bezier(0.4, 0, 0.2, 1) font-size,
          0.2s cubic-bezier(0.4, 0, 0.2, 1) color,
          0.2s cubic-bezier(0.4, 0, 0.2, 1) top,
          0.2s cubic-bezier(0.4, 0, 0.2, 1) background;
      }

      .modern-input:focus + label,
      label.label-active {
        top: 2px;
        left: 12px;
        font-size: 0.8rem;
        color: var(--brand);
        background: var(--field-bg);
        transform: translateY(-60%);
        padding: 0 6px;
        border-radius: 6px;
      }
    }

    button {
      width: 100%;
      min-height: 46px;
      padding: 10px;
      border: none;
      border-radius: 11px;
      cursor: pointer;
      transition: ease 0.3s;
      font-size: 0.94rem;
      font-weight: 600;

      &[type='submit'] {
        background-color: #2c7a60;
        color: white;

        &:hover {
          background-color: #24654f;
        }

        &:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        &.google-button {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid #ccd3dc;
          color: var(--text-main);

          &:hover {
            background: #fff;
          }
        }
      }
    }

    .toggle-method {
      margin-top: 0.25rem;
      background: none;
      color: var(--brand);
      font-size: 0.84rem;
      padding: 4px;
      min-height: 36px;

      &:hover {
        text-decoration: underline;
      }
    }

    .divider {
      display: flex;
      align-items: center;
      margin: 1rem 0;
      color: #8f8f8f;
      font-size: 0.85rem;

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
      color: #666;
      font-size: 0.85rem;
      line-height: 1.4;
    }

    .form-error {
      margin-top: 0.4rem;
      color: #9d1f1f;
      font-size: 0.87rem;
      line-height: 1.4;
      background: rgba(246, 189, 189, 0.42);
      border: 1px solid rgba(204, 107, 107, 0.35);
      border-radius: 10px;
      padding: 8px 10px;
    }
  }

  :global(.login-card .liquid-glass-text-container) {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    padding: 24px 18px 18px;
  }

  @media (min-width: 760px) {
    :global(.login-card .liquid-glass-text-container) {
      padding: 28px 24px 24px;
    }
  }
</style>
