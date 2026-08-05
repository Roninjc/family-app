<script lang="ts">
  import type { FamilyMember } from '$lib/types/familyTypes'
  import { enhance } from '$app/forms'
  import { invalidateAll } from '$app/navigation'
  import { page } from '$app/stores'
  import { canEdit } from '$lib/types/auth'
  import { editingMemberId, showEditMemberModal } from '../stores/modals'
  import LiquidGlassWrapper from './liquidGlassWrapper.svelte'

  let name = ''
  let familyName = ''
  let birthDate = ''
  let error = ''
  let submitting = false
  let confirmingDelete = false

  $: familyMembers = ($page.data.familyData?.members ?? []) as FamilyMember[]
  $: member = $editingMemberId ? familyMembers.find((m) => m.id === $editingMemberId) : undefined
  $: editable = canEdit($page.data.profile)

  // Precarga los campos cada vez que se abre el modal
  $: if ($showEditMemberModal && member) loadMember(member)

  function loadMember(m: FamilyMember) {
    name = m.name
    familyName = m.familyName
    birthDate = m.birthDate ?? ''
    error = ''
    confirmingDelete = false
  }

  function closeModal() {
    showEditMemberModal.set(false)
    editingMemberId.set(null)
  }

  const enhanceMemberForm = () => {
    submitting = true

    return async ({ result }: { result: import('@sveltejs/kit').ActionResult }) => {
      submitting = false

      if (result.type === 'success') {
        closeModal()
        await invalidateAll()
      } else if (result.type === 'failure') {
        error = String(result.data?.editError ?? 'No se pudo guardar el cambio.')
      } else if (result.type === 'error') {
        error = 'No se pudo guardar el cambio.'
      }
    }
  }
</script>

{#if $showEditMemberModal && member}
  <div
    class="edit-member-modal-backdrop"
    role="button"
    tabindex="0"
    aria-label="Cerrar el modal de edición"
    on:click|stopPropagation={closeModal}
    on:keydown={(e) => {
      if (e.key === 'Escape') closeModal()
    }}
  >
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="edit-member-modal" role="banner" on:click|stopPropagation>
      <LiquidGlassWrapper>
        <h2>{member.name} {member.familyName}</h2>
        <form method="POST" action="?/updateMember" use:enhance={enhanceMemberForm}>
          <input type="hidden" name="memberId" value={member.id} />
          <div class="input-wrapper">
            <input
              id="editMemberName"
              class="modern-input"
              type="text"
              name="name"
              bind:value={name}
              required
              disabled={!editable}
              autocomplete="off"
            />
            <label for="editMemberName" class:label-active={name.length > 0}>Nombre</label>
          </div>
          <div class="input-wrapper">
            <input
              id="editMemberFamilyName"
              class="modern-input"
              type="text"
              name="familyName"
              bind:value={familyName}
              required
              disabled={!editable}
              autocomplete="off"
            />
            <label for="editMemberFamilyName" class:label-active={familyName.length > 0}>
              Apellidos
            </label>
          </div>
          <div class="input-wrapper">
            <input
              id="editMemberBirthDate"
              class="modern-input"
              type="date"
              name="birthDate"
              max={new Date().toISOString().split('T')[0]}
              bind:value={birthDate}
              disabled={!editable}
              autocomplete="off"
            />
            <label for="editMemberBirthDate" class:label-active={birthDate && birthDate.length > 0}>
              Fecha de nacimiento
            </label>
          </div>
          {#if editable}
            <button type="submit" disabled={submitting}>
              {submitting ? 'Guardando…' : 'Guardar cambios'}
            </button>
          {/if}
        </form>
        {#if editable}
          <div class="danger-zone">
            {#if !confirmingDelete}
              <button
                type="button"
                class="delete-button"
                on:click={() => (confirmingDelete = true)}
              >
                Eliminar miembro
              </button>
            {:else}
              <p class="delete-warning">
                Se eliminará a {member.name} y todas sus relaciones. ¿Seguro?
              </p>
              <form method="POST" action="?/deleteMember" use:enhance={enhanceMemberForm}>
                <input type="hidden" name="memberId" value={member.id} />
                <div class="delete-actions">
                  <button type="button" on:click={() => (confirmingDelete = false)}>
                    Cancelar
                  </button>
                  <button type="submit" class="delete-button" disabled={submitting}>
                    {submitting ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                </div>
              </form>
            {/if}
          </div>
        {/if}
        {#if error}
          <div class="form-error">{error}</div>
        {/if}
      </LiquidGlassWrapper>
    </div>
  </div>
{/if}

<style lang="scss">
  .edit-member-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.4);
    z-index: 999;

    .edit-member-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 16px;
      background-color: rgba(255, 255, 255, 0.3);
      z-index: 1000;
      min-width: 280px;

      h2 {
        margin-top: 0;
        margin-bottom: 1rem;
        text-wrap: nowrap;
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

          &::-webkit-calendar-picker-indicator {
            filter: invert(38%) brightness(95%) contrast(80%);
          }

          &:focus {
            outline: none;
            border-color: #7c3aed;
            box-shadow: 0 2px 8px rgba(124, 58, 237, 0.12);
            background: #fff;
          }

          &:disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }
        }

        label {
          position: absolute;
          top: 2px;
          left: 12px;
          font-size: 0.8rem;
          color: #7c3aed;
          background: #fafafa;
          transform: translateY(-60%);
          padding: 0 6px;
          border-radius: 6px;
          pointer-events: none;
        }
      }

      button {
        width: 100%;
        padding: 10px;
        background-color: #096bc1bb;
        color: white;
        border: none;
        border-radius: 9px;
        cursor: pointer;
        transition: scale 0.2s;

        &:hover {
          background-color: #096bc1e5;
          scale: 1.05;
        }

        &[type='submit'] {
          background-color: #16a31aa0;

          &:hover {
            background-color: #0bbe11b3;
          }
        }
      }

      .danger-zone {
        margin-top: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .delete-warning {
          margin: 0;
          font-size: 0.9rem;
          color: #7f1d1d;
        }

        .delete-actions {
          display: flex;
          gap: 1rem;
        }

        button.delete-button {
          background-color: #dc2626b3;

          &:hover {
            background-color: #dc2626e5;
          }
        }
      }

      .form-error {
        margin-top: 1rem;
        color: #dc2626;
        font-size: 0.9rem;
      }
    }
  }

  :global(.edit-member-modal .liquid-glass-text-container) {
    flex-direction: column;
    padding: 30px 20px 20px;
  }
</style>
