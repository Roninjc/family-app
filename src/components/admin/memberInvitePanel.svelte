<script lang="ts">
  import { enhance } from '$app/forms'
  import type { AdminMemberOption, AdminRole } from './types'

  export let activeFamilyId = ''
  export let activeFamilyRole: AdminRole | string = 'viewer'
  export let members: AdminMemberOption[] = []

  export let memberEmail = ''
  export let memberId = ''
  export let memberRole = 'viewer'
  export let memberExpiry = 'none'

  export let successMessage = ''
  export let errorMessage = ''
</script>

<form method="POST" action="?/inviteMember" use:enhance>
  <div class="invite-row member-row">
    <input type="hidden" name="familyId" value={activeFamilyId} />
    <input
      class="modern-input"
      type="email"
      name="email"
      placeholder="email@ejemplo.com"
      bind:value={memberEmail}
      required
    />
    <select name="memberId" bind:value={memberId} required>
      <option value="" disabled selected>Selecciona miembro…</option>
      {#each members as member (member.id)}
        <option value={member.id}>{member.name} {member.family_name}</option>
      {/each}
    </select>
    <select name="role" bind:value={memberRole}>
      <option value="viewer">Solo lectura</option>
      <option value="editor">Editor</option>
      {#if activeFamilyRole === 'admin'}
        <option value="admin">Administrador</option>
      {/if}
    </select>
    <select name="expiryPreset" bind:value={memberExpiry}>
      <option value="none">Sin caducidad</option>
      <option value="7d">Caduca en 7 días</option>
      <option value="30d">Caduca en 30 días</option>
    </select>
    <button class="app-btn app-btn--primary" type="submit">Crear invitación</button>
  </div>
</form>

{#if successMessage}
  <p class="ok-note" role="status">
    {successMessage}
  </p>
{/if}
{#if errorMessage}<p class="error-note" role="alert">{errorMessage}</p>{/if}

<style lang="scss">
  .invite-row {
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
        box-shadow 0.2s var(--motion-standard),
        background-color 0.2s var(--motion-standard);

      &:focus {
        outline: none;
        background: #f7f2ea;
        box-shadow:
          var(--neu-shadow-inset),
          0 0 0 2px rgba(156, 123, 95, 0.18);
      }
    }

    &.member-row {
      .modern-input {
        min-width: 220px;
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
      box-shadow 0.2s var(--motion-standard),
      background-color 0.2s var(--motion-standard);

    &:focus {
      outline: none;
      background: #f7f2ea;
      box-shadow:
        var(--neu-shadow-inset),
        0 0 0 2px rgba(156, 123, 95, 0.18);
    }
  }

  .ok-note {
    color: #16a31a;
    font-size: var(--fs-xs);
    margin: 0.5rem 0 0;
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
