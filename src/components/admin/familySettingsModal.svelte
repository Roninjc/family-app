<script lang="ts">
  import { enhance } from '$app/forms'
  import { fade } from 'svelte/transition'
  import ModalShell from '../ui/modalShell.svelte'

  export let open = false
  export let onClose: () => void = () => {}
  export let familySettingsFamilyId = ''
  export let familyNameDraft = ''
  export let successMessage = ''
  export let errorMessage = ''
</script>

<ModalShell
  {open}
  ariaLabel="Cerrar ajustes de familia"
  ariaLabelledby="family-settings-title"
  onClose={onClose}
  size="compact"
>
  <div class="users-confirm-card family-settings-card" in:fade={{ duration: 140 }}>
    <button
      type="button"
      class="modal-close-button"
      aria-label="Cerrar ajustes de familia"
      on:click={onClose}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z"
        />
      </svg>
    </button>

    <h2 id="family-settings-title">Ajustes de familia</h2>

    <form method="POST" action="?/updateFamilySettings" use:enhance>
      <input type="hidden" name="familyId" value={familySettingsFamilyId} />
      <div class="input-wrapper floating-input-wrapper family-settings-field">
        <input
          id="familySettingsName"
          class="modern-input"
          type="text"
          name="familyName"
          maxlength="80"
          bind:value={familyNameDraft}
          required
          autocomplete="off"
        />
        <label for="familySettingsName" class:label-active={familyNameDraft.length > 0}>
          Nombre de la familia
        </label>
      </div>

      {#if successMessage}
        <p class="ok-note" role="status">{successMessage}</p>
      {/if}
      {#if errorMessage}
        <p class="error-note" role="alert">{errorMessage}</p>
      {/if}

      <div class="users-confirm-actions">
        <button type="submit" class="app-btn app-btn--primary">Guardar</button>
      </div>
    </form>
  </div>
</ModalShell>

<style lang="scss">
  .users-confirm-card {
    h2 {
      margin: 0 0 1rem;
      font-size: var(--fs-lg);
      color: #4a3426;
    }
  }

  .family-settings-card {
    position: relative;

    form {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .users-confirm-actions {
      margin-top: 0.1rem;
      gap: 8px;
      justify-content: flex-end;
    }

    .ok-note,
    .error-note {
      margin: 0;
    }
  }

  .family-settings-field {
    margin: 0 0 1.5rem;
  }

  .users-confirm-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
    margin-top: 12px;

    :global(.app-btn) {
      width: auto;
      min-width: 132px;
      min-height: 42px;
    }
  }

  .modal-close-button {
    position: absolute;
    top: 0;
    right: 0;
    width: 34px;
    height: 34px;
    border: none;
    border-radius: 10px;
    background: #efe7dc;
    color: #1f1f1f;
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow:
      3px 3px 8px rgba(149, 121, 95, 0.14),
      -3px -3px 8px rgba(255, 255, 255, 0.6);
    transition:
      background-color 0.2s var(--motion-standard),
      box-shadow 0.2s var(--motion-standard),
      color 0.2s var(--motion-standard);
  }

  .modal-close-button svg {
    width: 16px;
    height: 16px;
    fill: currentColor;
  }

  .modal-close-button:hover {
    background: #f4ede4;
    box-shadow: var(--neu-shadow-hover-strong);
  }

  .ok-note {
    color: #16a31a;
    font-size: var(--fs-xs);
  }

  .error-note {
    color: #dc2626;
    font-size: var(--fs-xs);
  }
</style>
