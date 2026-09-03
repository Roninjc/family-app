<script lang="ts">
  import type { FamilyMember } from '$lib/types/familyTypes'
  import { fade } from 'svelte/transition'
  import { suggestedChildren } from '$lib/utils/relationSuggestions'
  import { matchesSearch } from '$lib/utils/text'
  import { enhance } from '$app/forms'
  import { invalidateAll } from '$app/navigation'
  import { page } from '$app/stores'
  import { showAddMemberModal } from '../stores/modals'
  import MemberAutocompleteSuggestions from './ui/memberAutocompleteSuggestions.svelte'
  import ModalShell from './ui/modalShell.svelte'

  let showAddMemberModalValue = false
  showAddMemberModal.subscribe((value) => {
    showAddMemberModalValue = value
    if (value) resetForm()
  })

  $: familyMembers = ($page.data.familyData?.members ?? []) as FamilyMember[]

  let formStep = 1
  let showSummary = false
  let error = ''
  let submitting = false
  let step2Valid = false
  let step1ValidationAttempted = false
  let step1InvalidPulseToggle = false

  $: isNameStep1Valid = name.trim().length > 0
  $: isFamilyNameStep1Valid = familyName.trim().length > 0
  $: isBirthDateStep1Valid = birthDate.trim().length > 0

  function validateStep1() {
    return name.trim() && familyName.trim() && birthDate
  }

  function validateStep2() {
    // Relations are optional, but any typed text must resolve to a selected member
    return (
      (!fatherSearch.trim() || fatherId !== '') &&
      (!motherSearch.trim() || motherId !== '') &&
      (!actualPartnerSearch.trim() || actualPartnerId !== '')
    )
  }

  $: step2Valid = Boolean(validateStep2())

  function nextStep() {
    if (formStep === 1) {
      if (validateStep1()) {
        formStep++
        error = ''
        step1ValidationAttempted = false
      } else {
        // Visual validation: highlight missing required fields in-place.
        error = ''
        step1ValidationAttempted = true
        step1InvalidPulseToggle = !step1InvalidPulseToggle
      }
    } else if (formStep === 2) {
      if (validateStep2()) {
        // Final step: the same button submits from step 2
        error = ''
      } else {
        error = 'Selecciona un miembro válido desde las sugerencias.'
      }
    }
  }

  // Enter advances only from step 1. On step 2, Enter should submit naturally.
  function handleFormKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && formStep < 2) {
      event.preventDefault()
      nextStep()
    }
  }

  function handleSubmit(event: SubmitEvent) {
    if (formStep === 2 && !validateStep2()) {
      event.preventDefault()
      error = 'Selecciona un miembro válido desde las sugerencias.'
    }
  }

  const enhanceAddMember = () => {
    submitting = true

    return async ({ result }: { result: import('@sveltejs/kit').ActionResult }) => {
      submitting = false

      if (result.type === 'success') {
        showAddMemberModal.set(false)
        await invalidateAll()
      } else if (result.type === 'failure') {
        error = String(result.data?.addError ?? 'No se pudo guardar el miembro.')
      } else if (result.type === 'error') {
        error = 'No se pudo guardar el miembro.'
      }
    }
  }

  function closeModal() {
    showAddMemberModal.set(false)
  }

  function resetForm() {
    formStep = 1
    showSummary = false
    error = ''
    step1ValidationAttempted = false
    step1InvalidPulseToggle = false
    name = ''
    familyName = ''
    birthDate = ''
    fatherId = ''
    motherId = ''
    siblingsIds = []
    childrenIds = []
    actualPartnerId = ''
    previousPartnersIds = []
    fatherSearch = ''
    motherSearch = ''
    siblingsSearch = ''
    childrenSearch = ''
    actualPartnerSearch = ''
    previousPartnersSearch = ''
  }

  let name = ''
  let familyName = ''
  let birthDate = ''
  let fatherId = ''
  let motherId = ''
  let siblingsIds: string[] = []
  let childrenIds: string[] = []
  let actualPartnerId = ''
  let previousPartnersIds: string[] = []
  let fatherSearch = ''
  let motherSearch = ''
  let siblingsSearch = ''
  let childrenSearch = ''
  let actualPartnerSearch = ''
  let previousPartnersSearch = ''
  let showFatherSuggestions = false
  let showMotherSuggestions = false
  let showSiblingsSuggestions = false
  let showChildrenSuggestions = false
  let showActualPartnerSuggestions = false
  let showPreviousPartnersSuggestions = false
  let fatherInputEl: HTMLInputElement
  let motherInputEl: HTMLInputElement
  let siblingsInputEl: HTMLInputElement
  let childrenInputEl: HTMLInputElement
  let actualPartnerInputEl: HTMLInputElement
  let previousPartnersInputEl: HTMLInputElement

  function reportMemberValidity(element: HTMLInputElement, search: string, selectedId: string) {
    if (!element) return
    const match = familyMembers.some((m) => m.id === selectedId)
    if (!match && search.trim() !== '') {
      element.setCustomValidity('Selecciona un miembro familiar válido.')
    } else {
      element.setCustomValidity('')
    }
    element.reportValidity()
  }

  $: filteredFatherSuggestions = familyMembers.filter(
    (m) =>
      matchesSearch(m.name + ' ' + m.familyName, fatherSearch) &&
      m.id !== '' &&
      m.id !== motherId &&
      !childrenIds.includes(m.id)
  )
  $: filteredMotherSuggestions = familyMembers.filter(
    (m) =>
      matchesSearch(m.name + ' ' + m.familyName, motherSearch) &&
      m.id !== '' &&
      m.id !== fatherId &&
      !childrenIds.includes(m.id)
  )
  $: filteredSiblingSuggestions = familyMembers.filter(
    (m) =>
      matchesSearch(m.name + ' ' + m.familyName, siblingsSearch) &&
      m.id !== '' &&
      !siblingsIds.includes(m.id) &&
      !childrenIds.includes(m.id) &&
      m.id !== fatherId &&
      m.id !== motherId
  )
  $: filteredChildrenSuggestions = familyMembers.filter(
    (m) =>
      matchesSearch(m.name + ' ' + m.familyName, childrenSearch) &&
      m.id !== '' &&
      !childrenIds.includes(m.id) &&
      !siblingsIds.includes(m.id) &&
      !previousPartnersIds.includes(m.id) &&
      m.id !== fatherId &&
      m.id !== motherId &&
      m.id !== actualPartnerId
  )
  $: filteredActualPartnerSuggestions = familyMembers.filter(
    (m) =>
      matchesSearch(m.name + ' ' + m.familyName, actualPartnerSearch) &&
      m.id !== '' &&
      m.id !== fatherId &&
      m.id !== motherId &&
      !childrenIds.includes(m.id)
  )
  $: filteredPreviousPartnerSuggestions = familyMembers.filter(
    (m) =>
      matchesSearch(m.name + ' ' + m.familyName, previousPartnersSearch) &&
      m.id !== '' &&
      !previousPartnersIds.includes(m.id) &&
      !childrenIds.includes(m.id) &&
      m.id !== fatherId &&
      m.id !== motherId
  )

  function selectFather(member: FamilyMember) {
    fatherId = member.id
    fatherSearch = member.name + ' ' + member.familyName
    showFatherSuggestions = false
  }
  function selectMother(member: FamilyMember) {
    motherId = member.id
    motherSearch = member.name + ' ' + member.familyName
    showMotherSuggestions = false
  }
  function selectActualPartner(member: FamilyMember) {
    actualPartnerId = member.id
    actualPartnerSearch = member.name + ' ' + member.familyName
    showActualPartnerSuggestions = false
  }

  function clearFather() {
    fatherId = ''
    fatherSearch = ''
    if (fatherInputEl) fatherInputEl.setCustomValidity('')
  }

  function clearMother() {
    motherId = ''
    motherSearch = ''
    if (motherInputEl) motherInputEl.setCustomValidity('')
  }

  function clearActualPartner() {
    actualPartnerId = ''
    actualPartnerSearch = ''
    if (actualPartnerInputEl) actualPartnerInputEl.setCustomValidity('')
  }

  function addSibling(member: FamilyMember) {
    if (!siblingsIds.includes(member.id)) siblingsIds = [...siblingsIds, member.id]
    siblingsSearch = ''
    showSiblingsSuggestions = false
  }

  function removeSibling(memberId: string) {
    siblingsIds = siblingsIds.filter((id) => id !== memberId)
  }

  function addChild(member: FamilyMember) {
    if (!childrenIds.includes(member.id)) childrenIds = [...childrenIds, member.id]
    childrenSearch = ''
    showChildrenSuggestions = false
  }

  function removeChild(memberId: string) {
    childrenIds = childrenIds.filter((id) => id !== memberId)
  }

  function addPreviousPartner(member: FamilyMember) {
    if (!previousPartnersIds.includes(member.id))
      previousPartnersIds = [...previousPartnersIds, member.id]
    previousPartnersSearch = ''
    showPreviousPartnersSuggestions = false
  }

  function removePreviousPartner(memberId: string) {
    previousPartnersIds = previousPartnersIds.filter((id) => id !== memberId)
  }

  function getMemberName(id: string) {
    const member = familyMembers.find((m) => m.id === id)
    return member ? member.name + ' ' + member.familyName : ''
  }

  const valueOrFallback = (value: string) => value || 'Sin indicar'
  const listOrFallback = (ids: string[]) =>
    ids.length > 0 ? ids.map((id) => getMemberName(id)).join(', ') : 'Sin datos'

  // Siblings of the selected children: one-click suggestion to add them as
  // children of the new member too
  $: suggestedChildrenList = suggestedChildren(
    childrenIds,
    [fatherId, motherId, actualPartnerId, ...siblingsIds, ...previousPartnersIds].filter(Boolean),
    familyMembers
  )
</script>

<ModalShell
  open={showAddMemberModalValue}
  ariaLabel="Cerrar modal de nuevo miembro"
  ariaLabelledby="add-member-title"
  onClose={closeModal}
  size="compact"
>
  <svelte:fragment slot="chrome-left">
    {#if formStep === 2}
      <button
        type="button"
        class="step-back-icon"
        aria-label="Volver al paso anterior"
        title="Volver"
        on:click={() => formStep--}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m15.4 4.6 1.4 1.4L10.21 12l6.59 6-1.4 1.4L7.2 12l8.2-7.4z" />
        </svg>
      </button>
    {/if}
  </svelte:fragment>

  <div class="add-member-modal">
    <div class="modal-heading">
      <h2 id="add-member-title">Nuevo miembro familiar</h2>
      <p class="step-caption modal-subtitle">
        Paso {formStep} de 2 · {formStep === 1 ? 'Datos básicos' : 'Conexiones familiares'}
      </p>
    </div>
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <form
      method="POST"
      action="?/addMember"
      use:enhance={enhanceAddMember}
      on:keydown={handleFormKeydown}
      on:submit={handleSubmit}
    >
      {#if formStep === 1}
        <section>
          <h3>Datos personales</h3>
          <div
            class="input-wrapper floating-input-wrapper"
            class:field-invalid={step1ValidationAttempted && !isNameStep1Valid}
            class:field-invalid-pulse-a={step1ValidationAttempted &&
              !isNameStep1Valid &&
              step1InvalidPulseToggle}
            class:field-invalid-pulse-b={step1ValidationAttempted &&
              !isNameStep1Valid &&
              !step1InvalidPulseToggle}
          >
            <input
              id="newMemberName"
              class="modern-input"
              type="text"
              bind:value={name}
              required
              autocomplete="off"
            />
            <label for="newMemberName" class:label-active={name.length > 0}>Nombre</label>
          </div>
          <div
            class="input-wrapper floating-input-wrapper"
            class:field-invalid={step1ValidationAttempted && !isFamilyNameStep1Valid}
            class:field-invalid-pulse-a={step1ValidationAttempted &&
              !isFamilyNameStep1Valid &&
              step1InvalidPulseToggle}
            class:field-invalid-pulse-b={step1ValidationAttempted &&
              !isFamilyNameStep1Valid &&
              !step1InvalidPulseToggle}
          >
            <input
              id="newMemberFamilyName"
              class="modern-input"
              type="text"
              bind:value={familyName}
              required
              autocomplete="off"
            />
            <label for="newMemberFamilyName" class:label-active={familyName.length > 0}
              >Apellidos</label
            >
          </div>
          <div
            class="input-wrapper floating-input-wrapper"
            class:field-invalid={step1ValidationAttempted && !isBirthDateStep1Valid}
            class:field-invalid-pulse-a={step1ValidationAttempted &&
              !isBirthDateStep1Valid &&
              step1InvalidPulseToggle}
            class:field-invalid-pulse-b={step1ValidationAttempted &&
              !isBirthDateStep1Valid &&
              !step1InvalidPulseToggle}
          >
            <input
              id="newMemberBirthDate"
              class="modern-input"
              type="date"
              max={new Date().toISOString().split('T')[0]}
              bind:value={birthDate}
              required
              autocomplete="off"
            />
            <label for="newMemberBirthDate" class:label-active={birthDate && birthDate.length > 0}
              >Fecha de nacimiento</label
            >
          </div>
          <button
            type="button"
            class="app-btn app-btn--secondary"
            on:click={nextStep}
            disabled={submitting}
          >
            Siguiente
          </button>
        </section>
      {:else if formStep === 2}
        <section>
          <h3>Conexiones</h3>
          <div class="input-wrapper floating-input-wrapper autocomplete-wrapper">
            <input
              id="fatherAutocomplete"
              class="modern-input"
              type="text"
              bind:value={fatherSearch}
              on:input={() => {
                fatherId = ''
                showFatherSuggestions = true
              }}
              on:focus={() => (showFatherSuggestions = true)}
              on:blur={() => {
                setTimeout(() => (showFatherSuggestions = false), 100)
                reportMemberValidity(fatherInputEl, fatherSearch, fatherId)
              }}
              autocomplete="off"
              bind:this={fatherInputEl}
            />
            {#if fatherId}
              <button
                type="button"
                class="relation-clear-btn"
                aria-label="Quitar padre seleccionado"
                title="Quitar padre"
                on:click={clearFather}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z"
                  />
                </svg>
              </button>
            {/if}
            <label for="fatherAutocomplete" class:label-active={fatherSearch.length > 0}
              >Padre</label
            >
            <MemberAutocompleteSuggestions
              show={showFatherSuggestions}
              items={filteredFatherSuggestions}
              activeIds={fatherId ? [fatherId] : []}
              on:select={(event) => selectFather(event.detail)}
            />
          </div>
          <div class="input-wrapper floating-input-wrapper autocomplete-wrapper">
            <input
              id="motherAutocomplete"
              class="modern-input"
              type="text"
              bind:value={motherSearch}
              on:input={() => {
                motherId = ''
                showMotherSuggestions = true
              }}
              on:focus={() => (showMotherSuggestions = true)}
              on:blur={() => {
                setTimeout(() => (showMotherSuggestions = false), 100)
                reportMemberValidity(motherInputEl, motherSearch, motherId)
              }}
              autocomplete="off"
              bind:this={motherInputEl}
            />
            {#if motherId}
              <button
                type="button"
                class="relation-clear-btn"
                aria-label="Quitar madre seleccionada"
                title="Quitar madre"
                on:click={clearMother}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z"
                  />
                </svg>
              </button>
            {/if}
            <label for="motherAutocomplete" class:label-active={motherSearch.length > 0}
              >Madre</label
            >
            <MemberAutocompleteSuggestions
              show={showMotherSuggestions}
              items={filteredMotherSuggestions}
              activeIds={motherId ? [motherId] : []}
              on:select={(event) => selectMother(event.detail)}
            />
          </div>
          <h3>Hermanos</h3>
          <div class="input-wrapper floating-input-wrapper autocomplete-wrapper">
            <input
              id="siblingsAutocomplete"
              class="modern-input"
              type="text"
              bind:value={siblingsSearch}
              on:input={() => (showSiblingsSuggestions = true)}
              on:focus={() => (showSiblingsSuggestions = true)}
              on:blur={() => setTimeout(() => (showSiblingsSuggestions = false), 100)}
              autocomplete="off"
              bind:this={siblingsInputEl}
            />
            <label
              for="siblingsAutocomplete"
              class:label-active={siblingsSearch && siblingsSearch.length > 0}
              >Añadir hermano/a</label
            >
            <MemberAutocompleteSuggestions
              show={showSiblingsSuggestions}
              items={filteredSiblingSuggestions}
              activeIds={siblingsIds}
              on:select={(event) => addSibling(event.detail)}
            />
          </div>
          {#if siblingsIds.length > 0}
            <div class="selected-list">
              <div class="selected-list-head">
                <b class="selected-list-title">Hermanos añadidos</b>
                <span class="selected-list-count">{siblingsIds.length}</span>
              </div>
              <div class="selected-chips">
                {#each siblingsIds as siblingId (siblingId)}
                  <button
                    type="button"
                    class="selected-chip"
                    aria-label={`Quitar a ${getMemberName(siblingId)} de hermanos`}
                    title="Quitar hermano"
                    on:click={() => removeSibling(siblingId)}
                  >
                    <span>{getMemberName(siblingId)}</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z"
                      />
                    </svg>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
          <h3>Hijos</h3>
          <div class="input-wrapper floating-input-wrapper autocomplete-wrapper">
            <input
              id="childrenAutocomplete"
              class="modern-input"
              type="text"
              bind:value={childrenSearch}
              on:input={() => (showChildrenSuggestions = true)}
              on:focus={() => (showChildrenSuggestions = true)}
              on:blur={() => setTimeout(() => (showChildrenSuggestions = false), 100)}
              autocomplete="off"
              bind:this={childrenInputEl}
            />
            <label
              for="childrenAutocomplete"
              class:label-active={childrenSearch && childrenSearch.length > 0}>Añadir hijo/a</label
            >
            <MemberAutocompleteSuggestions
              show={showChildrenSuggestions}
              items={filteredChildrenSuggestions}
              activeIds={childrenIds}
              on:select={(event) => addChild(event.detail)}
            />
          </div>
          {#if childrenIds.length > 0}
            <div class="selected-list">
              <div class="selected-list-head">
                <b class="selected-list-title">Hijos añadidos</b>
                <span class="selected-list-count">{childrenIds.length}</span>
              </div>
              <div class="selected-chips">
                {#each childrenIds as childId (childId)}
                  <button
                    type="button"
                    class="selected-chip"
                    aria-label={`Quitar a ${getMemberName(childId)} de hijos`}
                    title="Quitar hijo"
                    on:click={() => removeChild(childId)}
                  >
                    <span>{getMemberName(childId)}</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z"
                      />
                    </svg>
                  </button>
                {/each}
              </div>
            </div>
          {/if}
          {#if suggestedChildrenList.length > 0}
            <div class="suggested-children">
              <span>¿Son también hijos/as?</span>
              {#each suggestedChildrenList as suggestedChild (suggestedChild.id)}
                <button
                  type="button"
                  class="suggested-chip app-suggested-chip"
                  on:click={() => addChild(suggestedChild)}
                >
                  + {suggestedChild.name}
                  {suggestedChild.familyName}
                </button>
              {/each}
            </div>
          {/if}
          <h3>Pareja actual</h3>
          <div class="input-wrapper floating-input-wrapper autocomplete-wrapper">
            <input
              id="partnerAutocomplete"
              class="modern-input"
              type="text"
              bind:value={actualPartnerSearch}
              on:input={() => {
                actualPartnerId = ''
                showActualPartnerSuggestions = true
              }}
              on:focus={() => (showActualPartnerSuggestions = true)}
              on:blur={() => {
                setTimeout(() => (showActualPartnerSuggestions = false), 100)
                reportMemberValidity(actualPartnerInputEl, actualPartnerSearch, actualPartnerId)
              }}
              autocomplete="off"
              bind:this={actualPartnerInputEl}
            />
            {#if actualPartnerId}
              <button
                type="button"
                class="relation-clear-btn"
                aria-label="Quitar pareja seleccionada"
                title="Quitar pareja"
                on:click={clearActualPartner}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path
                    d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z"
                  />
                </svg>
              </button>
            {/if}
            <label
              for="partnerAutocomplete"
              class:label-active={actualPartnerSearch && actualPartnerSearch.length > 0}
              >Añadir pareja</label
            >
            <MemberAutocompleteSuggestions
              show={showActualPartnerSuggestions}
              items={filteredActualPartnerSuggestions}
              activeIds={actualPartnerId ? [actualPartnerId] : []}
              on:select={(event) => selectActualPartner(event.detail)}
            />
          </div>
          <h3>Exparejas</h3>
          <div class="input-wrapper floating-input-wrapper autocomplete-wrapper">
            <input
              id="previousPartnersAutocomplete"
              class="modern-input"
              type="text"
              bind:value={previousPartnersSearch}
              on:input={() => (showPreviousPartnersSuggestions = true)}
              on:focus={() => (showPreviousPartnersSuggestions = true)}
              on:blur={() => setTimeout(() => (showPreviousPartnersSuggestions = false), 100)}
              autocomplete="off"
              bind:this={previousPartnersInputEl}
            />
            <label
              for="previousPartnersAutocomplete"
              class:label-active={previousPartnersSearch && previousPartnersSearch.length > 0}
              >Añadir expareja</label
            >
            <MemberAutocompleteSuggestions
              show={showPreviousPartnersSuggestions}
              items={filteredPreviousPartnerSuggestions}
              activeIds={previousPartnersIds}
              on:select={(event) => addPreviousPartner(event.detail)}
            />
          </div>
          {#if previousPartnersIds.length > 0}
            <div class="selected-list">
              <div class="selected-list-head">
                <b class="selected-list-title">Exparejas añadidas</b>
                <span class="selected-list-count">{previousPartnersIds.length}</span>
              </div>
              <div class="selected-chips">
                {#each previousPartnersIds as previousPartnerId (previousPartnerId)}
                  <button
                    type="button"
                    class="selected-chip"
                    aria-label={`Quitar a ${getMemberName(previousPartnerId)} de exparejas`}
                    title="Quitar expareja"
                    on:click={() => removePreviousPartner(previousPartnerId)}
                  >
                    <span>{getMemberName(previousPartnerId)}</span>
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path
                        d="M6.22 6.22a.75.75 0 0 1 1.06 0L12 10.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L13.06 12l4.72 4.72a.75.75 0 1 1-1.06 1.06L12 13.06l-4.72 4.72a.75.75 0 1 1-1.06-1.06L10.94 12 6.22 7.28a.75.75 0 0 1 0-1.06Z"
                      />
                    </svg>
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          {#if showSummary}
            <div class="summary-panel" transition:fade={{ duration: 140 }}>
              <h3>Resumen antes de guardar</h3>
              <ul>
                <li><b>Nombre:</b> {valueOrFallback(name)}</li>
                <li><b>Apellidos:</b> {valueOrFallback(familyName)}</li>
                <li><b>Fecha de nacimiento:</b> {valueOrFallback(birthDate)}</li>
                <li><b>Padre:</b> {valueOrFallback(getMemberName(fatherId))}</li>
                <li><b>Madre:</b> {valueOrFallback(getMemberName(motherId))}</li>
                <li><b>Hermanos:</b> {listOrFallback(siblingsIds)}</li>
                <li><b>Hijos:</b> {listOrFallback(childrenIds)}</li>
                <li><b>Pareja:</b> {valueOrFallback(getMemberName(actualPartnerId))}</li>
                <li><b>Exparejas:</b> {listOrFallback(previousPartnersIds)}</li>
              </ul>
            </div>
          {/if}

          <input type="hidden" name="name" value={name} />
          <input type="hidden" name="familyName" value={familyName} />
          <input type="hidden" name="birthDate" value={birthDate} />
          <input type="hidden" name="fatherId" value={fatherId} />
          <input type="hidden" name="motherId" value={motherId} />
          <input type="hidden" name="partnerId" value={actualPartnerId} />
          {#each siblingsIds as siblingId}
            <input type="hidden" name="siblingsIds" value={siblingId} />
          {/each}
          {#each childrenIds as childId}
            <input type="hidden" name="childrenIds" value={childId} />
          {/each}
          {#each previousPartnersIds as previousPartnerId}
            <input type="hidden" name="previousPartnersIds" value={previousPartnerId} />
          {/each}

          <div class="step-actions">
            <button
              type="button"
              class="app-btn app-btn--ghost"
              aria-label={showSummary ? 'Ocultar resumen' : 'Ver resumen antes de guardar'}
              title={showSummary ? 'Ocultar resumen' : 'Ver resumen'}
              on:click={() => (showSummary = !showSummary)}
            >
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  d="M12 5c4.8 0 8.8 2.7 10.4 7-1.6 4.3-5.6 7-10.4 7S3.2 16.3 1.6 12C3.2 7.7 7.2 5 12 5Zm0 2.2A4.8 4.8 0 1 0 12 16.8 4.8 4.8 0 0 0 12 7.2Zm0 2A2.8 2.8 0 1 1 12 14.8 2.8 2.8 0 0 1 12 9.2Z"
                />
              </svg>
              <span class="sr-only">
                {showSummary ? 'Ocultar resumen' : 'Ver resumen antes de guardar'}
              </span>
            </button>
            <button
              type="submit"
              class="app-btn app-btn--primary"
              disabled={submitting || !step2Valid}
            >
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </section>
      {/if}
      {#if error}
        <div class="form-error">{error}</div>
      {/if}
    </form>
  </div>
</ModalShell>

<style lang="scss">
  .add-member-modal {
    --add-summary-bg: rgba(255, 255, 255, 0.5);
    --add-summary-border: rgba(255, 235, 214, 0.72);
    --add-selected-list-bg: rgba(247, 239, 229, 0.52);
    --add-selected-list-divider: rgba(195, 160, 124, 0.14);
    --add-selected-list-title: #73543f;
    --add-selected-list-count-text: #85644d;
    --add-selected-list-count-bg: rgba(236, 220, 201, 0.6);
    --add-selected-list-highlight: #7e4724;
    --add-step-icon-shadow: 3px 3px 8px rgba(149, 121, 95, 0.14),
      -3px -3px 8px rgba(255, 255, 255, 0.6);
    --add-step-icon-shadow-hover: 4px 4px 9px rgba(149, 121, 95, 0.16),
      -4px -4px 9px rgba(255, 255, 255, 0.7);

    h2 {
      margin: 0;
      text-wrap: balance;
    }

    .step-caption {
      margin: 0;
      font-size: var(--fs-xs);
      color: var(--text-muted);
    }

    form {
      display: flex;
      flex-direction: column;

      .input-wrapper {
        margin-bottom: 1.5rem;
      }

      .app-btn {
        width: 100%;
        min-height: 44px;
      }

      .step-actions {
        display: grid;
        grid-template-columns: 52px minmax(0, 1fr);
        gap: 0.75rem;
        align-items: stretch;

        .app-btn {
          width: 100%;
        }

        .app-btn:first-child {
          min-width: 52px;
          padding-inline: 0;

          svg {
            width: 18px;
            height: 18px;
            fill: currentColor;
          }
        }

        @media (min-width: 640px) {
          grid-template-columns: 52px minmax(0, 1fr);
        }
      }

      .summary-panel {
        margin: 0.75rem 0;
        padding: 10px 12px;
        border-radius: var(--radius-control);
        background: var(--add-summary-bg);
        border: 1px solid var(--add-summary-border);

        h3 {
          margin: 0 0 0.45rem;
        }

        ul {
          margin: 0;
          padding-left: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
          font-size: 0.88rem;
          color: var(--text-main);
        }
      }

      .selected-list {
        margin: 0.45rem 0 1.05rem;
        padding: 0.68rem 0.72rem 0.74rem;
        border-radius: 13px;
        border: none;
        background: var(--add-selected-list-bg);
        display: flex;
        flex-direction: column;
        gap: 0.48rem;

        .selected-list-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
          padding-bottom: 0.38rem;
          border-bottom: 1px solid var(--add-selected-list-divider);
        }

        .selected-list-title {
          font-size: var(--fs-xs);
          font-weight: 600;
          color: var(--add-selected-list-title);
          letter-spacing: 0.01em;
        }

        .selected-list-count {
          min-width: 1.6rem;
          height: 1.28rem;
          padding: 0 0.38rem;
          border-radius: var(--radius-pill);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.69rem;
          font-weight: 600;
          color: var(--add-selected-list-count-text);
          background: var(--add-selected-list-count-bg);
        }

        b {
          font-size: var(--fs-xs);
          color: var(--add-selected-list-highlight);
        }

        span {
          font-size: var(--fs-sm);
          color: var(--text-main);
        }
      }

      .suggested-children {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.4rem;
        margin-bottom: 1rem;
        font-size: var(--fs-xs);
        color: var(--text-warm-strong);
      }
    }

    .field-invalid :global(.modern-input) {
      box-shadow: var(--neu-shadow-inset), var(--focus-ring-error-strong);
      background: var(--control-bg-error-soft);
    }

    .field-invalid :global(label) {
      color: var(--feedback-error-strong-text);
    }

    .field-invalid-pulse-a :global(.modern-input) {
      animation: field-invalid-pulse-a 440ms var(--motion-standard);
    }

    .field-invalid-pulse-b :global(.modern-input) {
      animation: field-invalid-pulse-b 440ms var(--motion-standard);
    }
  }

  .step-back-icon {
    width: 34px;
    min-width: 34px;
    height: 34px;
    min-height: 34px;
    padding: 0;
    border: none;
    border-radius: var(--radius-control);
    background: var(--surface-warm-elevated);
    color: var(--text-main-strong);
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: var(--add-step-icon-shadow);
    transition:
      background-color var(--dur-base) var(--motion-standard),
      box-shadow var(--dur-base) var(--motion-standard),
      color var(--dur-base) var(--motion-standard);

    svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }

    &:hover {
      box-shadow: var(--add-step-icon-shadow-hover);
    }

    &:focus-visible {
      outline: 2px solid transparent;
      box-shadow: var(--focus-ring-soft-strong);
      outline-offset: 2px;
    }
  }

  .selected-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.42rem;
  }

  .selected-chip {
    border: none;
    border-radius: var(--radius-pill);
    background: var(--chip-warm-bg);
    color: var(--text-warm-chip);
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.27rem 0.6rem 0.27rem 0.65rem;
    cursor: pointer;
    font-size: var(--fs-xs);
    line-height: 1.25;
    box-shadow: var(--shadow-soft-xs);
    transition:
      transform var(--dur-fast) var(--motion-standard),
      box-shadow var(--dur-fast) var(--motion-standard),
      background-color var(--dur-base) var(--motion-standard);

    svg {
      width: 10px;
      height: 10px;
      fill: currentColor;
      opacity: 0.7;
    }

    &:hover {
      transform: translateY(-0.5px);
      background: var(--chip-warm-bg-hover);
      box-shadow: var(--shadow-soft-sm);
    }

    &:focus-visible {
      outline: 2px solid transparent;
      box-shadow: var(--focus-ring-soft-strong);
      outline-offset: 2px;
    }
  }

  .autocomplete-wrapper {
    position: relative;
  }

  .autocomplete-wrapper :global(.modern-input) {
    padding-right: 2.2rem;
  }

  .relation-clear-btn {
    position: absolute;
    top: 50%;
    right: 0.5rem;
    transform: translateY(-50%);
    width: 1.3rem;
    height: 1.3rem;
    border: none;
    border-radius: var(--radius-pill);
    background: var(--chip-warm-bg-strong);
    color: var(--text-warm-chip);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
    z-index: 4;
    box-shadow: var(--shadow-soft-xs);
    transition:
      background-color var(--dur-base) var(--motion-standard),
      box-shadow var(--dur-base) var(--motion-standard),
      transform var(--dur-base) var(--motion-standard);

    svg {
      width: 10px;
      height: 10px;
      fill: currentColor;
      opacity: 0.7;
    }

    &:hover {
      background: var(--chip-warm-bg-hover-strong);
      box-shadow: var(--shadow-soft-sm);
    }

    &:focus-visible {
      outline: 2px solid transparent;
      box-shadow: var(--focus-ring-soft-strong);
      outline-offset: 2px;
    }
  }

  @keyframes field-invalid-pulse-a {
    0% {
      box-shadow: var(--neu-shadow-inset), var(--focus-ring-error-start);
    }
    45% {
      box-shadow: var(--neu-shadow-inset), var(--focus-ring-error-pulse);
    }
    100% {
      box-shadow: var(--neu-shadow-inset), var(--focus-ring-error-strong);
    }
  }

  @keyframes field-invalid-pulse-b {
    0% {
      box-shadow: var(--neu-shadow-inset), var(--focus-ring-error-start);
    }
    45% {
      box-shadow: var(--neu-shadow-inset), var(--focus-ring-error-pulse);
    }
    100% {
      box-shadow: var(--neu-shadow-inset), var(--focus-ring-error-strong);
    }
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
</style>
