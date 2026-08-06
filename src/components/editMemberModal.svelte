<script lang="ts">
  import type { FamilyMember } from '$lib/types/familyTypes'
  import { fade } from 'svelte/transition'
  import { enhance } from '$app/forms'
  import { invalidateAll } from '$app/navigation'
  import { page } from '$app/stores'
  import { canEdit } from '$lib/types/auth'
  import { suggestedChildren, suggestedParents } from '$lib/utils/relationSuggestions'
  import { editingMemberId, showEditMemberModal } from '../stores/modals'
  import LiquidGlassWrapper from './liquidGlassWrapper.svelte'
  import RelationChipsEditor from './relationChipsEditor.svelte'

  let name = ''
  let familyName = ''
  let birthDate = ''
  let error = ''
  let submitting = false
  let confirmingDelete = false
  let activeSection: 'datos' | 'relaciones' | 'peligro' = 'datos'
  let loadedMemberId: string | null = null
  let canSubmitEdit = false

  $: familyMembers = ($page.data.familyData?.members ?? []) as FamilyMember[]
  $: member = $editingMemberId ? familyMembers.find((m) => m.id === $editingMemberId) : undefined
  $: editable = canEdit($page.data.profile)
  $: canSubmitEdit = editable && name.trim().length > 0 && familyName.trim().length > 0 && !submitting

  // Preload the fields when the modal opens or the member changes. Compared by
  // id (not by reference) so half-edited personal fields aren't clobbered when
  // invalidateAll refreshes the data after saving a relation.
  $: if ($showEditMemberModal && member && member.id !== loadedMemberId) loadMember(member)
  $: if (!$showEditMemberModal) loadedMemberId = null

  // Anyone already related to the member (or the member itself) is not
  // selectable in any other relation group
  $: relatedOrSelfIds = member
    ? [
        member.id,
        ...member.parents,
        ...member.children,
        ...member.siblings,
        ...member.partner,
        ...member.previousPartners
      ]
    : []

  // Siblings of the member's children not recorded as their children: one-click suggestion
  $: suggestedChildrenList = member
    ? suggestedChildren(member.children, relatedOrSelfIds, familyMembers)
    : []
  // Parents of the member's siblings not recorded as their parents: likewise
  $: suggestedParentsList = member ? suggestedParents(member, relatedOrSelfIds, familyMembers) : []

  function loadMember(m: FamilyMember) {
    loadedMemberId = m.id
    name = m.name
    familyName = m.familyName
    birthDate = m.birthDate ?? ''
    error = ''
    confirmingDelete = false
    activeSection = 'datos'
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
    <div
      class="edit-member-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-member-title"
      on:click|stopPropagation
    >
      <LiquidGlassWrapper>
        <h2 id="edit-member-title">{member.name} {member.familyName}</h2>
        {#if !editable}
          <p class="viewer-note" role="status">
            Estás en modo solo lectura. Puedes explorar vínculos y datos sin editar.
          </p>
        {/if}
        <div class="section-tabs" role="tablist" aria-label="Secciones de edición">
          <button
            type="button"
            role="tab"
            class:active={activeSection === 'datos'}
            aria-selected={activeSection === 'datos'}
            on:click={() => {
              activeSection = 'datos'
            }}
          >
            Datos
          </button>
          <button
            type="button"
            role="tab"
            class:active={activeSection === 'relaciones'}
            aria-selected={activeSection === 'relaciones'}
            on:click={() => {
              activeSection = 'relaciones'
            }}
          >
            Relaciones
          </button>
          {#if editable}
            <button
              type="button"
              role="tab"
              class:active={activeSection === 'peligro'}
              aria-selected={activeSection === 'peligro'}
              on:click={() => {
                activeSection = 'peligro'
              }}
            >
              Riesgo
            </button>
          {/if}
        </div>

        {#if activeSection === 'datos'}
          <div transition:fade={{ duration: 140 }}>
          <form method="POST" action="?/updateMember" use:enhance={enhanceMemberForm}>
            <input type="hidden" name="memberId" value={member.id} />
            <div class="input-wrapper floating-input-wrapper">
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
            <div class="input-wrapper floating-input-wrapper">
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
            <div class="input-wrapper floating-input-wrapper">
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
              <label
                for="editMemberBirthDate"
                class:label-active={birthDate && birthDate.length > 0}
              >
                Fecha de nacimiento
              </label>
            </div>
            {#if editable}
              <button type="submit" disabled={!canSubmitEdit}>
                {submitting ? 'Guardando…' : 'Guardar cambios'}
              </button>
            {/if}
          </form>
          {#if editable}
            <a class="app-btn app-btn--secondary invite-member-button" href={`/admin?memberId=${member.id}`}>
              Invitar por email
            </a>
          {/if}
          </div>
        {/if}

        {#if activeSection === 'relaciones'}
          <div class="relations-section" transition:fade={{ duration: 140 }}>
            <h3>Relaciones</h3>
            <RelationChipsEditor
              label="Padres"
              addPlaceholder="Añadir padre/madre…"
              memberId={member.id}
              kind="parent"
              relatedIds={member.parents}
              excludedIds={relatedOrSelfIds}
              members={familyMembers}
              {editable}
              maxItems={2}
              suggested={suggestedParentsList}
              suggestedLabel="¿Son sus padres?"
              on:error={(e) => (error = e.detail)}
            />
            <RelationChipsEditor
              label="Hijos"
              addPlaceholder="Añadir hijo/a…"
              memberId={member.id}
              kind="child"
              relatedIds={member.children}
              excludedIds={relatedOrSelfIds}
              members={familyMembers}
              {editable}
              suggested={suggestedChildrenList}
              suggestedLabel="¿Son también hijos/as?"
              on:error={(e) => (error = e.detail)}
            />
            <RelationChipsEditor
              label="Hermanos"
              addPlaceholder="Añadir hermano/a…"
              memberId={member.id}
              kind="sibling"
              relatedIds={member.siblings}
              excludedIds={relatedOrSelfIds}
              members={familyMembers}
              {editable}
              on:error={(e) => (error = e.detail)}
            />
            <RelationChipsEditor
              label="Pareja"
              addPlaceholder="Añadir pareja…"
              memberId={member.id}
              kind="partner"
              relatedIds={member.partner}
              excludedIds={relatedOrSelfIds}
              members={familyMembers}
              {editable}
              maxItems={1}
              on:error={(e) => (error = e.detail)}
            />
            <RelationChipsEditor
              label="Exparejas"
              addPlaceholder="Añadir expareja…"
              memberId={member.id}
              kind="previous_partner"
              relatedIds={member.previousPartners}
              excludedIds={relatedOrSelfIds}
              members={familyMembers}
              {editable}
              on:error={(e) => (error = e.detail)}
            />
          </div>
        {/if}

        {#if editable && activeSection === 'peligro'}
          <div class="danger-zone" transition:fade={{ duration: 140 }}>
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
        margin-bottom: 0.75rem;
        text-wrap: nowrap;
      }

      .section-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 1rem;

        button {
          flex: 1 1 auto;
          min-height: 36px;
          padding: 6px 8px;
          border: 1px solid rgba(255, 255, 255, 0.7);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.62);
          color: var(--text-main);
          font-size: var(--fs-xs);
          font-weight: 700;
          transition:
            transform 0.2s var(--motion-standard),
            background-color 0.2s var(--motion-standard),
            border-color 0.2s var(--motion-standard),
            color 0.2s var(--motion-standard),
            box-shadow 0.2s var(--motion-standard);

          &:hover {
            background: rgba(255, 248, 239, 0.74);
            border-color: rgba(255, 240, 223, 0.82);
            transform: translateY(-1px);
            box-shadow: 0 8px 14px rgba(99, 54, 25, 0.12);
          }

          &.active {
            background: rgba(156, 90, 45, 0.16);
            border-color: rgba(156, 90, 45, 0.3);
            color: #7e4520;
          }
        }
      }

      .viewer-note {
        margin: 0 0 0.8rem;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(255, 247, 236, 0.76);
        border: 1px solid rgba(223, 194, 165, 0.62);
        color: var(--text-muted);
        font-size: var(--fs-xs);
      }

      form {
        display: flex;
        flex-direction: column;
      }

      .input-wrapper {
        margin-bottom: 1.5rem;
      }

      button {
        width: 100%;
        min-height: 42px;
        padding: 10px;
        background: linear-gradient(140deg, #b46a3a, #c77c43);
        color: #fffaf6;
        border: 1px solid rgba(131, 71, 35, 0.58);
        border-radius: 10px;
        cursor: pointer;
        transition:
          transform 0.22s var(--motion-standard),
          box-shadow 0.22s var(--motion-standard),
          background-color 0.22s var(--motion-standard),
          border-color 0.22s var(--motion-standard);

        &:hover {
          background: #b36b3a;
          border-color: rgba(131, 71, 35, 0.66);
          transform: translateY(-1px);
          box-shadow: 0 8px 14px rgba(99, 54, 25, 0.12);
        }

        &[type='submit'] {
          background: linear-gradient(140deg, #2f7b61, #3b8f71);
          border-color: rgba(40, 105, 83, 0.62);

          &:hover {
            background: #337e64;
            border-color: rgba(40, 105, 83, 0.72);
            transform: translateY(-1px);
            box-shadow: 0 8px 14px rgba(47, 123, 97, 0.18);
          }

          &:disabled,
          &:disabled:hover {
            background-color: #c3ccd6;
            color: #5c6673;
            border: 1px solid #aeb8c5;
          }
        }

        &:disabled {
          opacity: 1;
          cursor: not-allowed;
          scale: 1;
          background: #c3ccd6;
          color: #5c6673;
          border: 1px solid #aeb8c5;
          box-shadow: none;
        }
      }

      .relations-section {
        margin-top: 0.5rem;

        h3 {
          margin: 0 0 0.8rem;
          font-size: var(--fs-md);
        }
      }

      .invite-member-button {
        margin: 0.75rem 0 0.25rem;
        width: 100%;
        min-height: 40px;
        border-radius: 10px;
        font-size: var(--fs-xs);
      }

      .danger-zone {
        margin-top: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        .delete-warning {
          margin: 0;
          font-size: var(--fs-sm);
          color: #7f1d1d;
        }

        .delete-actions {
          display: flex;
          gap: 1rem;
        }

        button.delete-button {
          background-color: #dc2626b3;
          border-color: rgba(139, 29, 29, 0.55);

          &:hover {
            background: #c83434;
            border-color: rgba(139, 29, 29, 0.65);
            transform: translateY(-1px);
            box-shadow: 0 8px 14px rgba(139, 29, 29, 0.18);
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
    align-items: stretch;
    // flex-start: with justify-content center (the wrapper's default), content
    // overflowing at the top gets clipped and unreachable by scrolling
    justify-content: flex-start;
    padding: 30px 20px 20px;
    box-sizing: border-box;
    width: 340px;
    // The modal grows with the relations: internal scroll on short screens
    max-height: 80vh;
    overflow-y: auto;
  }
</style>
