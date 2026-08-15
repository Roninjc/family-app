<script lang="ts">
  import { enhance } from '$app/forms'

  type Member = {
    id: string
    name: string
    family_name: string
  }

  export let activeFamilyId = ''
  export let activeFamilyRole = 'viewer'
  export let members: Member[] = []

  export let memberEmail = ''
  export let memberId = ''
  export let memberRole = 'viewer'
  export let memberExpiry = 'none'

  export let invitedMember = ''
  export let inviteError = ''
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

{#if invitedMember}
  <p class="ok-note" role="status">
    Invitación vinculada lista para {invitedMember}.
  </p>
{/if}
{#if inviteError}<p class="error-note" role="alert">{inviteError}</p>{/if}

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
      background: var(--field-bg);
      font-size: 0.95rem;
      color: var(--text-main);

      &:focus {
        outline: none;
        border-color: var(--brand);
        box-shadow: 0 0 0 3px rgba(156, 90, 45, 0.16);
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
    background: var(--field-bg);
    color: var(--text-main);
    padding: 0.4rem 0.6rem;
    font-size: var(--fs-sm);
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
