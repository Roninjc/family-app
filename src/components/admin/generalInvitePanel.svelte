<script lang="ts">
  import { enhance } from '$app/forms'

  export let activeFamilyId = ''
  export let activeFamilyRole = 'viewer'

  export let generalRole = 'viewer'
  export let generalExpiry = 'none'
  export let generalMaxUses = ''

  export let created = false
  export let successMessage = ''
  export let inviteLink = ''
  export let errorMessage = ''

  export let copyStatus = ''
  export let copyStatusTone: 'ok' | 'error' = 'ok'
  export let onCopyLink: (link: string) => void = () => {}
</script>

<form method="POST" action="?/inviteGeneral" use:enhance>
  <div class="invite-row">
    <input type="hidden" name="familyId" value={activeFamilyId} />
    <select name="role" bind:value={generalRole}>
      <option value="viewer">Solo lectura</option>
      <option value="editor">Editor</option>
      {#if activeFamilyRole === 'admin'}
        <option value="admin">Administrador</option>
      {/if}
    </select>
    <select name="expiryPreset" bind:value={generalExpiry}>
      <option value="none">Sin caducidad</option>
      <option value="7d">Caduca en 7 días</option>
      <option value="30d">Caduca en 30 días</option>
    </select>
    <input
      class="modern-input"
      type="number"
      min="1"
      name="maxUses"
      placeholder="Usos (vacío = sin límite)"
      bind:value={generalMaxUses}
    />
    <button class="app-btn app-btn--primary" type="submit">Crear invitación</button>
  </div>
</form>

{#if created}<p class="ok-note" role="status">Invitación general lista.</p>{/if}
{#if successMessage}<p class="ok-note" role="status">{successMessage}</p>{/if}
{#if inviteLink}
  <div class="invite-link-card app-card-soft" role="status" aria-live="polite">
    <p class="ok-note invite-link">
      Enlace: <a href={inviteLink}>{inviteLink}</a>
    </p>
    <div class="invite-link-actions">
      <button
        type="button"
        class="app-btn app-btn--secondary small"
        on:click={() => {
          onCopyLink(inviteLink)
        }}
      >
        Copiar enlace
      </button>
      <span class="inline-help">Compártelo por WhatsApp o email</span>
    </div>
    {#if copyStatus}
      <p class="copy-status" class:error={copyStatusTone === 'error'} role="status" aria-live="polite">
        {copyStatus}
      </p>
    {/if}
  </div>
{/if}
{#if errorMessage}<p class="error-note" role="alert">{errorMessage}</p>{/if}

<style lang="scss">
  .invite-row {
    --invite-focus-ring-shadow: 0 0 0 2px rgba(156, 123, 95, 0.18);
    display: flex;
    flex-wrap: wrap;
    gap: 10px;

    .modern-input {
      flex: 1 1 220px;
      min-height: 44px;
      padding: 0.52rem 0.76rem;
      border: none;
      border-radius: 10px;
      background: #f2ece4;
      font-size: 0.95rem;
      color: var(--text-main);
      box-shadow: var(--neu-shadow-inset);
      transition:
        box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease),
        background-color 0.2s var(--motion-standard);

      &:focus {
        outline: none;
        background: #f7f2ea;
        box-shadow:
          var(--neu-shadow-inset),
          var(--invite-focus-ring-shadow);
      }
    }
  }

  select {
    min-width: 170px;
    min-height: 44px;
    border: none;
    border-radius: 10px;
    background: #f2ece4;
    color: var(--text-main);
    padding: 0.4rem 0.6rem;
    font-size: var(--fs-sm);
    box-shadow: var(--neu-shadow-inset);
    transition:
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease),
      background-color 0.2s var(--motion-standard);

    &:focus {
      outline: none;
      background: #f7f2ea;
      box-shadow:
        var(--neu-shadow-inset),
        var(--invite-focus-ring-shadow);
    }
  }

  .app-btn.small {
    min-height: 34px;
    padding: 0.44rem 0.72rem;
    font-size: var(--fs-xs);
  }

  .ok-note {
    color: #16a31a;
    font-size: var(--fs-xs);
    margin: 0.5rem 0 0;

    &.invite-link {
      word-break: break-all;

      a {
        color: #8a4a22;
      }
    }
  }

  .invite-link-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 8px;

    .inline-help {
      color: var(--text-muted);
      font-size: var(--fs-2xs);
    }
  }

  .invite-link-card {
    margin-top: 0.5rem;
    padding: 8px 10px;
  }

  .copy-status {
    margin: 0.4rem 0 0;
    font-size: var(--fs-2xs);
    color: #166534;

    &.error {
      color: #b91c1c;
    }
  }

  .error-note {
    color: #dc2626;
    font-size: var(--fs-xs);
    margin: 0.5rem 0 0;
  }

  @media (max-width: 720px) {
    .invite-row {
      > * {
        width: 100%;
      }
    }
  }
</style>
