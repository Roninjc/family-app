<script lang="ts">
  import type { FamilyMember } from '$lib/types/familyTypes'
  import { suggestedChildren } from '$lib/utils/relationSuggestions'
  import { matchesSearch } from '$lib/utils/text'
  import { enhance } from '$app/forms'
  import { invalidateAll } from '$app/navigation'
  import { page } from '$app/stores'
  import { showAddMemberModal } from '../stores/modals'
  import LiquidGlassWrapper from './liquidGlassWrapper.svelte'

  let showAddMemberModalValue = false
  showAddMemberModal.subscribe((value) => {
    showAddMemberModalValue = value
    if (value) resetForm()
  })

  $: familyMembers = ($page.data.familyData?.members ?? []) as FamilyMember[]

  let formStep = 1
  let error = ''
  let submitting = false

  function validateStep1() {
    return name.trim() && familyName.trim() && birthDate
  }

  function validateStep2() {
    // Parents are optional, but any typed text must resolve to a selected member
    return (!fatherSearch.trim() || fatherId !== '') && (!motherSearch.trim() || motherId !== '')
  }

  function validateStep3() {
    // Partner is optional, but any typed text must resolve to a selected member
    return !actualPartnerSearch.trim() || actualPartnerId !== ''
  }

  function nextStep() {
    if (formStep === 1) {
      if (validateStep1()) {
        formStep++
        error = ''
      } else {
        error = 'Completa todos los campos obligatorios.'
      }
    } else if (formStep === 2) {
      if (validateStep2()) {
        formStep++
        error = ''
      } else {
        error = 'Selecciona un miembro válido desde las sugerencias.'
      }
    } else if (formStep === 3) {
      if (validateStep3()) {
        formStep++
        error = ''
      } else {
        error = 'Selecciona un miembro válido desde las sugerencias.'
      }
    }
  }

  // Enter advances steps; the real submit only happens from step 4.
  function handleFormKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && formStep < 4) {
      event.preventDefault()
      nextStep()
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

  function resetForm() {
    formStep = 1
    error = ''
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
  function addSibling(member: FamilyMember) {
    if (!siblingsIds.includes(member.id)) siblingsIds = [...siblingsIds, member.id]
    siblingsSearch = ''
    showSiblingsSuggestions = false
  }
  function addChild(member: FamilyMember) {
    if (!childrenIds.includes(member.id)) childrenIds = [...childrenIds, member.id]
    childrenSearch = ''
    showChildrenSuggestions = false
  }
  function addPreviousPartner(member: FamilyMember) {
    if (!previousPartnersIds.includes(member.id))
      previousPartnersIds = [...previousPartnersIds, member.id]
    previousPartnersSearch = ''
    showPreviousPartnersSuggestions = false
  }

  function getMemberName(id: string) {
    const member = familyMembers.find((m) => m.id === id)
    return member ? member.name + ' ' + member.familyName : ''
  }

  // Siblings of the selected children: one-click suggestion to add them as
  // children of the new member too
  $: suggestedChildrenList = suggestedChildren(
    childrenIds,
    [fatherId, motherId, actualPartnerId, ...siblingsIds, ...previousPartnersIds].filter(Boolean),
    familyMembers
  )
</script>

{#if showAddMemberModalValue}
  <div
    class="add-member-modal-backdrop"
    role="button"
    tabindex="0"
    aria-label="Cerrar modal de nuevo miembro"
    on:click|stopPropagation={() => showAddMemberModal.set(false)}
    on:keydown={(e) => {
      if (e.key === 'Escape') showAddMemberModal.set(false)
    }}
  >
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="add-member-modal" role="banner" on:click|stopPropagation>
      <LiquidGlassWrapper>
        <h2>Nuevo miembro familiar</h2>
        <form
          method="POST"
          action="?/addMember"
          use:enhance={enhanceAddMember}
          on:keydown={handleFormKeydown}
        >
          {#if formStep === 1}
            <section>
              <h3>Datos personales</h3>
              <div class="input-wrapper">
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
              <div class="input-wrapper">
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
              <div class="input-wrapper">
                <input
                  id="newMemberBirthDate"
                  class="modern-input"
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  bind:value={birthDate}
                  required
                  autocomplete="off"
                />
                <label
                  for="newMemberBirthDate"
                  class:label-active={birthDate && birthDate.length > 0}>Fecha de nacimiento</label
                >
              </div>
              <button type="button" on:click={nextStep}>Siguiente</button>
            </section>
          {:else if formStep === 2}
            <section>
              <h3>Conexiones</h3>
              <div class="input-wrapper autocomplete-wrapper">
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
                <label for="fatherAutocomplete" class:label-active={fatherSearch.length > 0}
                  >Padre</label
                >
                {#if showFatherSuggestions && filteredFatherSuggestions.length > 0}
                  <ul class="autocomplete-suggestions">
                    {#each filteredFatherSuggestions as member (member.id)}
                      <li
                        class:active={member.id === fatherId}
                        on:mousedown={() => selectFather(member)}
                      >
                        {member.name}
                        {member.familyName}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
              <div class="input-wrapper autocomplete-wrapper">
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
                <label for="motherAutocomplete" class:label-active={motherSearch.length > 0}
                  >Madre</label
                >
                {#if showMotherSuggestions && filteredMotherSuggestions.length > 0}
                  <ul class="autocomplete-suggestions">
                    {#each filteredMotherSuggestions as member (member.id)}
                      <li
                        class:active={member.id === motherId}
                        on:mousedown={() => selectMother(member)}
                      >
                        {member.name}
                        {member.familyName}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
              <h3>Hermanos</h3>
              <div class="input-wrapper autocomplete-wrapper">
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
                {#if showSiblingsSuggestions && filteredSiblingSuggestions.length > 0}
                  <ul class="autocomplete-suggestions">
                    {#each filteredSiblingSuggestions as member (member.id)}
                      <li
                        class:active={siblingsIds.includes(member.id)}
                        on:mousedown={() => addSibling(member)}
                      >
                        {member.name}
                        {member.familyName}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
              {#if siblingsIds.length > 0}
                <div class="selected-list">
                  Hermanos: {siblingsIds.map((id) => getMemberName(id)).join(', ')}
                </div>
              {/if}
              <h3>Hijos</h3>
              <div class="input-wrapper autocomplete-wrapper">
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
                  class:label-active={childrenSearch && childrenSearch.length > 0}
                  >Añadir hijo/a</label
                >
                {#if showChildrenSuggestions && filteredChildrenSuggestions.length > 0}
                  <ul class="autocomplete-suggestions">
                    {#each filteredChildrenSuggestions as member (member.id)}
                      <li
                        class:active={childrenIds.includes(member.id)}
                        on:mousedown={() => addChild(member)}
                      >
                        {member.name}
                        {member.familyName}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
              {#if childrenIds.length > 0}
                <div class="selected-list">
                  Hijos: {childrenIds.map((id) => getMemberName(id)).join(', ')}
                </div>
              {/if}
              {#if suggestedChildrenList.length > 0}
                <div class="suggested-children">
                  <span>¿Son también hijos/as?</span>
                  {#each suggestedChildrenList as suggestedChild (suggestedChild.id)}
                    <button
                      type="button"
                      class="suggested-chip"
                      on:click={() => addChild(suggestedChild)}
                    >
                      + {suggestedChild.name}
                      {suggestedChild.familyName}
                    </button>
                  {/each}
                </div>
              {/if}
              <div class="step-actions">
                <button type="button" on:click={() => formStep--}>Atrás</button>
                <button type="button" on:click={nextStep}>Siguiente</button>
              </div>
            </section>
          {:else if formStep === 3}
            <section>
              <h3>Pareja actual</h3>
              <div class="input-wrapper autocomplete-wrapper">
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
                  on:blur={() => setTimeout(() => (showActualPartnerSuggestions = false), 100)}
                  autocomplete="off"
                  bind:this={actualPartnerInputEl}
                />
                <label
                  for="partnerAutocomplete"
                  class:label-active={actualPartnerSearch && actualPartnerSearch.length > 0}
                  >Añadir pareja</label
                >
                {#if showActualPartnerSuggestions && filteredActualPartnerSuggestions.length > 0}
                  <ul class="autocomplete-suggestions">
                    {#each filteredActualPartnerSuggestions as member (member.id)}
                      <li
                        class:active={member.id === actualPartnerId}
                        on:mousedown={() => selectActualPartner(member)}
                      >
                        {member.name}
                        {member.familyName}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
              <h3>Exparejas</h3>
              <div class="input-wrapper autocomplete-wrapper">
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
                {#if showPreviousPartnersSuggestions && filteredPreviousPartnerSuggestions.length > 0}
                  <ul class="autocomplete-suggestions">
                    {#each filteredPreviousPartnerSuggestions as member (member.id)}
                      <li
                        class:active={previousPartnersIds.includes(member.id)}
                        on:mousedown={() => addPreviousPartner(member)}
                      >
                        {member.name}
                        {member.familyName}
                      </li>
                    {/each}
                  </ul>
                {/if}
              </div>
              {#if previousPartnersIds.length > 0}
                <div class="selected-list">
                  Exparejas: {previousPartnersIds.map((id) => getMemberName(id)).join(', ')}
                </div>
              {/if}
              <div class="step-actions">
                <button type="button" on:click={() => formStep--}>Atrás</button>
                <button type="button" on:click={nextStep}>Siguiente</button>
              </div>
            </section>
          {:else if formStep === 4}
            <section>
              <h3>Resumen</h3>
              <ul>
                <li><b>Nombre:</b> {name}</li>
                <li><b>Apellidos:</b> {familyName}</li>
                <li><b>Fecha de nacimiento:</b> {birthDate}</li>
                <li><b>Padre:</b> {getMemberName(fatherId)}</li>
                <li><b>Madre:</b> {getMemberName(motherId)}</li>
                <li><b>Hermanos:</b> {siblingsIds.map((id) => getMemberName(id)).join(', ')}</li>
                <li><b>Hijos:</b> {childrenIds.map((id) => getMemberName(id)).join(', ')}</li>
                <li><b>Pareja:</b> {getMemberName(actualPartnerId)}</li>
                <li>
                  <b>Exparejas:</b>
                  {previousPartnersIds.map((id) => getMemberName(id)).join(', ')}
                </li>
              </ul>
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
                <button type="button" on:click={() => formStep--}>Atrás</button>
                <button type="submit" disabled={submitting}>
                  {submitting ? 'Guardando...' : 'Confirmar y añadir'}
                </button>
              </div>
            </section>
          {/if}
          {#if error}
            <div class="form-error">{error}</div>
          {/if}
        </form>
      </LiquidGlassWrapper>
    </div>
    <svg style="display: none">
      <filter
        id="glass-distortion"
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        filterUnits="objectBoundingBox"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.01 0.01"
          numOctaves="1"
          seed="5"
          result="turbulence"
        />

        <feComponentTransfer in="turbulence" result="mapped">
          <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
          <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
          <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
        </feComponentTransfer>

        <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />

        <feSpecularLighting
          in="softMap"
          surfaceScale="5"
          specularConstant="1"
          specularExponent="100"
          lighting-color="white"
          result="specLight"
        >
          <fePointLight x="-200" y="-200" z="300" />
        </feSpecularLighting>

        <feComposite
          in="specLight"
          operator="arithmetic"
          k1="0"
          k2="1"
          k3="1"
          k4="0"
          result="litImage"
        />

        <feDisplacementMap
          in="SourceGraphic"
          in2="softMap"
          scale="150"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  </div>
{/if}

<style lang="scss">
  .add-member-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.4);
    z-index: 999;

    .add-member-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 16px;
      background-color: rgba(255, 255, 255, 0.3);
      z-index: 1000;

      h2 {
        margin-top: 0;
        margin-bottom: 0.5rem;
        text-wrap: nowrap;
      }

      form {
        display: flex;
        flex-direction: column;

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
            color: #8f8f8f;

            &[type='date']:not(:focus) {
              color: transparent;
            }

            &[type='date']:open,
            &[type='date']:has(+ label.label-active) {
              color: #8f8f8f;
            }

            &::-webkit-calendar-picker-indicator {
              filter: invert(38%) brightness(95%) contrast(80%);
            }

            &:focus {
              outline: none;
              border-color: #7c3aed;
              box-shadow: 0 2px 8px rgba(124, 58, 237, 0.12);
              background: #fff;
            }

            &:focus,
            &:valid {
              color: #444;
            }
          }

          label {
            position: absolute;
            left: 0.5rem;
            top: 0.5rem;
            padding: 0 6px;
            color: #8f8f8f;
            font-size: 1.1rem;
            pointer-events: none;
            background: transparent;
            transition:
              0.2s cubic-bezier(0.4, 0, 0.2, 1) transform,
              0.2s cubic-bezier(0.4, 0, 0.2, 1) font-size,
              0.2s cubic-bezier(0.4, 0, 0.2, 1) color,
              0.2s cubic-bezier(0.4, 0, 0.2, 1) top,
              0.2s cubic-bezier(0.4, 0, 0.2, 1) background;
          }

          .modern-input:focus + label,
          .modern-input[type='date']:open + label,
          label.label-active {
            top: 2px;
            left: 12px;
            font-size: 0.8rem;
            color: #7c3aed;
            background: #fafafa;
            transform: translateY(-60%);
            padding: 0 6px;
            border-radius: 6px;
          }

          .modern-input:valid:not(:focus) + label.label-active {
            color: #5eb47e;
          }

          .modern-input:invalid:not(:focus):not(:placeholder-shown) + label.label-active {
            color: #dc2626;
          }

          .autocomplete-suggestions {
            position: absolute;
            top: 110%;
            left: 0;
            right: 0;
            background: #fff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            z-index: 10;
            max-height: 180px;
            overflow-y: auto;
            margin: 0;
            padding: 0;
            list-style: none;
          }
          .autocomplete-suggestions li {
            padding: 10px 16px;
            cursor: pointer;
            transition: background 0.2s;
          }
          .autocomplete-suggestions li:hover,
          .autocomplete-suggestions li.active {
            background: #f3f3ff;
            color: #7c3aed;
          }
        }

        button {
          width: 100%;
          min-height: 44px;
          padding: 10px;
          background-color: #096bc1bb;
          color: white;
          border: none;
          border-radius: 9px;
          transition: ease 0.3s;
          cursor: pointer;
          transition: scale 0.2s;

          &:hover {
            background-color: #096bc1e5;
            scale: 1.15;
          }

          &[type='submit'] {
            background-color: #16a31aa0;

            &:hover {
              background-color: #0bbe11b3;
            }
          }
        }

        .step-actions {
          display: grid;
          grid-template-columns: 1fr;
          gap: 0.75rem;

          @media (min-width: 640px) {
            grid-template-columns: 1fr 1fr;
          }
        }

        .suggested-children {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.4rem;
          margin-bottom: 1rem;
          font-size: 0.8rem;
          color: #7c3aed;

          .suggested-chip {
            width: auto;
            padding: 3px 10px;
            border: 1px dashed #7c3aed88;
            border-radius: 999px;
            background: #f3f3ff;
            font-size: 0.8rem;
            color: #7c3aed;
            cursor: pointer;
            transition: background 0.2s;

            &:hover {
              background: #e6e6ff;
              scale: 1;
            }
          }
        }
      }
    }
  }

  :global(.add-member-modal .liquid-glass-text-container) {
    flex-direction: column;
    // flex-start: with justify-content center (the wrapper's default), content
    // overflowing at the top gets clipped and unreachable by scrolling
    justify-content: flex-start;
    align-items: stretch;
    padding: 30px 20px 20px;
    box-sizing: border-box;
    max-height: 85vh;
    overflow-y: auto;
  }
</style>
