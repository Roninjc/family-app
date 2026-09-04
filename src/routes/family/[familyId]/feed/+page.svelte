<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { tick } from 'svelte'
  import ModalShell from '../../../../components/ui/modalShell.svelte'
  import NewsCarouselSection from '../../../../components/feed/newsCarouselSection.svelte'
  import UpcomingFeatureCard from '../../../../components/feed/upcomingFeatureCard.svelte'
  import type { PageData } from './$types'

  type FamilyFeedData = Pick<PageData, 'families' | 'activeFamilyId' | 'activeFamilyName'> & {
    noFamilyRouteState?: boolean
  }

  export let data: FamilyFeedData

  let newsItems: Array<{ id: string; title: string; body: string }> = []

  let showNewsCenter = false
  let newsCenterMode: 'list' | 'detail' = 'list'
  let selectedNewsId: string | null = null
  let centerMessage = ''
  let isNewsCenterLoading = false
  let focusReturnTarget: HTMLElement | null = null

  $: activeFamily =
    data.families.find((family) => family.id === data.activeFamilyId) ?? data.families[0] ?? null

  $: newsItems =
    activeFamily?.notes
      .filter((note) => note.noteType === 'news')
      .map((note) => ({
        id: note.id,
        title: note.title,
        body: note.body
      })) ?? []

  $: selectedNews = newsItems.find((item) => item.id === selectedNewsId) ?? null

  const finishLoadingSoon = async () => {
    await tick()
    queueMicrotask(() => {
      isNewsCenterLoading = false
    })
  }

  const openNewsCenter = (initialNewsId: string | null, origin: HTMLElement | null) => {
    focusReturnTarget = origin
    showNewsCenter = true
    isNewsCenterLoading = true
    centerMessage = ''

    if (initialNewsId) {
      const exists = newsItems.some((item) => item.id === initialNewsId)
      if (exists) {
        selectedNewsId = initialNewsId
        newsCenterMode = 'detail'
      } else {
        selectedNewsId = null
        newsCenterMode = 'list'
        centerMessage = 'La noticia que intentaste abrir ya no está disponible.'
      }
    } else {
      selectedNewsId = null
      newsCenterMode = 'list'
    }

    void finishLoadingSoon()
  }

  const closeNewsCenter = () => {
    showNewsCenter = false
    centerMessage = ''

    if (focusReturnTarget && typeof focusReturnTarget.focus === 'function') {
      focusReturnTarget.focus()
    }

    focusReturnTarget = null
  }

  const openNewsDetail = (newsId: string) => {
    selectedNewsId = newsId
    newsCenterMode = 'detail'
    centerMessage = ''
  }

  const openNewsList = () => {
    newsCenterMode = 'list'
  }

  const currentNewsIndex = () => (newsItems ?? []).findIndex((item) => item.id === selectedNewsId)

  const showPreviousNews = () => {
    const index = currentNewsIndex()
    if (index <= 0) return
    selectedNewsId = newsItems[index - 1]?.id ?? selectedNewsId
  }

  const showNextNews = () => {
    const index = currentNewsIndex()
    if (index < 0 || index >= newsItems.length - 1) return
    selectedNewsId = newsItems[index + 1]?.id ?? selectedNewsId
  }

  $: selectedNewsPosition = currentNewsIndex()
  $: hasPreviousNews = selectedNewsPosition > 0
  $: hasNextNews = selectedNewsPosition >= 0 && selectedNewsPosition < newsItems.length - 1
</script>

<svelte:head>
  <title>Novedades familiares — Orikara</title>
</svelte:head>

<main class="family-feed-page page-shell">
  {#if !activeFamily}
    <section class="family-feed-empty app-card-soft" aria-label="Estado sin familia activa">
      <h2>No hay una familia activa</h2>
      <p>
        Para entrar a las novedades familiares primero vuelve al panel personal y selecciona una
        familia desde el carrusel principal.
      </p>
      <a class="app-btn app-btn--primary" href="/dashboard">Ir al panel personal</a>
    </section>
  {:else}
    <section
      class="family-feed-main reveal-fade-up reveal-delay-1"
      aria-label="Secciones de novedades familiares"
    >
      <NewsCarouselSection
        familyName={activeFamily.name}
        news={newsItems}
        {selectedNewsId}
        onOpenCenter={openNewsCenter}
      />

      <div class="future-grid" aria-label="Próximas secciones">
        <UpcomingFeatureCard
          title="Eventos"
          subtitle="Planifica reuniones, comidas y celebraciones familiares en un calendario compartido."
          ctaLabel="Próximamente"
          highlights={[
            'Vista mensual con hitos importantes',
            'Confirmación rápida de asistencia',
            'Recordatorios antes de cada evento'
          ]}
        />

        <UpcomingFeatureCard
          title="Votaciones"
          subtitle="Decidid juntos fechas, planes o gastos con votaciones rápidas y transparentes."
          ctaLabel="Próximamente"
          highlights={[
            'Votaciones simples por opciones',
            'Cierre automático por fecha',
            'Resumen de resultados en tiempo real'
          ]}
        />
      </div>
    </section>
  {/if}
</main>

<ModalShell
  open={showNewsCenter}
  onClose={closeNewsCenter}
  ariaLabel="Cerrar centro de noticias"
  size="wide"
>
  <section class="news-center" aria-label="Centro de noticias">
    <header class="news-center-header">
      <div>
        <p class="news-center-kicker">Centro de noticias</p>
        <h2>{activeFamily?.name ?? 'Familia'}</h2>
      </div>

      <div class="news-center-actions">
        <button
          class="mode-toggle"
          type="button"
          aria-label="Ver lista de noticias"
          aria-pressed={newsCenterMode === 'list'}
          on:click={openNewsList}
        >
          Lista
        </button>
        <button
          class="mode-toggle"
          type="button"
          aria-pressed={newsCenterMode === 'detail'}
          on:click={() => {
            if (selectedNews) {
              newsCenterMode = 'detail'
              return
            }

            const firstNews = newsItems[0]
            if (!firstNews) return
            openNewsDetail(firstNews.id)
          }}
        >
          Detalle
        </button>
      </div>
    </header>

    {#if centerMessage}
      <p class="news-center-message" role="status">{centerMessage}</p>
    {/if}

    {#if isNewsCenterLoading}
      <div class="news-center-skeleton" aria-hidden="true">
        <div class="skeleton-line skeleton-line-lg"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line skeleton-line-sm"></div>
      </div>
    {:else if newsCenterMode === 'list'}
      {#if newsItems.length === 0}
        <div class="news-center-empty app-card-soft-raised" transition:fade={{ duration: 140 }}>
          <h3>Aún no hay noticias publicadas</h3>
          <p>Cuando publiquéis noticias nuevas aparecerán aquí para abrirlas en detalle.</p>
          <button class="app-btn app-btn--ghost" type="button" on:click={closeNewsCenter}>Cerrar</button>
        </div>
      {:else}
        <div class="news-list news-center-list" transition:fade={{ duration: 140 }}>
          {#each newsItems as item (item.id)}
            <button class="news-card" type="button" on:click={() => openNewsDetail(item.id)}>
              <span class="news-card__eyebrow">Noticia</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </button>
          {/each}
        </div>
      {/if}
    {:else if selectedNews}
      <article class="news-detail" transition:fly={{ x: 12, duration: 180 }}>
        <div class="news-detail-header">
          <div>
            <p class="news-detail-kicker">Noticia</p>
            <h3>{selectedNews.title}</h3>
          </div>
          <button class="app-btn app-btn--ghost" type="button" on:click={openNewsList}>Volver</button>
        </div>

        <div class="news-detail-body">
          <p>{selectedNews.body}</p>
        </div>

        <div class="news-detail-nav">
          <button type="button" class="app-btn app-btn--ghost" on:click={showPreviousNews} disabled={!hasPreviousNews}>
            Anterior
          </button>
          <button type="button" class="app-btn app-btn--primary" on:click={showNextNews} disabled={!hasNextNews}>
            Siguiente
          </button>
        </div>
      </article>
    {/if}
  </section>
</ModalShell>

<style lang="scss">
  .family-feed-page {
    width: 100%;
  }

  .family-feed-empty {
    display: grid;
    place-items: center;
    min-height: 60vh;
    padding: 2rem;
    text-align: center;
  }

  .family-feed-main {
    display: grid;
    gap: 1.5rem;
  }

  .news-center {
    display: grid;
    gap: 1.25rem;
  }

  .news-center-header,
  .news-detail-header,
  .news-detail-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  .news-center-kicker,
  .news-detail-kicker {
    margin: 0 0 0.35rem;
    font-size: 0.75rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--text-subtle);
  }

  .mode-toggle {
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(255, 255, 255, 0.04);
    border-radius: 999px;
    padding: 0.5rem 0.9rem;
    color: var(--text-main);
  }

  .news-list {
    display: grid;
    gap: 0.9rem;
  }

  .news-card {
    width: 100%;
    text-align: left;
    padding: 1rem;
    border-radius: 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    color: var(--text-main);
  }

  .news-card__eyebrow {
    display: inline-block;
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-subtle);
  }

  .news-detail-body {
    color: var(--text-main);
    line-height: 1.7;
  }

  .news-center-empty {
    padding: 1.5rem;
    text-align: center;
  }

  .news-center-skeleton {
    display: grid;
    gap: 0.75rem;
  }

  .skeleton-line {
    height: 14px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
  }

  .skeleton-line-lg {
    width: 70%;
    height: 18px;
  }

  .skeleton-line-sm {
    width: 45%;
  }
</style>
