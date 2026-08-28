<script lang="ts">
  import { onMount } from 'svelte'
  import FamilyNotesCard from '../../components/hub/familyNotesCard.svelte'
  import FamilyPreviewCard from '../../components/hub/familyPreviewCard.svelte'
  import type {
    HubActionFormState,
    HubFamilySummary,
    HubNote,
    HubNoteType,
    HubNotesFilter,
    HubNotesStatusState
  } from '../../components/hub/types'
  import type { PageData } from './$types'

  type HubPageData = Omit<
    Pick<
      PageData,
      | 'displayName'
      | 'role'
      | 'families'
      | 'activeFamilyId'
      | 'activeFamilyName'
      | 'pendingInvitations'
      | 'showPendingInvitations'
    >,
    'families'
  > & {
    families: HubFamilySummary[]
    noFamilyRouteState?: boolean
  }

  export let form: HubActionFormState | null | undefined = undefined

  export let data: HubPageData
  export let params: Record<string, string> = {}
  $: routeParamsCount = Object.keys(params).length

  let carousel: HTMLDivElement | null = null
  const cards = new Map<string, HTMLElement>()
  let selectedFamilyId = data.activeFamilyId ?? data.families[0]?.id ?? null
  let syncedServerActiveFamilyId = data.activeFamilyId
  let selectedFamily: HubFamilySummary | undefined

  let editingId: string | null = null
  let titleDraft = ''
  let bodyDraft = ''
  let typeDraft: HubNoteType = 'note'
  let notesFilterByFamily: Record<string, HubNotesFilter> = {}
  let filteredNotesByFamily: Record<string, HubNote[]> = {}
  let isNavigating = false

  const startEdit = (note: HubNote) => {
    editingId = note.id
    titleDraft = note.title
    bodyDraft = note.body
    typeDraft = note.noteType
  }

  const cancelEdit = () => {
    editingId = null
    titleDraft = ''
    bodyDraft = ''
    typeDraft = 'note'
  }

  const notesFilterOptions = [
    { value: 'all', label: 'Todas' },
    { value: 'news', label: 'Noticias' },
    { value: 'note', label: 'Notas' }
  ]

  $: if (data.activeFamilyId !== syncedServerActiveFamilyId) {
    syncedServerActiveFamilyId = data.activeFamilyId
    selectedFamilyId = data.activeFamilyId ?? data.families[0]?.id ?? null
  }

  $: selectedFamily =
    data.families.find((family) => family.id === selectedFamilyId) ?? data.families[0]
  $: hasFamilies = data.families.length > 0

  $: {
    const filters = notesFilterByFamily
    filteredNotesByFamily = Object.fromEntries(
      data.families.map((family) => {
        const filter = filters[family.id] ?? 'all'
        const filtered =
          filter === 'all' ? family.notes : family.notes.filter((note) => note.noteType === filter)
        return [family.id, filtered]
      })
    )
  }

  const setNotesFilter = (familyId: string, filter: HubNotesFilter) => {
    if ((notesFilterByFamily[familyId] ?? 'all') === filter) return

    notesFilterByFamily = {
      ...notesFilterByFamily,
      [familyId]: filter
    }
  }

  const onNotesFilterChange = (familyId: string, event: CustomEvent<string>) => {
    const value = event.detail
    if (value === 'all' || value === 'news' || value === 'note') {
      setNotesFilter(familyId, value)
    }
  }

  const notesStatusForFamily = (familyId: string): HubNotesStatusState => {
    if (!form) return {}
    if (form.familyId && form.familyId !== familyId) return {}

    return {
      created: form.noteCreated,
      updated: form.noteUpdated,
      deleted: form.noteDeleted,
      errorMessage: form.noteError
    }
  }

  const clearLoadingSoon = () => {
    if (typeof window === 'undefined') {
      isNavigating = false
      return
    }

    window.requestAnimationFrame(() => {
      isNavigating = false
    })
  }

  const setCardRef = (familyId: string, element: HTMLElement | null) => {
    if (!element) {
      cards.delete(familyId)
      return
    }
    cards.set(familyId, element)
  }

  const trackCard = (node: HTMLElement, familyId: string) => {
    setCardRef(familyId, node)
    return {
      destroy() {
        setCardRef(familyId, null)
      }
    }
  }

  const persistActiveFamily = (familyId: string) => {
    document.cookie = `active_family_id=${encodeURIComponent(
      familyId
    )}; path=/; max-age=15552000; samesite=lax`
  }

  const selectFamily = (familyId: string, scroll = true) => {
    if (selectedFamilyId === familyId) return
    isNavigating = true
    selectedFamilyId = familyId
    persistActiveFamily(familyId)

    if (scroll) {
      const card = cards.get(familyId)
      if (card && typeof card.scrollIntoView === 'function') {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }

    clearLoadingSoon()
  }

  const detectCenteredFamily = () => {
    if (!carousel) return

    const trackRect = carousel.getBoundingClientRect()
    const trackCenter = trackRect.left + trackRect.width / 2
    let closestId: string | null = null
    let minDistance = Number.POSITIVE_INFINITY

    for (const family of data.families) {
      const card = cards.get(family.id)
      if (!card) continue
      const rect = card.getBoundingClientRect()
      const center = rect.left + rect.width / 2
      const distance = Math.abs(center - trackCenter)

      if (distance < minDistance) {
        minDistance = distance
        closestId = family.id
      }
    }

    if (closestId && closestId !== selectedFamilyId) {
      selectedFamilyId = closestId
      persistActiveFamily(closestId)
    }
  }

  const goToFamilyAt = (index: number) => {
    const family = data.families[index]
    if (!family) return
    selectFamily(family.id)
  }

  const focusDotAt = (index: number) => {
    const dots = Array.from(document.querySelectorAll<HTMLButtonElement>('.carousel-dots .dot'))
    dots[index]?.focus()
  }

  const handleDotKeydown = (event: KeyboardEvent, index: number) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      const nextIndex = (index + 1) % data.families.length
      goToFamilyAt(nextIndex)
      focusDotAt(nextIndex)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const prevIndex = (index - 1 + data.families.length) % data.families.length
      goToFamilyAt(prevIndex)
      focusDotAt(prevIndex)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      goToFamilyAt(0)
      focusDotAt(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      const lastIndex = data.families.length - 1
      goToFamilyAt(lastIndex)
      focusDotAt(lastIndex)
    }
  }

  onMount(() => {
    if (selectedFamily?.id) {
      const selectedCard = cards.get(selectedFamily.id)
      if (selectedCard && typeof selectedCard.scrollIntoView === 'function') {
        selectedCard.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'center' })
      }
      persistActiveFamily(selectedFamily.id)
    }
  })
</script>

<svelte:head>
  <title>Hub familiar — Orikara</title>
</svelte:head>

<main
  class="hub-page page-shell"
  class:is-loading={isNavigating}
  aria-busy={isNavigating}
  data-route-params-count={routeParamsCount}
>
  {#if !hasFamilies}
    <section class="personal-empty reveal-fade-up reveal-delay-1" aria-label="Estado sin familias">
      <div class="personal-empty-card app-card-soft">
        <h2>Aun no perteneces a ninguna familia</h2>
        <p>
          Tu cuenta personal ya esta lista. Para ver arboles, hub familiar y administracion, primero
          necesitas unirte a una familia o crear una en el siguiente paso.
        </p>
        {#if data.noFamilyRouteState}
          <p class="personal-empty-note" role="status">
            Intentaste abrir una vista familiar, pero todavia no tienes una familia activa.
          </p>
        {/if}
        <div class="personal-empty-actions">
          <a class="app-btn app-btn--primary" href="/profile">Gestionar cuenta</a>
        </div>
      </div>
    </section>
  {:else}
    <section class="families-zone reveal-fade-up reveal-delay-1" aria-label="Familias del usuario">
      <div class="zone-title-row">
        <h2>Tus familias</h2>
        {#if data.families.length > 1}
          <p class="scroll-hint" role="status">Desliza para cambiar de familia activa</p>
        {/if}
      </div>

      <div class="carousel-shell" class:multi={data.families.length > 1}>
        <div class="edge-glow edge-left" aria-hidden="true"></div>
        <div
          class="families-carousel"
          bind:this={carousel}
          on:scroll={detectCenteredFamily}
          role="region"
          aria-label="Carrusel de familias"
        >
          {#each data.families as family (family.id)}
            <article
              class="family-panel"
              class:active={family.id === selectedFamily?.id}
              use:trackCard={family.id}
            >
              <div class="family-content">
                <div class="panel-header">
                  <h3>{family.name}</h3>
                </div>

                <div class="family-center">
                  <a
                    class="family-preview-entry"
                    href={family.treeHref}
                    data-sveltekit-preload-data="tap"
                    data-sveltekit-preload-code="eager"
                    aria-label={`Entrar al nivel familiar de ${family.name}`}
                  >
                    <FamilyPreviewCard {family} />
                  </a>

                  <FamilyNotesCard
                    {family}
                    notes={filteredNotesByFamily[family.id] ?? []}
                    filter={notesFilterByFamily[family.id] ?? 'all'}
                    filterOptions={notesFilterOptions}
                    status={notesStatusForFamily(family.id)}
                    {editingId}
                    bind:titleDraft
                    bind:bodyDraft
                    bind:typeDraft
                    onFilterChange={(event) => onNotesFilterChange(family.id, event)}
                    onEditStart={startEdit}
                    onEditCancel={cancelEdit}
                  />
                </div>
                <div class="loading-sheen" aria-hidden="true"></div>
              </div>
            </article>
          {/each}
        </div>
        <div class="edge-glow edge-right" aria-hidden="true"></div>
      </div>

      {#if data.families.length > 1}
        <div class="carousel-dots" role="tablist" aria-label="Indicador de familia activa">
          <div class="dots-track">
            {#each data.families as family, index (family.id)}
              <button
                type="button"
                class="dot"
                class:active={family.id === selectedFamily?.id}
                role="tab"
                aria-selected={family.id === selectedFamily?.id}
                tabindex={family.id === selectedFamily?.id ? 0 : -1}
                aria-label={`Ir a ${family.name}`}
                on:click={() => {
                  goToFamilyAt(index)
                }}
                on:keydown={(event) => {
                  handleDotKeydown(event, index)
                }}
              ></button>
            {/each}
          </div>
        </div>
      {/if}
    </section>
  {/if}
</main>

<style lang="scss">
  .hub-page {
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 100vh;
    padding-bottom: max(114px, env(safe-area-inset-bottom));
  }

  .families-zone {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: min(var(--page-content-max), 100%);
    margin-inline: auto;
    border-radius: var(--radius-xl);
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  .personal-empty {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: min(var(--page-content-max), 100%);
    margin-inline: auto;
  }

  .personal-empty-card {
    border-radius: var(--radius-xl);
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    text-align: left;
  }

  .personal-empty-card h2 {
    margin: 0;
    font-size: var(--fs-lg);
    line-height: var(--lh-tight);
  }

  .personal-empty-card p {
    margin: 0;
    color: var(--text-muted);
    line-height: var(--lh-copy);
    font-size: var(--fs-sm);
  }

  .personal-empty-note {
    border: 1px solid rgba(201, 176, 141, 0.48);
    background: color-mix(in srgb, var(--brand-soft) 82%, rgba(255, 255, 255, 0.9));
    padding: 10px 12px;
    border-radius: var(--radius-md);
    color: var(--text-main);
  }

  .personal-empty-actions {
    display: flex;
    justify-content: flex-start;
    margin-top: 4px;
  }

  .zone-title-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    padding: 4px 2px 0;
  }

  h2 {
    margin: 0;
    font-size: var(--fs-lg);
  }

  .scroll-hint {
    margin: 0;
    color: var(--text-muted);
    font-size: var(--fs-xs);
  }

  .carousel-shell {
    position: relative;
    border-radius: var(--radius-lg);
    margin-inline: 0;
    padding: 6px;
    background: transparent;
    box-shadow: var(--neu-shadow-inset);
  }

  .families-carousel {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(100%, 100%);
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding: 2px;
  }

  .family-panel {
    scroll-snap-align: center;
    min-height: 470px;
    container-type: inline-size;
    border-radius: var(--radius-card);
  }

  .family-content {
    position: relative;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 20px;
    padding: 26px 24px 20px;
    border-radius: inherit;
    background: transparent;
    box-shadow: none;
  }

  .family-center {
    display: grid;
    gap: 24px;
    flex: 1;
    min-height: 0;
  }

  .family-preview-entry {
    display: block;
    border-radius: var(--radius-card);
    text-decoration: none;
    color: inherit;
  }

  .family-preview-entry :global(.preview-card) {
    transition:
      box-shadow 0.24s var(--motion-standard),
      background-color 0.24s var(--motion-standard),
      filter 0.24s var(--motion-standard);
  }

  .family-preview-entry:hover :global(.preview-card),
  .family-preview-entry:focus-visible :global(.preview-card) {
    box-shadow: var(--neu-shadow-hover-strong);
    background: color-mix(in srgb, var(--neu-surface-soft) 82%, #ffffff 18%);
    filter: saturate(1.04);
  }

  .family-preview-entry:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--brand) 86%, #fff 14%);
    outline-offset: 3px;
    border-radius: var(--radius-card);
  }

  .panel-header {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    text-align: center;
    flex-wrap: wrap;
  }

  h3 {
    margin: 0;
    font-size: clamp(1.28rem, 1.14rem + 0.62vw, 1.62rem);
    font-weight: 800;
    line-height: 1.18;
    letter-spacing: 0.015em;
    color: #4e392d;
  }

  .family-panel.active :global(.preview-card),
  .family-panel.active :global(.notes-card) {
    box-shadow:
      5px 5px 10px rgba(154, 132, 109, 0.18),
      -5px -5px 10px rgba(255, 255, 255, 0.74);
  }

  .family-panel.active .family-preview-entry:hover :global(.preview-card),
  .family-panel.active .family-preview-entry:focus-visible :global(.preview-card) {
    box-shadow: var(--neu-shadow-hover-strong);
    background: color-mix(in srgb, var(--neu-surface-soft) 82%, #ffffff 18%);
    filter: saturate(1.04);
  }

  .edge-glow {
    display: none;
  }

  .carousel-shell.multi .edge-glow {
    display: block;
    position: absolute;
    top: 0;
    bottom: 8px;
    width: 24px;
    pointer-events: none;
    z-index: 3;
  }

  .edge-left {
    left: 0;
    background: linear-gradient(90deg, rgba(239, 232, 222, 0.9), transparent);
  }

  .edge-right {
    right: 0;
    background: linear-gradient(270deg, rgba(239, 232, 222, 0.9), transparent);
  }

  .carousel-dots {
    --dots-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
    --dots-dur: 520ms;
    display: flex;
    justify-content: center;
    margin-top: 2px;
  }

  .dots-track {
    display: inline-flex;
    align-items: center;
    gap: clamp(5px, 0.9vw, 8px);
    padding: 0;
    background: transparent;
    border: none;
  }

  .dot {
    width: 5px;
    height: 5px;
    border-radius: 999px;
    border: none;
    background: rgba(128, 101, 79, 0.24);
    opacity: 0.5;
    transition:
      width var(--dots-dur) var(--dots-ease),
      transform var(--dots-dur) var(--dots-ease),
      background-color var(--dots-dur) var(--dots-ease),
      opacity var(--dots-dur) var(--dots-ease),
      box-shadow var(--dots-dur) var(--dots-ease);
    cursor: pointer;
  }

  .dot:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--brand) 84%, #fff 16%);
    outline-offset: 3px;
    box-shadow: var(--focus-ring-warm);
  }

  .dot.active {
    width: 12px;
    background: rgba(165, 120, 82, 0.72);
    transform: scaleX(1);
    box-shadow: 0 0 0 1px rgba(165, 120, 82, 0.14);
    opacity: 0.95;
  }

  .loading-sheen {
    position: absolute;
    inset: 0;
    pointer-events: none;
    opacity: 0;
    transform: translateX(-120%);
    background: linear-gradient(
      110deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.34) 42%,
      rgba(255, 255, 255, 0) 72%
    );
    will-change: transform;
  }

  .is-loading .loading-sheen {
    opacity: 1;
    animation: loading-sweep 1.2s var(--motion-standard) infinite;
  }

  .is-loading .family-content > :not(.loading-sheen) {
    opacity: 0.72;
  }

  .is-loading .families-zone {
    pointer-events: none;
  }

  @keyframes loading-sweep {
    to {
      transform: translateX(120%);
    }
  }

  @media (min-width: 980px) {
    .families-carousel {
      grid-auto-columns: minmax(76%, 76%);
      padding-inline: 60px;
    }

    .family-panel {
      min-height: 400px;
    }
  }

  @supports (container-type: inline-size) {
    @container (min-width: 760px) {
      .family-center {
        grid-template-columns: minmax(220px, 0.95fr) minmax(0, 1.35fr);
        align-items: stretch;
      }
    }

    @container (max-width: 520px) {
      .panel-header {
        justify-content: center;
      }
    }
  }
</style>
