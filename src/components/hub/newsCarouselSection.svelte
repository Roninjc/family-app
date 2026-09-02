<script lang="ts">
  import SectionShell from '../ui/sectionShell.svelte'
  import CarouselFrame from '../carousel/carouselFrame.svelte'
  import CarouselCard from '../carousel/carouselCard.svelte'

  type NewsItem = {
    id: string
    title: string
    body: string
  }

  export let familyName = ''
  export let news: NewsItem[] = []
  export let selectedNewsId: string | null = null
  export let onOpenCenter: (
    initialNewsId: string | null,
    origin: HTMLElement | null
  ) => void = () => {}

  let activeIndex = 0

  const excerpt = (value: string, maxLength = 115) => {
    const clean = value.trim().replace(/\s+/g, ' ')
    if (clean.length <= maxLength) return clean
    return `${clean.slice(0, maxLength - 1)}…`
  }

  $: selectedNewsIndex = news.findIndex((item) => item.id === selectedNewsId)

  $: if (selectedNewsIndex >= 0) {
    activeIndex = selectedNewsIndex
  }

  const openGeneralList = (event: MouseEvent) => {
    onOpenCenter(null, event.currentTarget as HTMLElement)
  }

  const openFromCard = (event: MouseEvent, newsId: string) => {
    event.stopPropagation()
    onOpenCenter(newsId, event.currentTarget as HTMLElement)
  }

  const onShellKeydown = (event: KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onOpenCenter(null, event.currentTarget as HTMLElement)
  }

  const handleActiveIndexChange = (nextIndex: number) => {
    activeIndex = nextIndex
  }

  const newsIdFromItem = (item: unknown) => (item as NewsItem).id
  const newsTitleFromItem = (item: unknown) => (item as NewsItem).title
  const newsBodyFromItem = (item: unknown) => (item as NewsItem).body
</script>

<SectionShell title="Noticias" ariaLabel={`Noticias de ${familyName}`} className="news-section">
  <svelte:fragment slot="trailing">
    <button
      class="app-btn app-btn--ghost news-list-icon-btn"
      type="button"
      on:click={openGeneralList}
      aria-label="Ver lista de noticias"
      title="Ver lista"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path
          d="M4 6.75A1.25 1.25 0 0 1 5.25 5.5h13.5a1.25 1.25 0 1 1 0 2.5H5.25A1.25 1.25 0 0 1 4 6.75Zm0 5.25a1.25 1.25 0 0 1 1.25-1.25h13.5a1.25 1.25 0 1 1 0 2.5H5.25A1.25 1.25 0 0 1 4 12Zm0 5.25A1.25 1.25 0 0 1 5.25 16h13.5a1.25 1.25 0 1 1 0 2.5H5.25A1.25 1.25 0 0 1 4 17.25Z"
        />
      </svg>
    </button>
  </svelte:fragment>

  <div
    class="news-carousel-shell"
    role="button"
    tabindex="0"
    on:click={openGeneralList}
    on:keydown={onShellKeydown}
    aria-label="Abrir centro de noticias"
  >
    <CarouselFrame
      items={news}
      {activeIndex}
      getItemKey={newsIdFromItem}
      getDotAriaLabel={(_, index) => `Ir a noticia ${index + 1}`}
      onActiveIndexChange={(nextIndex) => {
        handleActiveIndexChange(nextIndex)
      }}
      cardBasis="clamp(150px, 50vw, 250px)"
      cardOverlap="clamp(20px, 6vw, 48px)"
      edgeFadeColor="var(--section-shell-bg)"
      shellClass="news-carousel-frame"
      trackClass="news-carousel"
      itemClass="news-carousel-item"
      ariaLabel="Previsualización de noticias"
      let:item
    >
      <svelte:fragment slot="empty">
        <CarouselCard as="div" className="news-empty">
          <h3>Sin noticias todavía</h3>
          <p>Cuando publiquéis la primera noticia aparecerá aquí para revisarla rápidamente.</p>
        </CarouselCard>
      </svelte:fragment>

      <CarouselCard
        as="button"
        className="news-card"
        onClick={(event) => openFromCard(event, newsIdFromItem(item))}
        ariaLabel={`Abrir noticia ${newsTitleFromItem(item)}`}
      >
        <h3>{newsTitleFromItem(item)}</h3>
        <p>{excerpt(newsBodyFromItem(item))}</p>
      </CarouselCard>
    </CarouselFrame>
  </div>
</SectionShell>

<style lang="scss">
  :global(.news-section) {
    max-height: clamp(520px, 74dvh, 780px);
    overflow: hidden;
  }

  .news-carousel-shell {
    position: relative;
    isolation: isolate;
    border-radius: var(--radius-xl);
    overflow: hidden;
    min-height: 0;
  }

  .news-list-icon-btn {
    width: 38px;
    min-width: 38px;
    min-height: 38px;
    padding: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .news-list-icon-btn svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
    display: block;
  }

  .news-carousel-shell:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--brand) 84%, #fff 16%);
    outline-offset: 2px;
  }

  :global(.news-card) h3,
  :global(.news-empty) h3 {
    margin: 0;
    font-size: clamp(0.95rem, 0.87rem + 0.32vw, 1.1rem);
    line-height: var(--lh-tight);
  }

  :global(.news-card) p,
  :global(.news-empty) p {
    margin: 0;
    color: #6d5645;
    font-size: clamp(0.84rem, 0.8rem + 0.2vw, 0.94rem);
    line-height: 1.45;
  }
</style>
