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
        <button type="button" class="app-btn app-btn--secondary" on:click={onClose}>Cancelar</button>
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
    form {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .users-confirm-actions {
      margin-top: 0.1rem;
      gap: 8px;
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
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;
    margin-top: 12px;

    :global(.app-btn) {
      width: 100%;
      min-height: 42px;
    }

    @media (min-width: 640px) {
      grid-template-columns: 1fr 1fr;
    }
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
