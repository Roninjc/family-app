<script lang="ts">
  import type { AdminMemberOption, AdminUserDraft, AdminUserProfile } from './types'

  export let profiles: AdminUserProfile[] = []
  export let userDraftsById: Record<string, AdminUserDraft> = {}
  export let availableMembersByProfileId: Record<string, AdminMemberOption[]> = {}
  export let changesCount = 0
  export let successCount: number | undefined = undefined
  export let errorMessage = ''

  export let canEditRole: (profileRole: string) => boolean = () => false
  export let canEditLink: (profileId: string) => boolean = () => false
  export let canShowAdminRole: (profileRole: string, draftRole: string) => boolean = () => false
  export let onRoleChange: (profileId: string, event: Event) => void = () => {}
  export let onMemberChange: (profileId: string, event: Event) => void = () => {}
  export let onOpenConfirm: () => void = () => {}
</script>

<div class="bulk-save-row">
  <button
    type="button"
    class="app-btn app-btn--primary"
    on:click={onOpenConfirm}
    disabled={changesCount === 0}
  >
    Guardar cambios ({changesCount})
  </button>
</div>

<ul class="users-list list">
  {#each profiles as profile (profile.id)}
    <li class="app-card-soft-raised">
      <span class="user-name">{profile.display_name ?? profile.email}</span>
      <div class="user-edit-controls">
        <label>
          <span>Rol</span>
          <select
            value={userDraftsById[profile.id]?.role ?? profile.role}
            disabled={!canEditRole(profile.role)}
            on:change={(event) => onRoleChange(profile.id, event)}
          >
            {#if canShowAdminRole(profile.role, userDraftsById[profile.id]?.role ?? profile.role)}
              <option value="admin">Administrador</option>
            {/if}
            <option value="editor">Editor</option>
            <option value="viewer">Solo lectura</option>
          </select>
        </label>

        <label>
          <span>Vinculación</span>
          <select
            value={userDraftsById[profile.id]?.memberId ?? ''}
            disabled={!canEditLink(profile.id)}
            on:input={(event) => onMemberChange(profile.id, event)}
            on:change={(event) => onMemberChange(profile.id, event)}
          >
            <option value="">Sin vínculo</option>
            {#each availableMembersByProfileId[profile.id] ?? [] as member (member.id)}
              <option value={member.id}>
                {member.name}
                {member.family_name}
              </option>
            {/each}
          </select>
        </label>
      </div>
    </li>
  {/each}
</ul>

<div class="bulk-save-row bottom">
  <button
    type="button"
    class="app-btn app-btn--primary"
    on:click={onOpenConfirm}
    disabled={changesCount === 0}
  >
    Guardar cambios ({changesCount})
  </button>
</div>

{#if successCount !== undefined}
  <p class="ok-note" role="status">
    Cambios guardados: {successCount}
  </p>
{/if}
{#if errorMessage}<p class="error-note" role="alert">{errorMessage}</p>{/if}

<style lang="scss">
  .users-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;

    li {
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 10px 12px;
    }
  }

  .users-list li {
    .user-name {
      color: var(--text-main);
      font-size: var(--fs-sm);
      font-weight: 700;
    }

    .user-edit-controls {
      display: grid;
      grid-template-columns: repeat(2, minmax(180px, 1fr));
      gap: 8px;
      width: min(100%, 560px);

      label {
        display: flex;
        flex-direction: column;
        gap: 4px;

        span {
          color: var(--text-muted);
          font-size: var(--fs-2xs);
          font-weight: 600;
        }
      }
    }
  }

  .bulk-save-row {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;

    &.bottom {
      margin-top: 10px;
      margin-bottom: 0;
    }
  }

  select {
    min-width: 170px;
    min-height: 44px;
    border: none;
    border-radius: var(--radius-control);
    background: var(--field-bg);
    color: var(--text-main);
    padding: 0.4rem 0.6rem;
    font-size: var(--fs-sm);
  }

  .ok-note {
    color: var(--feedback-success-text);
    font-size: var(--fs-xs);
    margin: 0.5rem 0 0;
  }

  .error-note {
    color: var(--feedback-error-text);
    font-size: var(--fs-xs);
    margin: 0.5rem 0 0;
  }

  @media (max-width: 720px) {
    .users-list li .user-edit-controls {
      width: 100%;
      grid-template-columns: 1fr;
    }

    .bulk-save-row {
      justify-content: stretch;

      .app-btn {
        width: 100%;
      }
    }
  }
</style>
