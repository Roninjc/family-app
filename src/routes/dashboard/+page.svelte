<script lang="ts">
  import { onMount } from 'svelte'
  import SectionShell from '../../components/ui/sectionShell.svelte'
  import CarouselFrame from '../../components/carousel/carouselFrame.svelte'
  import FamilyStoryCard from '../../components/carousel/familyStoryCard.svelte'
  import type { DashboardActionFormState, DashboardFamilySummary } from '../../components/feed/types'
  import type { PageData } from './$types'

  type DashboardPageData = Omit<
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
    families: DashboardFamilySummary[]
    noFamilyRouteState?: boolean
  }

  export let form: DashboardActionFormState | null | undefined = undefined
  export let data: DashboardPageData
  export let params: Record<string, string> = {}
  $: routeParamsCount = Object.keys(params).length
  $: form

  let selectedFamilyId = data.activeFamilyId ?? data.families[0]?.id ?? null
  let syncedServerActiveFamilyId = data.activeFamilyId
  let selectedFamily: DashboardFamilySummary | undefined
  let isNavigating = false

  $: if (data.activeFamilyId !== syncedServerActiveFamilyId) {
    syncedServerActiveFamilyId = data.activeFamilyId
    selectedFamilyId = data.activeFamilyId ?? data.families[0]?.id ?? null
  }

  $: selectedFamily =
    data.families.find((family) => family.id === selectedFamilyId) ?? data.families[0]
  $: hasFamilies = data.families.length > 0
  $: selectedFamilyIndex = data.families.findIndex((family) => family.id === selectedFamilyId)

  const familyFromItem = (item: unknown) => item as DashboardFamilySummary
  const familyIdFromItem = (item: unknown) => (item as DashboardFamilySummary).id
  const familyNameFromItem = (item: unknown) => (item as DashboardFamilySummary).name

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
  <title>Panel personal — Orikara</title>
</svelte:head>

<main
  class="dashboard-page page-shell"
  class:is-loading={isNavigating}
  aria-busy={isNavigating}
  data-route-params-count={routeParamsCount}
>
  {#if !hasFamilies}
    <section class="personal-empty reveal-fade-up reveal-delay-1" aria-label="Estado sin familias">
      <div class="personal-empty-card app-card-soft">
        <h2>Aun no perteneces a ninguna familia</h2>
        <p>
          Tu cuenta personal ya esta lista. Para ver arboles, novedades familiares y administracion,
          primero necesitas unirte a una familia o crear una en el siguiente paso.
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
          <FamilyStoryCard family={familyFromItem(item)} />
        </CarouselFrame>
      </SectionShell>
    </section>
  {/if}
</main>

<style lang="scss">
  .dashboard-page {
    color: var(--text-main);
    display: flex;
    width: 100%;
    min-height: 100%;
    padding-bottom: 96px;
  }

  .personal-empty {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 60vh;
  }

  .personal-empty-card {
    width: min(680px, calc(100% - 32px));
    padding: clamp(1.5rem, 3vw, 2.4rem);
    text-align: center;
  }

  .personal-empty-card h2 {
    margin: 0 0 0.75rem;
    font-size: clamp(1.8rem, 4vw, 2.5rem);
  }

  .personal-empty-card p {
    margin: 0;
    color: var(--text-subtle);
    line-height: 1.6;
  }

  .personal-empty-note {
    margin-top: 1rem !important;
    color: var(--warning-text, #a65c00);
  }

  .personal-empty-actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: center;
  }

  .families-zone {
    --family-card-basis: clamp(240px, 58vw, 380px);
    --family-card-overlap: clamp(20px, 6vw, 48px);
    width: min(var(--page-content-max), 100%);
    margin-inline: auto;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  :global(.families-shell) {
    max-height: clamp(520px, 74dvh, 780px);
    overflow: hidden;
  }

  @media (min-width: 980px) {
    .families-zone {
      --family-card-basis: min(44vw, 420px);
    }
  }

</style>
