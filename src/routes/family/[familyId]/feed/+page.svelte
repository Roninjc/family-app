<script lang="ts">
  import { fade } from 'svelte/transition'
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

  type NewsItem = { id: string; title: string; body: string }

  // Displayed copy of the current news item, swapped mid-fade so title/body cross-fade on prev/next
  const NEWS_SWAP_FADE_OUT_MS = 110
  let displayedNews: NewsItem | null = null
  let newsContentVisible = true
  let newsSwapTimer: ReturnType<typeof setTimeout> | null = null

  // Displayed list/detail mode, swapped mid-fade so the modal never renders both views at once
  const CENTER_MODE_FADE_OUT_MS = 130
  let displayedCenterMode: 'list' | 'detail' = 'list'
  let centerModeVisible = true
  let centerModeSwapTimer: ReturnType<typeof setTimeout> | null = null

  const setDisplayedNews = (item: NewsItem | null, animate: boolean) => {
    if (newsSwapTimer) {
      clearTimeout(newsSwapTimer)
      newsSwapTimer = null
    }

    const sameItem = displayedNews && item && displayedNews.id === item.id
    if (!animate || sameItem || !displayedNews || !item) {
      displayedNews = item
      newsContentVisible = true
      return
    }

    newsContentVisible = false
    newsSwapTimer = setTimeout(() => {
      displayedNews = item
      newsContentVisible = true
      newsSwapTimer = null
    }, NEWS_SWAP_FADE_OUT_MS)
  }

  const setCenterMode = (mode: 'list' | 'detail', animate: boolean) => {
    newsCenterMode = mode

    if (centerModeSwapTimer) {
      clearTimeout(centerModeSwapTimer)
      centerModeSwapTimer = null
    }

    if (!animate || displayedCenterMode === mode) {
      displayedCenterMode = mode
      centerModeVisible = true
      return
    }

    centerModeVisible = false
    centerModeSwapTimer = setTimeout(() => {
      displayedCenterMode = mode
      centerModeVisible = true
      centerModeSwapTimer = null
    }, CENTER_MODE_FADE_OUT_MS)
  }

  // Morphs the modal's content box height smoothly across loading/list/detail states
  let newsViewportHeight: number | null = null

  function measureNewsViewport(node: HTMLDivElement) {
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver((entries) => {
            const entry = entries[0]
            if (!entry) return
            newsViewportHeight = entry.contentRect.height
          })
        : null
    observer?.observe(node)
    newsViewportHeight = node.getBoundingClientRect().height

    return {
      destroy() {
        observer?.disconnect()
      }
    }
  }

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
      const item = newsItems.find((entry) => entry.id === initialNewsId) ?? null
      if (item) {
        selectedNewsId = item.id
        setCenterMode('detail', false)
        setDisplayedNews(item, false)
      } else {
        selectedNewsId = null
        setCenterMode('list', false)
        setDisplayedNews(null, false)
        centerMessage = 'La noticia que intentaste abrir ya no está disponible.'
      }
    } else {
      selectedNewsId = null
      setCenterMode('list', false)
      setDisplayedNews(null, false)
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
    const item = newsItems.find((entry) => entry.id === newsId) ?? null
    selectedNewsId = newsId
    centerMessage = ''
    setCenterMode('detail', true)
    setDisplayedNews(item, false)
  }

  const openNewsList = () => {
    setCenterMode('list', true)
    setDisplayedNews(null, false)
  }

  const currentNewsIndex = () => (newsItems ?? []).findIndex((item) => item.id === selectedNewsId)

  const showPreviousNews = () => {
    const index = currentNewsIndex()
    if (index <= 0) return
    const item = newsItems[index - 1] ?? null
    if (!item) return
    selectedNewsId = item.id
    setDisplayedNews(item, true)
  }

  const showNextNews = () => {
    const index = currentNewsIndex()
    if (index < 0 || index >= newsItems.length - 1) return
    const item = newsItems[index + 1] ?? null
    if (!item) return
    selectedNewsId = item.id
    setDisplayedNews(item, true)
  }

  $: selectedNewsPosition = newsItems.findIndex((item) => item.id === selectedNewsId)
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
  <svelte:fragment slot="chrome-left">
    {#if newsCenterMode === 'detail'}
      <button
        type="button"
        class="news-back-icon"
        aria-label="Volver a la lista de noticias"
        title="Volver"
        on:click={openNewsList}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m15.4 4.6 1.4 1.4L10.21 12l6.59 6-1.4 1.4L7.2 12l8.2-7.4z" />
        </svg>
      </button>
    {/if}
  </svelte:fragment>

  <section class="news-center" aria-label="Novedades">
    <header class="news-center-header">
      <h2>Novedades</h2>
    </header>

    {#if centerMessage}
      <p class="news-center-message" role="status">{centerMessage}</p>
    {/if}

    <div
      class="news-viewport"
      style={newsViewportHeight !== null ? `height:${newsViewportHeight}px` : undefined}
    >
      <div class="news-viewport-inner" use:measureNewsViewport>
        {#if isNewsCenterLoading}
          <div class="news-center-skeleton" aria-hidden="true">
            <div class="skeleton-line skeleton-line-lg"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line skeleton-line-sm"></div>
          </div>
        {:else}
          <div class="news-mode-frame" class:news-mode-frame--hidden={!centerModeVisible}>
            {#if displayedCenterMode === 'list'}
              {#if newsItems.length === 0}
                <div
                  class="news-center-empty app-card-soft-raised"
                  transition:fade={{ duration: 140 }}
                >
                  <h3>Aún no hay noticias publicadas</h3>
                  <p>Cuando publiquéis noticias nuevas aparecerán aquí para abrirlas en detalle.</p>
                  <button class="app-btn app-btn--ghost" type="button" on:click={closeNewsCenter}
                    >Cerrar</button
                  >
                </div>
              {:else}
                <div class="news-list news-center-list" transition:fade={{ duration: 140 }}>
                  {#each newsItems as item (item.id)}
                    <button
                      class="news-card"
                      type="button"
                      on:click={() => openNewsDetail(item.id)}
                    >
                      <div class="news-card__content">
                        <h3 class="news-card__title">{item.title}</h3>
                        <p class="news-card__excerpt">{item.body}</p>
                      </div>
                      <svg
                        class="news-card__chevron"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        focusable="false"
                      >
                        <path d="m8.6 19.4-1.4-1.4L13.79 12 7.2 6l1.4-1.4L16.8 12l-8.2 7.4z" />
                      </svg>
                    </button>
                  {/each}
                </div>
              {/if}
            {:else if displayedNews}
              <article class="news-detail">
                <div class="news-detail-copy" class:news-detail-copy--hidden={!newsContentVisible}>
                  <div class="news-detail-header">
                    <h3 class="news-detail-title">{displayedNews.title}</h3>
                  </div>

                  <div class="news-detail-body">
                    <p>{displayedNews.body}</p>
                  </div>
                </div>

                <div class="news-detail-nav">
                  <button
                    type="button"
                    class="news-nav-icon"
                    aria-label="Noticia anterior"
                    title="Anterior"
                    on:click={showPreviousNews}
                    disabled={!hasPreviousNews}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="m15.4 4.6 1.4 1.4L10.21 12l6.59 6-1.4 1.4L7.2 12l8.2-7.4z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="news-nav-icon"
                    aria-label="Siguiente noticia"
                    title="Siguiente"
                    on:click={showNextNews}
                    disabled={!hasNextNews}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="m8.6 19.4-1.4-1.4L13.79 12 7.2 6l1.4-1.4L16.8 12l-8.2 7.4z" />
                    </svg>
                  </button>
                </div>
              </article>
            {/if}
          </div>
        {/if}
      </div>
    </div>
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
    gap: 1.75rem;
  }

  .news-center-header {
    text-align: center;
  }

  .news-center-header h2 {
    margin: 0;
  }

  .news-viewport {
    overflow: hidden;
    transition: height var(--dur-slow) var(--motion-standard);
  }

  .news-viewport-inner {
    display: grid;
  }

  .news-mode-frame {
    opacity: 1;
    transition: opacity 130ms var(--motion-standard);
  }

  .news-mode-frame--hidden {
    opacity: 0;
  }

  .news-detail {
    display: grid;
    gap: 1rem;
    padding: 1.1rem 1.2rem;
    border-radius: var(--radius-card);
    background: var(--app-glass-menu-bg);
    backdrop-filter: blur(var(--app-glass-menu-blur)) saturate(var(--app-glass-menu-saturate));
    -webkit-backdrop-filter: blur(var(--app-glass-menu-blur))
      saturate(var(--app-glass-menu-saturate));
  }

  .news-detail-copy {
    display: grid;
    gap: 1rem;
    opacity: 1;
    transition: opacity 110ms var(--motion-standard);
  }

  .news-detail-copy--hidden {
    opacity: 0;
  }

  .news-detail-header {
    text-align: center;
  }

  .news-detail-nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin-top: 0.25rem;
  }

  .news-detail-title {
    margin: 0;
    font-size: 1.35rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .news-back-icon {
    width: 34px;
    min-width: 34px;
    height: 34px;
    min-height: 34px;
    padding: 0;
    border: none;
    border-radius: var(--radius-control);
    background: var(--app-glass-panel-bg-soft);
    color: var(--text-main);
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: var(--app-glass-panel-shadow-soft);
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
      box-shadow: var(--app-glass-panel-shadow);
    }
  }

  .news-nav-icon {
    width: 34px;
    min-width: 34px;
    height: 34px;
    min-height: 34px;
    padding: 0;
    border: none;
    border-radius: var(--radius-control);
    background: var(--app-glass-panel-bg-soft);
    color: var(--text-main);
    display: grid;
    place-items: center;
    cursor: pointer;
    box-shadow: var(--neu-shadow-inset);
    transition:
      background-color var(--dur-base) var(--motion-standard),
      box-shadow var(--dur-base) var(--motion-standard),
      color var(--dur-base) var(--motion-standard);

    svg {
      width: 16px;
      height: 16px;
      fill: currentColor;
    }

    &:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      box-shadow: none;
    }
  }

  .news-list {
    display: grid;
    gap: 2px;
    padding: 8px;
    border-radius: var(--radius-card);
    background: var(--app-glass-menu-bg);
    backdrop-filter: blur(var(--app-glass-menu-blur)) saturate(var(--app-glass-menu-saturate));
    -webkit-backdrop-filter: blur(var(--app-glass-menu-blur))
      saturate(var(--app-glass-menu-saturate));
  }

  .news-card {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: 100%;
    text-align: left;
    padding: 0.75rem 0.85rem;
    border-radius: var(--radius-control);
    background: transparent;
    border: none;
    color: var(--text-main);
    transition:
      background-color 0.18s var(--motion-standard),
      box-shadow 0.18s var(--motion-standard),
      color 0.18s var(--motion-standard);

    &:not(:first-child) {
      border-top: 1px solid var(--header-dropdown-divider, rgba(154, 132, 109, 0.16));
      border-radius: 0;
    }

    &:hover {
      background: var(--app-glass-menu-item-hover-bg);
      color: var(--app-glass-menu-item-hover-text);
      box-shadow: var(--app-glass-menu-item-hover-shadow);
    }

    &:active {
      background: var(--app-glass-menu-item-active-bg);
      box-shadow: var(--app-glass-menu-item-active-shadow);
    }

    &:hover .news-card__chevron {
      fill: currentColor;
    }
  }

  .news-card__content {
    min-width: 0;
    flex: 1;
    display: grid;
    gap: 0.25rem;
  }

  .news-card__title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .news-card__excerpt {
    margin: 0;
    font-size: 0.85rem;
    color: var(--text-subtle);
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .news-card__chevron {
    flex-shrink: 0;
    width: 18px;
    height: 18px;
    fill: var(--text-subtle);
  }

  .news-detail-body {
    color: var(--text-main);
    line-height: 1.7;
    padding-top: 1rem;
    border-top: 1px solid var(--header-dropdown-divider, rgba(154, 132, 109, 0.16));
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
