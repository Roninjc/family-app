<script lang="ts">
  import { onMount } from 'svelte'
  import LiquidGlassWrapper from '../../components/liquidGlassWrapper.svelte'
  import type { Role } from '$lib/types/auth'

  export let data: {
    displayName: string
    role: Role
    families: Array<{
      id: string
      name: string
      membersCount: number
      linksCount: number
      previewMembers: string[]
      notes: Array<{ id: string; title: string; body: string }>
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
        notes: Array<{ id: string; title: string; body: string }>
        treeHref: string
      }
    | undefined

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
    selectedFamilyId = familyId
    persistActiveFamily(familyId)

    if (scroll) {
      const card = cards.get(familyId)
      if (card && typeof card.scrollIntoView === 'function') {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
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
  <title>Hub familiar — Familia Castaño</title>
</svelte:head>

<main class="hub-page page-shell">
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
                  <ul>
                    {#each family.notes as note (note.id)}
                      <li>
                        <h5>{note.title}</h5>
                        <p>{note.body}</p>
                      </li>
                    {/each}
                  </ul>
                </div>
              </div>
            </LiquidGlassWrapper>
          </article>
        {/each}
      </div>
      <div class="edge-glow edge-right" aria-hidden="true"></div>
    </div>

    {#if data.families.length > 1}
      <div class="carousel-dots" aria-label="Indicador de familia activa">
        {#each data.families as family, index (family.id)}
          <button
            type="button"
            class="dot"
            class:active={family.id === selectedFamily?.id}
            aria-label={`Ir a ${family.name}`}
            on:click={() => {
              goToFamilyAt(index)
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

  .dot.active {
    background: rgba(116, 95, 75, 0.76);
    transform: scale(1.25);
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
