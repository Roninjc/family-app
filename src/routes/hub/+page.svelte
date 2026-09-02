<script lang="ts">
  import { onMount } from 'svelte'
  import SectionShell from '../../components/ui/sectionShell.svelte'
  import CarouselFrame from '../../components/carousel/carouselFrame.svelte'
  import CarouselCard from '../../components/carousel/carouselCard.svelte'
  import type { HubActionFormState, HubFamilySummary } from '../../components/hub/types'
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
  $: form

  let selectedFamilyId = data.activeFamilyId ?? data.families[0]?.id ?? null
  let syncedServerActiveFamilyId = data.activeFamilyId
  let selectedFamily: HubFamilySummary | undefined
  let isNavigating = false

  $: if (data.activeFamilyId !== syncedServerActiveFamilyId) {
    syncedServerActiveFamilyId = data.activeFamilyId
    selectedFamilyId = data.activeFamilyId ?? data.families[0]?.id ?? null
  }

  $: selectedFamily =
    data.families.find((family) => family.id === selectedFamilyId) ?? data.families[0]
  $: hasFamilies = data.families.length > 0
  $: selectedFamilyIndex = data.families.findIndex((family) => family.id === selectedFamilyId)

  const familyPreviewText = (family: HubFamilySummary) => {
    const names = family.previewMembers.filter(Boolean)

    if (names.length >= 3) {
      return `${names[0]}, ${names[1]} y ${names[2]} sostienen el pulso de ${family.name}.`
    }

    if (names.length === 2) {
      return `${names[0]} y ${names[1]} mantienen vivo el latido de ${family.name}.`
    }

    if (names.length === 1) {
      return `${names[0]} abre el siguiente capitulo de ${family.name}.`
    }

    return `Entrad para descubrir la huella compartida de ${family.name}.`
  }

  const familyMonogram = (name: string) => {
    const words = name
      .split(' ')
      .map((token) => token.trim())
      .filter(Boolean)

    if (words.length === 0) return 'FH'

    if (words.length === 1) {
      return words[0].slice(0, 2).toUpperCase()
    }

    return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.toUpperCase()
  }

  const lineageNames = (family: HubFamilySummary) => {
    const source = family.previewMembers.filter(Boolean)
    const base = source.length > 0 ? source : [family.name, 'Origen', 'Memoria']
    return [...base, ...base, ...base]
  }

  const familyFromItem = (item: unknown) => item as HubFamilySummary
  const familyIdFromItem = (item: unknown) => (item as HubFamilySummary).id
  const familyNameFromItem = (item: unknown) => (item as HubFamilySummary).name

  const clearLoadingSoon = () => {
    if (typeof window === 'undefined') {
      isNavigating = false
      return
    }

    window.requestAnimationFrame(() => {
      isNavigating = false
    })
  }

  const persistActiveFamily = (familyId: string) => {
    document.cookie = `active_family_id=${encodeURIComponent(
      familyId
    )}; path=/; max-age=15552000; samesite=lax`
  }
  const selectFamily = (familyId: string) => {
    if (selectedFamilyId === familyId) return
    selectedFamilyId = familyId
    persistActiveFamily(familyId)
  }

  const handleFamilyActiveIndexChange = (
    nextIndex: number,
    _item: unknown,
    reason: 'mount' | 'scroll' | 'dot' | 'keyboard'
  ) => {
    const family = data.families[nextIndex]
    if (!family) return

    if (reason === 'dot' || reason === 'keyboard') {
      isNavigating = true
      clearLoadingSoon()
    }

    selectFamily(family.id)
  }

  onMount(() => {
    if (selectedFamily?.id) {
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
      <SectionShell title="Tus familias" className="families-shell">
        <CarouselFrame
          items={data.families}
          initialActiveIndex={Math.max(selectedFamilyIndex, 0)}
          getItemKey={familyIdFromItem}
          getDotAriaLabel={(item) => `Ir a ${familyNameFromItem(item)}`}
          onActiveIndexChange={handleFamilyActiveIndexChange}
          cardBasis="var(--family-card-basis)"
          cardOverlap="var(--family-card-overlap)"
          edgeFadeColor="var(--section-shell-bg)"
          shellClass="families-carousel-shell"
          trackClass="families-carousel"
          itemClass="family-panel"
          ariaLabel="Carrusel de familias"
          dotsAriaLabel="Indicador de familia activa"
          let:item
        >
          <CarouselCard
            as="a"
            href={familyFromItem(item).treeHref}
            aspectRatio="4 / 5"
            className="family-story-card"
            ariaLabel={`Entrar al nivel familiar de ${familyFromItem(item).name}`}
            data-sveltekit-preload-data="tap"
            data-sveltekit-preload-code="eager"
          >
            <div class="panel-header">
              <h3>{familyFromItem(item).name}</h3>
            </div>

            <div class="family-seal" aria-hidden="true">
              <span>{familyMonogram(familyFromItem(item).name)}</span>
            </div>

            <p class="family-preview-copy">{familyPreviewText(familyFromItem(item))}</p>

            <div class="family-lineage" aria-hidden="true">
              <div class="lineage-track">
                {#each lineageNames(familyFromItem(item)) as name, index (`${familyIdFromItem(item)}-lineage-${index}`)}
                  <span>{name}</span>
                {/each}
              </div>
            </div>
            <div class="loading-sheen" aria-hidden="true"></div>
          </CarouselCard>
        </CarouselFrame>
      </SectionShell>
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

  .families-zone {
    --family-card-basis: clamp(240px, 58vw, 380px);
    --family-card-overlap: clamp(20px, 6vw, 48px);
    width: min(var(--page-content-max), 100%);
    margin-inline: auto;
  }

  :global(.families-shell) {
    max-height: clamp(520px, 74dvh, 780px);
    overflow: hidden;
  }

  :global(.family-story-card) {
    display: grid;
    grid-template-rows: auto auto auto minmax(0, 1fr);
    gap: var(--space-4);
    min-block-size: clamp(300px, 68vw, 500px);
    max-block-size: min(70dvh, 560px);
    padding: clamp(var(--space-4), 3.6vw, var(--space-6));
  }

  :global(.family-story-card):hover,
  :global(.family-story-card):focus-visible {
    transform: translateY(-1px) scale(1.01);
    box-shadow: var(--neu-shadow-hover-strong);
  }

  :global(.family-story-card):focus-visible {
    outline: 2px solid color-mix(in srgb, var(--brand) 86%, #fff 14%);
    outline-offset: 3px;
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

  .family-seal {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .family-seal span {
    inline-size: clamp(46px, 11vw, 58px);
    block-size: clamp(46px, 11vw, 58px);
    border-radius: var(--radius-round);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: clamp(0.8rem, 0.74rem + 0.18vw, 0.92rem);
    font-weight: 700;
    letter-spacing: 0.08em;
    color: #6a4f3b;
    background: color-mix(in srgb, #fff 82%, rgba(210, 183, 156, 0.55));
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.5),
      3px 4px 9px rgba(128, 97, 71, 0.18);
  }

  .family-preview-copy {
    margin: 0;
    text-align: center;
    color: #6b5443;
    font-size: clamp(0.86rem, 0.82rem + 0.18vw, 0.96rem);
    line-height: 1.5;
  }

  .family-lineage {
    position: relative;
    display: flex;
    align-items: center;
    min-height: 0;
    padding-block: var(--space-2);
    overflow: hidden;
    mask-image: linear-gradient(to right, transparent, #000 14%, #000 86%, transparent);
    -webkit-mask-image: linear-gradient(to right, transparent, #000 14%, #000 86%, transparent);
  }

  .lineage-track {
    width: max-content;
    display: inline-flex;
    align-items: center;
    gap: var(--space-3);
    animation: lineage-flow 20s linear infinite;
  }

  .lineage-track span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: max-content;
    border-radius: var(--radius-sm);
    padding: var(--space-1) var(--space-2);
    font-size: var(--fs-xs);
    color: #6c5340;
    letter-spacing: 0.01em;
    background: color-mix(in srgb, rgba(255, 255, 255, 0.85) 70%, rgba(219, 197, 173, 0.7));
    box-shadow:
      inset 0 0 0 1px rgba(255, 255, 255, 0.24),
      2px 2px 6px rgba(126, 91, 62, 0.12);
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

  .is-loading :global(.family-story-card > :not(.loading-sheen)) {
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

  @keyframes lineage-flow {
    from {
      transform: translateX(0);
    }
    to {
      transform: translateX(-50%);
    }
  }

  @media (min-width: 980px) {
    .families-zone {
      --family-card-basis: min(44vw, 420px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    :global(.family-story-card),
    .lineage-track {
      transition: none;
      animation: none;
    }
  }
</style>
