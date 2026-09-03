<script lang="ts">
  import { fade, fly } from 'svelte/transition'
  import { tick } from 'svelte'
  import ModalShell from '../../../../components/ui/modalShell.svelte'
  import NewsCarouselSection from '../../../../components/hub/newsCarouselSection.svelte'
  import UpcomingFeatureCard from '../../../../components/hub/upcomingFeatureCard.svelte'
  import type { PageData } from './$types'

  type FamilyHubData = Pick<PageData, 'families' | 'activeFamilyId' | 'activeFamilyName'> & {
    noFamilyRouteState?: boolean
  }

  export let data: FamilyHubData

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
  <title>Hub familiar — Orikara</title>
</svelte:head>

<main class="family-hub-page page-shell">
  {#if !activeFamily}
    <section class="family-hub-empty app-card-soft" aria-label="Estado sin familia activa">
      <h2>No hay una familia activa</h2>
      <p>
        Para entrar al nivel familiar primero vuelve al hub personal y selecciona una familia desde
        el carrusel principal.
      </p>
      <a class="app-btn app-btn--primary" href="/hub">Ir al hub personal</a>
    </section>
  {:else}
    <section
      class="family-hub-main reveal-fade-up reveal-delay-1"
      aria-label="Secciones del hub familiar"
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
          <button class="app-btn app-btn--ghost" type="button" on:click={closeNewsCenter}>
            Cerrar
          </button>
        </div>
      {:else}
        <ul
          class="news-center-list"
          aria-label="Listado de noticias"
          transition:fade={{ duration: 160 }}
        >
          {#each newsItems as item (item.id)}
            <li>
              <button
                class="news-list-item app-card-soft-raised"
                type="button"
                on:click={() => {
                  openNewsDetail(item.id)
                }}
              >
                <span class="news-list-item-tag">Noticia</span>
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    {:else if selectedNews}
      <article
        class="news-detail app-card-soft-raised"
        aria-label={`Detalle de ${selectedNews.title}`}
        transition:fly={{ y: 16, duration: 180 }}
      >
        <p class="news-detail-tag">En foco</p>
        <h3>{selectedNews.title}</h3>
        <p>{selectedNews.body}</p>

        <div class="news-detail-actions">
          <button
            class="app-btn app-btn--ghost"
            type="button"
            on:click={showPreviousNews}
            disabled={!hasPreviousNews}
          >
            Anterior
          </button>
          <button
            class="app-btn app-btn--ghost"
            type="button"
            on:click={showNextNews}
            disabled={!hasNextNews}
          >
            Siguiente
          </button>
        </div>
      </article>
    {:else}
      <div class="news-center-empty app-card-soft-raised" transition:fade={{ duration: 140 }}>
        <h3>No se pudo abrir esa noticia</h3>
        <p>Vuelve a la lista para elegir otra noticia disponible.</p>
        <button class="app-btn app-btn--ghost" type="button" on:click={openNewsList}>
          Volver a lista
        </button>
      </div>
    {/if}
  </section>
</ModalShell>

<style lang="scss">
  .family-hub-page {
    color: var(--text-main);
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-height: 100vh;
    padding-bottom: max(118px, env(safe-area-inset-bottom));
  }

  .family-hub-empty {
    width: min(var(--page-content-max), 100%);
    margin-inline: auto;
    padding: 22px;
    border-radius: var(--radius-xl);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .family-hub-empty h2,
  .family-hub-empty p {
    margin: 0;
  }

  .family-hub-main {
    width: min(var(--page-content-max), 100%);
    margin-inline: auto;
  }

  .family-hub-main {
    display: grid;
    gap: 20px;
  }

  .future-grid {
    display: grid;
    gap: 14px;
  }

  .news-center {
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-height: min(72vh, 820px);
  }

  .news-center-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .news-center-kicker {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #8d6645;
    font-size: var(--fs-2xs);
  }

  .news-center-header h2 {
    margin: 0;
    font-size: clamp(1.06rem, 0.98rem + 0.4vw, 1.28rem);
  }

  .news-center-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px;
    border-radius: var(--radius-pill);
    background: color-mix(in srgb, var(--neu-surface-soft) 86%, #ffffff 14%);
    box-shadow:
      inset 1px 1px 3px rgba(255, 255, 255, 0.64),
      inset -1px -1px 3px rgba(149, 121, 95, 0.11);
  }

  .mode-toggle {
    border: none;
    border-radius: var(--radius-pill);
    padding: 5px 10px;
    background: transparent;
    color: #6d5543;
    font-size: var(--fs-xs);
    cursor: pointer;
    transition:
      background-color var(--dur-ui) var(--motion-standard),
      color var(--dur-ui) var(--motion-standard),
      box-shadow var(--dur-ui) var(--motion-standard);
  }

  .mode-toggle[aria-pressed='true'] {
    color: #4b382c;
    background: rgba(255, 255, 255, 0.64);
    box-shadow:
      1px 1px 3px rgba(149, 121, 95, 0.15),
      -1px -1px 3px rgba(255, 255, 255, 0.72);
  }

  .news-center-message {
    margin: 0;
    border-radius: var(--radius-md);
    border: 1px solid rgba(193, 148, 95, 0.35);
    background: rgba(255, 251, 242, 0.88);
    color: #815939;
    padding: 8px 10px;
    font-size: var(--fs-xs);
  }

  .news-center-skeleton {
    display: grid;
    gap: 10px;
  }

  .skeleton-line {
    height: 13px;
    border-radius: 999px;
    background: linear-gradient(
      110deg,
      rgba(226, 212, 193, 0.44),
      rgba(244, 236, 226, 0.9),
      rgba(226, 212, 193, 0.44)
    );
    background-size: 180% 100%;
    animation: skeleton-shimmer 1.35s linear infinite;
  }

  .skeleton-line-lg {
    width: 92%;
    height: 18px;
  }

  .skeleton-line-sm {
    width: 58%;
  }

  .news-center-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 10px;
  }

  .news-list-item {
    width: 100%;
    border: none;
    border-radius: var(--radius-lg);
    padding: 12px;
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 6px;
    cursor: pointer;
    color: inherit;
  }

  .news-list-item-tag,
  .news-detail-tag {
    width: fit-content;
    border-radius: var(--radius-pill);
    padding: 3px 8px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-size: var(--fs-2xs);
    color: #7b5b3d;
    background: rgba(185, 146, 96, 0.2);
  }

  .news-list-item strong {
    font-size: var(--fs-sm);
  }

  .news-list-item span {
    color: var(--text-muted);
    font-size: var(--fs-xs);
    line-height: 1.42;
  }

  .news-detail {
    padding: 16px;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .news-detail h3,
  .news-detail p {
    margin: 0;
  }

  .news-detail h3 {
    color: #4d382d;
    font-size: clamp(1.1rem, 1rem + 0.42vw, 1.32rem);
  }

  .news-detail p {
    color: #6c5544;
    line-height: var(--lh-copy);
  }

  .news-detail-actions {
    margin-top: 8px;
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .news-center-empty {
    padding: 14px;
    border-radius: var(--radius-lg);
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .news-center-empty h3,
  .news-center-empty p {
    margin: 0;
  }

  @keyframes skeleton-shimmer {
    from {
      background-position: 100% 0;
    }

    to {
      background-position: -100% 0;
    }
  }

  @media (min-width: 940px) {
    .future-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .news-center {
      min-height: min(78vh, 840px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .skeleton-line {
      animation: none;
    }
  }
</style>
