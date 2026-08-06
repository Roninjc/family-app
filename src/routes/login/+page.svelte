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
  :global(body) {
    margin: 0;
    background: #e0e0e0;
  }

  main {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
  }

  .login-card {
    border-radius: 16px;
    background-color: rgba(255, 255, 255, 0.3);
  }

  .login-content {
    display: flex;
    flex-direction: column;
    width: 280px;

    h1 {
      margin: 0 0 1.5rem;
      font-size: 1.5rem;
      text-align: center;
    }

    .sent-message {
      margin: 0;
      color: #444;
      line-height: 1.5;
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
        height: 18px;
        padding: 0.6rem 0.75rem 0.4rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: #fafafa;
        font-size: 1rem;
        transition:
          border-color 0.2s,
          box-shadow 0.2s;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
        color: #444;

        &:focus {
          outline: none;
          border-color: #7c3aed;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.12);
          background: #fff;
        }
      }

      label {
        position: absolute;
        left: 0.5rem;
        top: 0.5rem;
        padding: 0 6px;
        color: #8f8f8f;
        font-size: 1.1rem;
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
        color: #7c3aed;
        background: #fafafa;
        transform: translateY(-60%);
        padding: 0 6px;
        border-radius: 6px;
      }
    }

    button {
      width: 100%;
      padding: 10px;
      border: none;
      border-radius: 9px;
      cursor: pointer;
      transition: ease 0.3s;
      font-size: 0.95rem;

      &[type='submit'] {
        background-color: #16a31aa0;
        color: white;

        &:hover {
          background-color: #0bbe11b3;
        }

        &:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        &.google-button {
          background: #fafafa;
          border: 1px solid #c9c9c9;
          color: #444;

          &:hover {
            background: #fff;
          }
        }
      }
    }

    .toggle-method {
      margin-top: 0.75rem;
      background: none;
      color: #096bc1;
      font-size: 0.85rem;
      padding: 4px;

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
      text-align: center;
      color: #666;
      font-size: 0.85rem;
      line-height: 1.4;
    }

    .form-error {
      margin-top: 1rem;
      color: #dc2626;
      font-size: 0.9rem;
      line-height: 1.4;
    }
  }

  :global(.login-card .liquid-glass-text-container) {
    flex-direction: column;
    padding: 30px 24px 24px;
  }
</style>
