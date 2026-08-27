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
  {onClose}
  size="compact"
>
  <div class="users-confirm-card family-settings-card" in:fade={{ duration: 140 }}>
    <div class="modal-heading">
      <h2 id="family-settings-title">Ajustes de familia</h2>
    </div>

    <form method="POST" action="?/updateFamilySettings" use:enhance class="modal-form">
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

      <div class="users-confirm-actions modal-form-actions">
        <button type="submit" class="app-btn app-btn--primary">Guardar</button>
      </div>
    </form>
  </div>
</ModalShell>

<style lang="scss">
  .users-confirm-card {
    h2 {
      margin: 0;
      font-size: var(--fs-lg);
      color: var(--text-main);
    }
  }

  .family-settings-card {
    position: relative;

    .users-confirm-actions {
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
    :global(.app-btn) {
      width: auto;
    }
  }

  .ok-note {
    color: var(--feedback-success-text);
    font-size: var(--fs-xs);
  }

  .error-note {
    color: var(--feedback-error-text);
    font-size: var(--fs-xs);
  }
</style>
