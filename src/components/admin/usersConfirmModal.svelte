<script lang="ts">
  import { enhance } from '$app/forms'
  import { fade } from 'svelte/transition'
  import ModalShell from '../ui/modalShell.svelte'

  export let open = false
  export let onClose: () => void = () => {}
  export let usersChanges: Array<{
    profileId: string
    displayName: string
    roleChanged: boolean
    previousRole: string
    nextRole: string
    linkChanged: boolean
    previousMemberId: string | null
    nextMemberId: string | null
  }> = []
  export let roleLabels: Record<string, string> = {}
  export let roleChangesCount = 0
  export let linkChangesCount = 0
  export let activeFamilyId = ''
  export let usersChangesJson = '[]'
  export let usersSaveEnhance: import('@sveltejs/kit').SubmitFunction | undefined = undefined
  export let memberDisplayName: (memberId: string) => string = () => 'Sin vínculo'
</script>

<ModalShell
  {open}
  ariaLabel="Cerrar confirmación"
  ariaLabelledby="users-save-title"
  onClose={onClose}
  size="wide"
>
  <div class="users-confirm-card" in:fade={{ duration: 140 }}>
    <div class="modal-heading">
      <h2 id="users-save-title">Confirmar cambios</h2>
    </div>

    {#if usersChanges.length > 0}
      <div class="users-summary-grid app-stat-grid" role="status" aria-live="polite">
        <p class="app-stat-item">
          <strong>{usersChanges.length}</strong>
          <span>Total</span>
        </p>
        <p class="app-stat-item">
          <strong>{roleChangesCount}</strong>
          <span>Roles</span>
        </p>
        <p class="app-stat-item">
          <strong>{linkChangesCount}</strong>
          <span>Vínculos</span>
        </p>
      </div>

      <ul class="users-changes-list">
        {#each usersChanges as change (change.profileId)}
          <li class="app-card-soft-raised">
            <strong>{change.displayName}</strong>
            {#if change.roleChanged}
              <small>Rol: {roleLabels[change.previousRole]} → {roleLabels[change.nextRole]}</small>
            {/if}
            {#if change.linkChanged}
              <small>
                Vínculo: {memberDisplayName(change.previousMemberId ?? '')} →
                {memberDisplayName(change.nextMemberId ?? '')}
              </small>
            {/if}
          </li>
        {/each}
      </ul>

      <form method="POST" action="?/saveUsers" use:enhance={usersSaveEnhance} class="modal-form">
        <input type="hidden" name="familyId" value={activeFamilyId} />
        <input type="hidden" name="changesJson" value={usersChangesJson} />
        <div class="users-confirm-actions modal-form-actions">
          <button type="button" class="app-btn app-btn--secondary" on:click={onClose}>Cancelar</button>
          <button type="submit" class="app-btn app-btn--primary">Confirmar y guardar</button>
        </div>
      </form>
    {:else}
      <p class="users-confirm-summary">No hay cambios para guardar.</p>
      <div class="users-confirm-actions modal-form-actions">
        <button type="button" class="app-btn app-btn--secondary" on:click={onClose}>Cerrar</button>
      </div>
    {/if}
  </div>
</ModalShell>

<style lang="scss">
  .users-confirm-card {
    h2 {
      margin: 0;
      font-size: var(--fs-lg);
      color: #4a3426;
    }
  }

  .users-summary-grid {
    margin-top: 12px;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .users-changes-list {
    list-style: none;
    margin: 12px 0 0;
    padding: 0;
    max-height: min(42vh, 360px);
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 8px;

    li {
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;

      strong {
        font-size: var(--fs-sm);
        color: #4a3426;
      }

      small {
        font-size: var(--fs-xs);
        color: var(--text-muted);
      }
    }
  }

  .users-confirm-actions {
    justify-content: flex-end;

    :global(.app-btn) {
      width: auto;
      min-height: 42px;
    }
  }
</style>
