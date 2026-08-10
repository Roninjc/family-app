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
  let activeSection: 'datos' | 'relaciones' | 'ajustes' = 'datos'
  let loadedMemberId: string | null = null
  let canSubmitEdit = false
  let originalName = ''
  let originalFamilyName = ''
  let originalBirthDate = ''

  type MemberWithAvatar = FamilyMember & {
    avatarUrl?: string
    photoUrl?: string
    imageUrl?: string
    image?: string
  }

  $: familyMembers = ($page.data.familyData?.members ?? []) as FamilyMember[]
  $: member = $editingMemberId ? familyMembers.find((m) => m.id === $editingMemberId) : undefined
  $: editable = canEdit($page.data.profile)
  $: normalizedBirthDate = normalizeBirthDate(birthDate)
  $: normalizedOriginalBirthDate = normalizeBirthDate(originalBirthDate)
  $: isDirty =
    name.trim() !== originalName.trim() ||
    familyName.trim() !== originalFamilyName.trim() ||
    normalizedBirthDate !== normalizedOriginalBirthDate
  $: canSubmitEdit =
    editable && name.trim().length > 0 && familyName.trim().length > 0 && isDirty && !submitting
  $: memberAvatar = member ? getMemberAvatar(member as MemberWithAvatar) : ''
  $: memberInitials = member ? getMemberInitials(member.name, member.familyName) : ''

  // Preload the fields when the modal opens or the member changes. Compared by
  // id (not by reference) so half-edited personal fields aren't clobbered when
  // invalidateAll refreshes the data after saving a relation.
  $: if ($showEditMemberModal && member && member.id !== loadedMemberId) loadMember(member)
  $: if (!$showEditMemberModal) {
    loadedMemberId = null
    resetEditState()
  }

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
    const normalizedMemberBirthDate = normalizeBirthDate(m.birthDate)

    loadedMemberId = m.id
    name = m.name
    familyName = m.familyName
    birthDate = normalizedMemberBirthDate
    originalName = m.name
    originalFamilyName = m.familyName
    originalBirthDate = normalizedMemberBirthDate
    error = ''
    confirmingDelete = false
    activeSection = 'datos'
  }

  function closeModal() {
    resetEditState()
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

  function getMemberAvatar(m: MemberWithAvatar): string {
    return m.avatarUrl ?? m.photoUrl ?? m.imageUrl ?? m.image ?? ''
  }

  function getMemberInitials(firstName: string, lastName: string): string {
    const firstInitial = firstName?.trim().charAt(0) ?? ''
    const lastInitial = lastName?.trim().charAt(0) ?? ''
    return `${firstInitial}${lastInitial}`.toUpperCase()
  }

  function resetEditState() {
    name = ''
    familyName = ''
    birthDate = ''
    originalName = ''
    originalFamilyName = ''
    originalBirthDate = ''
    error = ''
    confirmingDelete = false
    activeSection = 'datos'
  }

  function normalizeBirthDate(value: string | undefined): string {
    if (!value) return ''
    const trimmed = value.trim()
    if (!trimmed) return ''
    return trimmed.split('T')[0]
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
        <div class="member-header">
          <div class="member-avatar" aria-hidden="true">
            {#if memberAvatar}
              <img src={memberAvatar} alt="" loading="lazy" decoding="async" />
            {:else}
              {memberInitials}
            {/if}
          </div>
          <h2 id="edit-member-title">{member.name} {member.familyName}</h2>
        </div>
        {#if !editable}
          <p class="viewer-note" role="status">
            Estás en modo solo lectura. Puedes explorar vínculos y datos sin editar.
          </p>
        {/if}
        <div class="section-row">
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
          </div>
          {#if editable}
            <button
              type="button"
              class="settings-tab"
              class:active={activeSection === 'ajustes'}
              title="Ajustes"
              aria-label="Abrir ajustes"
              on:click={() => {
                activeSection = 'ajustes'
              }}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M19.14 12.94a7.9 7.9 0 0 0 .05-.94 7.9 7.9 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.27 7.27 0 0 0-1.63-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.8a.5.5 0 0 0-.49.42l-.36 2.54a7.27 7.27 0 0 0-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.71 8.48a.5.5 0 0 0 .12.64l2.03 1.58a7.9 7.9 0 0 0-.05.94 7.9 7.9 0 0 0 .05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.39 1.05.71 1.63.94l.36 2.54a.5.5 0 0 0 .49.42h3.8a.5.5 0 0 0 .49-.42l.36-2.54c.58-.23 1.13-.55 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.4A3.4 3.4 0 1 1 12 8.6a3.4 3.4 0 0 1 0 6.8Z"
                />
              </svg>
            </button>
          {/if}
        </div>

        {#if activeSection === 'datos'}
          <div in:fade={{ duration: 140 }}>
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
          </div>
        {/if}

        {#if activeSection === 'relaciones'}
          <div class="relations-section" in:fade={{ duration: 140 }}>
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

        {#if editable && activeSection === 'ajustes'}
          <div class="settings-section" in:fade={{ duration: 140 }}>
            <div class="settings-actions">
              <h3>Ajustes</h3>
              <p>Acciones sensibles y administración de acceso para este miembro.</p>
              <a class="app-btn app-btn--secondary invite-member-button" href={`/admin?memberId=${member.id}`}>
                Invitar por email
              </a>
            </div>

            <div class="danger-zone">
              <h4>Zona de peligro</h4>
              {#if !confirmingDelete}
                <button
                  type="button"
                  class="delete-button delete-button--normal"
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
                    <button
                      type="button"
                      class="delete-button delete-button--featured delete-button--cancel"
                      on:click={() => (confirmingDelete = false)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      class="delete-button delete-button--normal"
                      disabled={submitting}
                    >
                      {submitting ? 'Eliminando…' : 'Sí, eliminar'}
                    </button>
                  </div>
                </form>
              {/if}
            </div>
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
    background: rgba(241, 236, 228, 0.68);
    backdrop-filter: blur(2px);
    z-index: 999;

    .edit-member-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 16px;
      background-color: transparent;
      z-index: 1000;
      min-width: 280px;

      .member-header {
        display: flex;
        align-items: center;
        gap: 0.7rem;
        margin: 0 0 1.15rem;

        h2 {
          margin: 0;
          text-wrap: nowrap;
        }
      }

      .member-avatar {
        width: 42px;
        height: 42px;
        flex: 0 0 42px;
        border-radius: 50%;
        overflow: hidden;
        display: grid;
        place-items: center;
        font-size: 0.84rem;
        font-weight: 800;
        color: #6d4f3a;
        background: #f3ede5;
        box-shadow:
          inset 3px 3px 7px rgba(154, 132, 109, 0.18),
          inset -3px -3px 7px rgba(255, 255, 255, 0.82);

        img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
      }

      .section-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.6rem;
        margin-bottom: 1rem;
      }

      .section-tabs {
        display: flex;
        gap: 8px;
        flex: 1 1 auto;

        button {
          flex: 1 1 auto;
          min-height: 36px;
          padding: 6px 8px;
          border: none;
          border-radius: 10px;
          background: var(--neu-surface-soft);
          box-shadow: var(--neu-shadow-out-soft);
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
            background: #f6f1ea;
            transform: translateY(-1px);
            box-shadow: var(--neu-shadow-out-soft);
          }

          &.active {
            background: rgba(149, 121, 95, 0.14);
            color: #7e4520;
            box-shadow: var(--neu-shadow-inset);
          }
        }
      }

      .settings-tab {
        width: 38px;
        min-height: 38px;
        padding: 8px;
        border-radius: 12px;
        background: #efe7dc;
        color: #1f1f1f;
        box-shadow:
          4px 4px 10px rgba(149, 121, 95, 0.14),
          -4px -4px 10px rgba(255, 255, 255, 0.6);

        svg {
          display: block;
          width: 18px;
          height: 18px;
          fill: currentColor;
          margin: 0 auto;
        }

        &:hover {
          background: #f3ece2;
          color: #111111;
          transform: translateY(-1px);
          box-shadow:
            6px 6px 12px rgba(149, 121, 95, 0.15),
            -5px -5px 12px rgba(255, 255, 255, 0.72);
        }

        &.active {
          background: #ebe1d4;
          color: #6c3d20;
          box-shadow:
            inset 3px 3px 7px rgba(149, 121, 95, 0.2),
            inset -3px -3px 7px rgba(255, 255, 255, 0.75);
          border-color: rgba(126, 69, 32, 0.22);
        }
      }

      .viewer-note {
        margin: 0 0 0.8rem;
        padding: 8px 10px;
        border-radius: 10px;
        background: rgba(255, 247, 236, 0.76);
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
        background: #dac7b1;
        color: #4a392c;
        border: none;
        border-radius: 10px;
        cursor: pointer;
        transition:
          transform 0.22s var(--motion-standard),
          box-shadow 0.22s var(--motion-standard),
          background-color 0.22s var(--motion-standard),
          border-color 0.22s var(--motion-standard);

        &:hover {
          background: #e0cfba;
          transform: translateY(-1px);
          box-shadow: var(--neu-shadow-out-soft);
        }

        &[type='submit'] {
          background: #d8dece;
          color: #4d5a43;
          box-shadow:
            5px 5px 12px rgba(124, 137, 108, 0.2),
            -5px -5px 12px rgba(250, 254, 246, 0.82);

          &:hover {
            background: #dfe6d5;
            transform: translateY(-1px);
            box-shadow:
              7px 7px 14px rgba(124, 137, 108, 0.24),
              -6px -6px 14px rgba(252, 255, 250, 0.86);
          }

          &:disabled,
          &:disabled:hover {
            background-color: #d3d8cb;
            color: #747f6a;
            box-shadow: none;
          }
        }

        &:disabled {
          opacity: 1;
          cursor: not-allowed;
          scale: 1;
          background: #c3ccd6;
          color: #5c6673;
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

      .settings-section {
        margin-top: 0.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
      }

      .settings-actions {
        padding: 0.75rem;
        border-radius: 12px;
        background: rgba(250, 244, 233, 0.65);
        border: 1px solid rgba(149, 121, 95, 0.2);

        h3 {
          margin: 0 0 0.35rem;
          font-size: var(--fs-md);
          color: #5f4632;
        }

        p {
          margin: 0 0 0.7rem;
          color: var(--text-muted);
          font-size: var(--fs-xs);
        }
      }

      .invite-member-button {
        margin: 0;
        width: 100%;
        min-height: 40px;
        border-radius: 10px;
        font-size: var(--fs-xs);
        background: #f1e7da;
        border: none;
        color: #6f4b31;
        box-shadow:
          5px 5px 12px rgba(149, 121, 95, 0.13),
          -5px -5px 12px rgba(255, 255, 255, 0.68);

        &:hover {
          background: #f6ede2;
          box-shadow:
            7px 7px 14px rgba(149, 121, 95, 0.15),
            -6px -6px 14px rgba(255, 255, 255, 0.75);
        }
      }

      .danger-zone {
        margin-top: 0;
        padding: 0.8rem;
        border-radius: 12px;
        border: 1px solid rgba(208, 124, 124, 0.45);
        background: rgba(255, 237, 237, 0.55);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;

        h4 {
          margin: 0;
          font-size: var(--fs-sm);
          font-weight: 800;
          color: #8c2d2d;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

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
          color: #6e2424;
        }

        button.delete-button--normal {
          background: #f0dbd6;
          box-shadow:
            5px 5px 12px rgba(140, 88, 88, 0.2),
            -5px -5px 12px rgba(255, 251, 251, 0.68);

          &:hover {
            background: #f4e2dd;
            transform: translateY(-1px);
            box-shadow:
              7px 7px 14px rgba(140, 88, 88, 0.23),
              -6px -6px 14px rgba(255, 253, 253, 0.78);
          }

          &:active {
            transform: translateY(0);
            box-shadow:
              inset 4px 4px 8px rgba(140, 88, 88, 0.2),
              inset -4px -4px 8px rgba(255, 251, 251, 0.58);
          }
        }

        button.delete-button--featured {
          background: linear-gradient(145deg, #efe1de, #dcc3bd);
          border: 3px solid #f0e2de;
          box-shadow:
            6px 6px 14px rgba(140, 88, 88, 0.26),
            -6px -6px 14px rgba(255, 252, 252, 0.75),
            inset 5px 4px 6px rgba(132, 84, 84, 0.09),
            inset -4px -3px 7px rgba(255, 250, 250, 0.34);

          &:hover {
            transform: translateY(-1px);
            box-shadow:
              8px 8px 16px rgba(140, 88, 88, 0.28),
              -7px -7px 16px rgba(255, 253, 253, 0.8),
              inset 5px 4px 6px rgba(132, 84, 84, 0.09),
              inset -4px -3px 7px rgba(255, 250, 250, 0.34);
          }

          &:active {
            transform: translateY(0);
            box-shadow:
              4px 4px 10px rgba(140, 88, 88, 0.2),
              -4px -4px 10px rgba(255, 252, 252, 0.68),
              inset 7px 6px 10px rgba(132, 84, 84, 0.16),
              inset -6px -5px 10px rgba(255, 251, 251, 0.46);
          }
        }

        button.delete-button--cancel {
          color: #4f4a45;
          background: linear-gradient(145deg, #f1ede7, #ddd6cc);
          border-color: #ece5da;
          box-shadow:
            6px 6px 14px rgba(141, 130, 113, 0.2),
            -6px -6px 14px rgba(255, 255, 255, 0.8),
            inset 5px 4px 6px rgba(148, 136, 118, 0.08),
            inset -4px -3px 7px rgba(255, 255, 255, 0.34);

          &:hover {
            box-shadow:
              8px 8px 16px rgba(141, 130, 113, 0.24),
              -7px -7px 16px rgba(255, 255, 255, 0.84),
              inset 5px 4px 6px rgba(148, 136, 118, 0.08),
              inset -4px -3px 7px rgba(255, 255, 255, 0.34);
          }

          &:active {
            box-shadow:
              4px 4px 10px rgba(141, 130, 113, 0.18),
              -4px -4px 10px rgba(255, 255, 255, 0.76),
              inset 7px 6px 10px rgba(148, 136, 118, 0.14),
              inset -6px -5px 10px rgba(255, 255, 255, 0.44);
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
