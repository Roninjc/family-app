<script lang="ts">
  import { onMount } from 'svelte'
  import LiquidGlassWrapper from '../../components/liquidGlassWrapper.svelte'
  import type { Role } from '$lib/types/auth'

  export let form:
    | {
        noteCreated?: boolean
        noteUpdated?: boolean
        noteDeleted?: boolean
        noteError?: string
        familyId?: string
      }
    | undefined = undefined

  export let data: {
    displayName: string
    role: Role
    families: Array<{
      id: string
      name: string
      membersCount: number
      linksCount: number
      previewMembers: string[]
        canManageNotes: boolean
        notes: Array<{ id: string; title: string; body: string; noteType: 'news' | 'note' }>
      treeHref: string
    }>
    activeFamilyId: string | null
    activeFamilyName: string | null
    pendingInvitations: number
    showPendingInvitations: boolean
  }

  let carousel: HTMLDivElement | null = null
  const cards = new Map<string, HTMLElement>()
  let selectedFamilyId = data.activeFamilyId ?? data.families[0]?.id ?? null
  let syncedServerActiveFamilyId = data.activeFamilyId
  let selectedFamily:
    | {
        id: string
        name: string
        membersCount: number
        linksCount: number
        previewMembers: string[]
        canManageNotes: boolean
        notes: Array<{ id: string; title: string; body: string; noteType: 'news' | 'note' }>
        treeHref: string
      }
    | undefined

  let editingNoteId: string | null = null
  let draftTitle = ''
  let draftBody = ''
  let draftType: 'news' | 'note' = 'note'
  let creatingForFamilyId: string | null = null
  let isNavigating = true

  const openEditor = (note: { id: string; title: string; body: string; noteType: 'news' | 'note' }) => {
    editingNoteId = note.id
    draftTitle = note.title
    draftBody = note.body
    draftType = note.noteType
  }

  const closeEditor = () => {
    editingNoteId = null
    draftTitle = ''
    draftBody = ''
    draftType = 'note'
  }

  const toggleCreate = (familyId: string) => {
    creatingForFamilyId = creatingForFamilyId === familyId ? null : familyId
    closeEditor()
  }

  const roleLabels: Record<Role, string> = {
    admin: 'Administrador',
    editor: 'Editor',
    viewer: 'Solo lectura'
  }

  $: if (data.activeFamilyId !== syncedServerActiveFamilyId) {
    syncedServerActiveFamilyId = data.activeFamilyId
    selectedFamilyId = data.activeFamilyId ?? data.families[0]?.id ?? null
  }

  $: selectedFamily = data.families.find((family) => family.id === selectedFamilyId) ?? data.families[0]

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
    document.cookie = `active_family_id=${encodeURIComponent(familyId)}; path=/; max-age=15552000; samesite=lax`

    const nextUrl = new URL(window.location.href)
    nextUrl.searchParams.set('family', familyId)
    window.history.replaceState(window.history.state, '', nextUrl)
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

    clearLoadingSoon()
  })
</script>

<svelte:head>
  <title>Hub familiar — Familia Castaño</title>
</svelte:head>

<main class="hub-page page-shell" class:is-loading={isNavigating} aria-busy={isNavigating}>
  <section class="hub-header reveal-fade-up">
    <LiquidGlassWrapper>
      <div class="header-content">
        <p class="crumb">Hub / {selectedFamily?.name ?? 'Sin familia'}</p>
        <h1>Hola, {data.displayName}</h1>
        <p class="welcome">Bienvenido. Estás en {selectedFamily?.name ?? 'tu espacio familiar'}.</p>
        <div class="chips-row">
          <span class="role-chip">{roleLabels[data.role]}</span>
          {#if data.showPendingInvitations}
            <a class="pending-chip" href="/admin">
              Invitaciones {data.pendingInvitations > 0 ? `(${data.pendingInvitations})` : '(0)'}
            </a>
          {/if}
        </div>
        <div class="loading-sheen" aria-hidden="true"></div>
      </div>
    </LiquidGlassWrapper>
  </section>

  <section class="families-zone reveal-fade-up reveal-delay-1" aria-label="Familias del usuario">
    <div class="zone-title-row">
      <h2>Familias</h2>
      {#if data.families.length > 1}
        <p class="scroll-hint" role="status">Desliza para cambiar de familia</p>
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
            <LiquidGlassWrapper>
              <div class="family-content">
                <div class="panel-header">
                  <div>
                    <p class="panel-kicker">Grupo familiar</p>
                    <h3>{family.name}</h3>
                  </div>
                  <a class="app-btn app-btn--primary panel-tree-link" href={family.treeHref}>Abrir árbol</a>
                </div>

                <div class="preview-card" aria-label={`Previsualización de ${family.name}`}>
                  <div class="preview-stats">
                    <p>
                      <strong>{family.membersCount}</strong>
                      <span>miembros</span>
                    </p>
                    <p>
                      <strong>{family.linksCount}</strong>
                      <span>relaciones</span>
                    </p>
                  </div>
                  <ul class="preview-members">
                    {#each family.previewMembers as memberName}
                      <li>{memberName}</li>
                    {/each}
                  </ul>
                </div>

                <div class="notes-card">
                  <h4>Noticias y notas</h4>
                  {#if family.canManageNotes}
                    <button
                      type="button"
                      class="app-btn app-btn--secondary note-create-toggle"
                      on:click={() => {
                        toggleCreate(family.id)
                      }}
                    >
                      {creatingForFamilyId === family.id ? 'Cerrar editor' : 'Nueva nota'}
                    </button>

                    {#if creatingForFamilyId === family.id}
                      <form method="POST" action="?/createNote" class="note-form">
                        <input type="hidden" name="familyId" value={family.id} />
                        <label>
                          Título
                          <input class="modern-input" name="title" maxlength="120" required />
                        </label>
                        <label>
                          Tipo
                          <select class="modern-select" name="noteType">
                            <option value="note">Nota</option>
                            <option value="news">Noticia</option>
                          </select>
                        </label>
                        <label>
                          Contenido
                          <textarea class="modern-textarea" name="body" rows="3" required></textarea>
                        </label>
                        <button class="app-btn app-btn--primary" type="submit">Guardar nota</button>
                      </form>
                    {/if}
                  {/if}

                  {#if form?.noteError && (!form.familyId || form.familyId === family.id)}
                    <p class="note-error" role="alert">{form.noteError}</p>
                  {/if}

                  {#if form?.noteCreated && form.familyId === family.id}
                    <p class="note-ok" role="status">Nota creada.</p>
                  {/if}
                  {#if form?.noteUpdated && form.familyId === family.id}
                    <p class="note-ok" role="status">Nota actualizada.</p>
                  {/if}
                  {#if form?.noteDeleted && form.familyId === family.id}
                    <p class="note-ok" role="status">Nota eliminada.</p>
                  {/if}

                  <ul>
                    {#each family.notes as note (note.id)}
                      <li>
                        <div class="note-head">
                          <h5>{note.title}</h5>
                          <span class="note-type" class:news={note.noteType === 'news'}>
                            {note.noteType === 'news' ? 'Noticia' : 'Nota'}
                          </span>
                        </div>

                        {#if editingNoteId === note.id}
                          <form method="POST" action="?/updateNote" class="note-form note-form-inline">
                            <input type="hidden" name="familyId" value={family.id} />
                            <input type="hidden" name="noteId" value={note.id} />
                            <label>
                              Título
                              <input class="modern-input" name="title" bind:value={draftTitle} maxlength="120" required />
                            </label>
                            <label>
                              Tipo
                              <select class="modern-select" name="noteType" bind:value={draftType}>
                                <option value="note">Nota</option>
                                <option value="news">Noticia</option>
                              </select>
                            </label>
                            <label>
                              Contenido
                              <textarea class="modern-textarea" name="body" rows="3" bind:value={draftBody} required></textarea>
                            </label>
                            <div class="note-actions">
                              <button class="app-btn app-btn--primary" type="submit">Guardar</button>
                              <button
                                class="app-btn app-btn--ghost"
                                type="button"
                                on:click={() => {
                                  closeEditor()
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        {:else}
                          <p>{note.body}</p>
                          {#if family.canManageNotes}
                            <div class="note-actions">
                              <button
                                type="button"
                                class="app-btn app-btn--ghost note-action-btn"
                                on:click={() => {
                                  openEditor(note)
                                }}
                              >
                                Editar
                              </button>
                              <form method="POST" action="?/deleteNote">
                                <input type="hidden" name="familyId" value={family.id} />
                                <input type="hidden" name="noteId" value={note.id} />
                                <button class="app-btn app-btn--danger note-action-btn" type="submit">
                                  Eliminar
                                </button>
                              </form>
                            </div>
                          {/if}
                        {/if}
                      </li>
                    {/each}
                  </ul>
                </div>
                <div class="loading-sheen" aria-hidden="true"></div>
              </div>
            </LiquidGlassWrapper>
          </article>
        {/each}
      </div>
      <div class="edge-glow edge-right" aria-hidden="true"></div>
    </div>

    {#if data.families.length > 1}
      <div class="carousel-dots" role="tablist" aria-label="Indicador de familia activa">
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
    {/if}
  </section>
</main>

<style lang="scss">
  .hub-page {
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: 100vh;
    padding-bottom: max(114px, env(safe-area-inset-bottom));
  }

  .hub-header :global(.liquid-glass-wrapper),
  .family-panel :global(.liquid-glass-wrapper) {
    width: 100%;
  }

  .header-content {
    position: relative;
    overflow: hidden;
    width: 100%;
    padding: 18px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .crumb {
    margin: 0;
    font-size: var(--fs-2xs);
    color: var(--text-muted);
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    font-size: var(--fs-xl);
    line-height: var(--lh-tight);
  }

  .welcome {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--text-muted);
  }

  .chips-row {
    margin-top: 3px;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .role-chip,
  .pending-chip {
    font-size: var(--fs-2xs);
    border-radius: 999px;
    padding: 4px 10px;
  }

  .role-chip {
    color: #6f4a2e;
    background: rgba(205, 140, 92, 0.25);
  }

  .pending-chip {
    color: #5c4634;
    background: rgba(168, 132, 101, 0.18);
    text-decoration: none;
    transition: background-color 0.2s var(--motion-standard);
  }

  .pending-chip:hover {
    background: rgba(168, 132, 101, 0.28);
  }

  .families-zone {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .zone-title-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 8px;
    padding-inline: 2px;
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
  }

  .families-carousel {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(100%, 100%);
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding-bottom: 6px;
  }

  .family-panel {
    scroll-snap-align: center;
    min-height: 470px;
  }

  .family-panel :global(.liquid-glass-wrapper) {
    height: 100%;
    transition:
      transform 0.24s var(--motion-standard),
      box-shadow 0.24s var(--motion-standard);
  }

  .family-panel.active :global(.liquid-glass-wrapper) {
    transform: translateY(-2px);
    box-shadow: 0 18px 28px rgba(93, 66, 43, 0.18);
  }

  .family-content {
    position: relative;
    overflow: hidden;
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .panel-kicker {
    margin: 0;
    font-size: var(--fs-2xs);
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  h3 {
    margin: 2px 0 0;
    font-size: var(--fs-lg);
    line-height: 1.18;
  }

  .panel-tree-link {
    white-space: nowrap;
  }

  .panel-tree-link:focus-visible,
  .note-create-toggle:focus-visible,
  .note-action-btn:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--brand) 86%, #fff 14%);
    outline-offset: 3px;
    box-shadow: 0 0 0 5px rgba(223, 203, 182, 0.38);
  }

  .preview-card,
  .notes-card {
    border-radius: 12px;
    background: linear-gradient(165deg, rgba(255, 252, 247, 0.62), rgba(246, 234, 216, 0.48));
    border: 1px solid rgba(199, 169, 138, 0.34);
  }

  .preview-card {
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .preview-stats {
    display: flex;
    gap: 10px;
  }

  .preview-stats p {
    margin: 0;
    flex: 1;
    border-radius: 10px;
    padding: 8px 10px;
    background: rgba(255, 255, 255, 0.52);
    display: flex;
    flex-direction: column;
    gap: 2px;
    color: #5b4430;
  }

  .preview-stats strong {
    font-size: 1.08rem;
    line-height: 1;
  }

  .preview-stats span {
    font-size: var(--fs-2xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .preview-members {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin: 0;
    padding: 0;
  }

  .preview-members li {
    border-radius: 999px;
    background: rgba(127, 94, 66, 0.14);
    color: #5c4534;
    padding: 5px 9px;
    font-size: var(--fs-xs);
  }

  .notes-card {
    padding: 12px;
  }

  .note-create-toggle {
    width: 100%;
    margin-bottom: 8px;
  }

  .note-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 10px;
  }

  .note-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .modern-input,
  .modern-select,
  .modern-textarea {
    width: 100%;
    border: 1px solid rgba(168, 132, 101, 0.32);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.78);
    color: var(--text-main);
    font-family: inherit;
    font-size: var(--fs-sm);
  }

  .modern-input,
  .modern-select {
    min-height: 40px;
    padding: 0.42rem 0.58rem;
  }

  .modern-textarea {
    padding: 0.52rem 0.58rem;
    resize: vertical;
  }

  .note-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  .note-action-btn {
    min-height: 34px;
    font-size: var(--fs-xs);
    padding: 0.45rem 0.68rem;
  }

  .note-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }

  .note-type {
    border-radius: 999px;
    padding: 2px 8px;
    font-size: var(--fs-2xs);
    background: rgba(117, 108, 96, 0.16);
    color: #5e4c3e;
    white-space: nowrap;
  }

  .note-type.news {
    background: rgba(161, 120, 80, 0.2);
    color: #6f4a2e;
  }

  .note-ok,
  .note-error {
    margin: 0 0 8px;
    font-size: var(--fs-xs);
  }

  .note-ok {
    color: var(--ok);
  }

  .note-error {
    color: var(--danger);
  }

  h4 {
    margin: 0 0 8px;
    font-size: var(--fs-md);
  }

  .notes-card ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
  }

  .notes-card li {
    padding: 9px 10px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.56);
  }

  h5,
  .notes-card p {
    margin: 0;
  }

  h5 {
    font-size: var(--fs-sm);
    margin-bottom: 4px;
  }

  .notes-card p {
    color: var(--text-muted);
    font-size: var(--fs-xs);
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
    background: linear-gradient(90deg, rgba(241, 236, 228, 0.88), transparent);
  }

  .edge-right {
    right: 0;
    background: linear-gradient(270deg, rgba(241, 236, 228, 0.88), transparent);
  }

  .carousel-dots {
    display: flex;
    justify-content: center;
    gap: 7px;
    margin-top: 2px;
  }

  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    border: none;
    background: rgba(116, 95, 75, 0.24);
    transition:
      transform 0.22s var(--motion-standard),
      background-color 0.22s var(--motion-standard);
    cursor: pointer;
  }

  .dot:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--brand) 84%, #fff 16%);
    outline-offset: 3px;
    box-shadow: 0 0 0 4px rgba(198, 171, 139, 0.4);
  }

  .dot.active {
    background: rgba(116, 95, 75, 0.76);
    transform: scale(1.25);
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

  .is-loading .header-content > :not(.loading-sheen),
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
</style>
