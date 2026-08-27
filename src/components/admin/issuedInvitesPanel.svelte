<script lang="ts">
  import { enhance } from '$app/forms'
  import ChipToggleGroup from '../ui/chipToggleGroup.svelte'
  import type { AdminInviteFilter, AdminInviteSummary } from './types'

  export let invites: AdminInviteSummary[] = []
  export let filteredInvites: AdminInviteSummary[] = []
  export let activeFamilyId = ''

  export let inviteFilter: AdminInviteFilter = 'all'
  export let inviteFilterOptions: Array<{ value: string; label: string }> = []
  export let onFilterChange: (event: CustomEvent<string>) => void = () => {}

  export let roleLabels: Record<string, string> = {}
  export let inviteTypeLabels: Record<string, string> = {}
  export let memberNameById: Map<string, string> = new Map()

  export let formatDate: (value: string | null) => string = () => 'Sin caducidad'
  export let inviteStatusLabel: (invite: AdminInviteSummary) => string = () => 'Activa'
  export let inviteStatusTone: (status: string) => string = () => 'muted'

  export let successMessage = ''
  export let errorMessage = ''
</script>

{#if invites.length > 0}
  <div class="invite-filters">
    <ChipToggleGroup
      ariaLabel="Filtrar invitaciones"
      options={inviteFilterOptions}
      value={inviteFilter}
      on:change={onFilterChange}
    />
  </div>

  <p class="filter-summary" aria-live="polite">
    Mostrando {filteredInvites.length} de {invites.length} invitaciones.
  </p>

  {#if filteredInvites.length === 0}
    <p class="empty-note app-card-soft">No hay resultados para este filtro.</p>
  {/if}

  <ul class="invites-list">
    {#each filteredInvites as invite (invite.id)}
      <li class="app-card-soft-raised">
        <span>
          {inviteTypeLabels[invite.type]}
          <small>Rol: {roleLabels[invite.role_on_signup]}</small>
          {#if invite.email}<small>Email: {invite.email}</small>{/if}
          {#if invite.member_id}
            <small>Miembro: {memberNameById.get(invite.member_id) ?? invite.member_id}</small>
          {/if}
          <small>Creada: {formatDate(invite.created_at)}</small>
          <small>Caduca: {formatDate(invite.expires_at)}</small>
          <small>
            Usos: {invite.uses_count}
            {#if invite.max_uses !== null}/ {invite.max_uses}{/if}
          </small>
          <small
            class:status-ok={inviteStatusTone(inviteStatusLabel(invite)) === 'ok'}
            class:status-warn={inviteStatusTone(inviteStatusLabel(invite)) === 'warn'}
            >Estado: {inviteStatusLabel(invite)}</small
          >
        </span>
        {#if !invite.revoked_at}
          <form method="POST" action="?/revokeInvite" use:enhance>
            <input type="hidden" name="familyId" value={activeFamilyId} />
            <input type="hidden" name="inviteId" value={invite.id} />
            <button type="submit" class="app-btn app-btn--danger small">Revocar</button>
          </form>
          {#if invite.type === 'general'}
            <form method="POST" action="?/regenerateInviteLink" use:enhance>
              <input type="hidden" name="familyId" value={activeFamilyId} />
              <input type="hidden" name="inviteId" value={invite.id} />
              <button type="submit" class="app-btn app-btn--secondary small"
                >Regenerar enlace</button
              >
            </form>
          {/if}
        {/if}
      </li>
    {/each}
  </ul>

  {#if successMessage}
    <p class="ok-note" role="status">{successMessage}</p>
  {/if}
  {#if errorMessage}
    <p class="error-note" role="alert">{errorMessage}</p>
  {/if}
{:else}
  <p class="empty-note app-card-soft">Todavía no has creado invitaciones en esta familia.</p>
{/if}

<style lang="scss">
  .invite-filters {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    margin-bottom: 8px;
  }

  .filter-summary {
    margin: 0 0 10px;
    color: var(--text-muted);
    font-size: var(--fs-2xs);
  }

  .invites-list {
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

  .status-ok {
    color: var(--feedback-success-soft-text);
    font-weight: 600;
  }

  .status-warn {
    color: var(--text-warning);
    font-weight: 600;
  }

  .app-btn.small {
    min-height: 34px;
    padding: 0.44rem 0.72rem;
    font-size: var(--fs-xs);
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

  .empty-note {
    font-size: var(--fs-sm);
    color: var(--text-muted);
    padding: 10px 12px;
  }
</style>
