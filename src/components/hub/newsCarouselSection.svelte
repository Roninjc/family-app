<script lang="ts">
  import { onMount } from 'svelte'

  type NewsItem = {
    id: string
    title: string
    body: string
  }

  export let familyName = ''
  export let news: NewsItem[] = []
  export let selectedNewsId: string | null = null
  export let onOpenCenter: (initialNewsId: string | null, origin: HTMLElement | null) => void =
    () => {}

  let carouselEl: HTMLUListElement | null = null
  let activeIndex = 0
  let lastScrollLeft = 0
  let scrollDirection: -1 | 0 | 1 = 0

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

  const centerOf = (element: Element) => {
    const rect = element.getBoundingClientRect()
    return rect.left + rect.width / 2
  }

  const updateFromScroll = () => {
    if (!carouselEl || news.length === 0) return
    updateActiveByCenter()
  }

  const updateActiveByCenter = () => {
    if (!carouselEl || news.length === 0) {
      activeIndex = 0
      return
    }

    const cards = Array.from(carouselEl.querySelectorAll<HTMLLIElement>('li'))
    const carouselCenter = centerOf(carouselEl)
    let closestIndex = 0
    let minDistance = Number.POSITIVE_INFINITY
    const distanceByIndex: number[] = []
    const offsetByIndex: number[] = []

    cards.forEach((card, index) => {
      const cardCenter = centerOf(card)
      const distance = Math.abs(cardCenter - carouselCenter)
      distanceByIndex[index] = distance
      const cardWidth = card.getBoundingClientRect().width || 1
      const offset = (cardCenter - carouselCenter) / cardWidth
      offsetByIndex[index] = offset
      const absOffset = Math.min(Math.abs(offset), 1.2)
      const focus = Math.max(0, 1 - absOffset)

      card.style.setProperty('--card-offset', `${offset}`)
      card.style.setProperty('--card-focus', `${focus}`)

      if (distance < minDistance) {
        minDistance = distance
        closestIndex = index
      }
    })

    // Keep stacking deterministic while scrolling: no ties means no DOM-order flicker.
    const stackOrder = cards
      .map((_, index) => index)
      .sort((a, b) => {
        const distanceDelta = distanceByIndex[a] - distanceByIndex[b]

        // For near-ties, gently favor the incoming side of the current scroll direction.
        if (Math.abs(distanceDelta) < 1.1 && scrollDirection !== 0) {
          const incomingA = scrollDirection > 0 ? offsetByIndex[a] > 0 : offsetByIndex[a] < 0
          const incomingB = scrollDirection > 0 ? offsetByIndex[b] > 0 : offsetByIndex[b] < 0

          if (incomingA !== incomingB) return incomingA ? -1 : 1
        }

        if (distanceDelta !== 0) return distanceDelta
        return a - b
      })

    stackOrder.forEach((index, rank) => {
      const card = cards[index]
      card.style.zIndex = String(100 - rank)
    })

    activeIndex = closestIndex
  }

  const handleCarouselScroll = () => {
    if (carouselEl) {
      const nextScrollLeft = carouselEl.scrollLeft
      const delta = nextScrollLeft - lastScrollLeft

      if (Math.abs(delta) > 0.2) {
        scrollDirection = delta > 0 ? 1 : -1
      }

      lastScrollLeft = nextScrollLeft
    }

    updateActiveByCenter()
  }

  const focusNewsAt = (index: number) => {
    if (!carouselEl) return
    const items = Array.from(carouselEl.querySelectorAll<HTMLLIElement>('li'))
    const item = items[index]
    if (!item || typeof item.scrollIntoView !== 'function') return

    item.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    activeIndex = index
  }

  const handleDotKeydown = (event: KeyboardEvent, index: number) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      const nextIndex = (index + 1) % news.length
      focusNewsAt(nextIndex)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const prevIndex = (index - 1 + news.length) % news.length
      focusNewsAt(prevIndex)
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      focusNewsAt(0)
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      focusNewsAt(news.length - 1)
    }
  }

  onMount(() => {
    if (carouselEl) {
      lastScrollLeft = carouselEl.scrollLeft
    }

    updateFromScroll()
    updateActiveByCenter()
  })
</script>

<section class="news-section" aria-label={`Noticias de ${familyName}`}>
  <header class="news-header">
    <span class="news-header-spacer" aria-hidden="true"></span>
    <h2>Noticias</h2>
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
  </header>

  <div
    class="news-carousel-shell"
    role="button"
    tabindex="0"
    on:click={openGeneralList}
    on:keydown={onShellKeydown}
    aria-label="Abrir centro de noticias"
  >
    <ul
      class="news-carousel"
      bind:this={carouselEl}
      on:scroll={handleCarouselScroll}
      aria-label="Previsualización de noticias"
    >
      {#if news.length === 0}
        <li class="news-empty">
          <h3>Sin noticias todavía</h3>
          <p>Cuando publiquéis la primera noticia aparecerá aquí para revisarla rápidamente.</p>
        </li>
      {:else}
        {#each news as item, index (item.id)}
          <li
            class:is-active={index === activeIndex}
            class:is-near={Math.abs(index - activeIndex) === 1}
            class:is-far={Math.abs(index - activeIndex) >= 2}
          >
            <button
              class="news-card"
              type="button"
              on:click={(event) => openFromCard(event, item.id)}
              aria-label={`Abrir noticia ${item.title}`}
            >
              <h3>{item.title}</h3>
              <p>{excerpt(item.body)}</p>
            </button>
          </li>
        {/each}
      {/if}
    </ul>

    <div class="edge-fade edge-fade--left" aria-hidden="true"></div>
    <div class="edge-fade edge-fade--right" aria-hidden="true"></div>
  </div>

  {#if news.length > 1}
    <div class="carousel-dots" role="tablist" aria-label="Navegación del carrusel de noticias">
      <div class="dots-track">
        {#each news as item, index (item.id)}
          <button
            class="dot"
            class:active={index === activeIndex}
            type="button"
            role="tab"
            aria-selected={index === activeIndex}
            tabindex={index === activeIndex ? 0 : -1}
            aria-label={`Ir a noticia ${index + 1}`}
            on:click={() => {
              focusNewsAt(index)
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

<style lang="scss">
  .news-section {
    --news-section-bg: var(--app-bg-deep, #f1ece4);
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: var(--space-3);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
    box-shadow: var(--neu-shadow-inset);
    max-height: clamp(520px, 74dvh, 780px);
    overflow: hidden;
    background: var(--news-section-bg);
  }

  .news-header {
    --header-action-size: 38px;
    --header-side-width: var(--header-action-size);
    display: grid;
    grid-template-columns: var(--header-side-width) 1fr var(--header-side-width);
    column-gap: var(--space-2);
    align-items: center;
  }

  .news-header-spacer {
    width: var(--header-action-size);
    height: var(--header-action-size);
    justify-self: start;
    visibility: hidden;
  }

  .news-header h2 {
    margin: 0;
    color: #4d382d;
    font-size: clamp(1.1rem, 1rem + 0.4vw, 1.35rem);
    text-align: center;
    justify-self: center;
  }

  .news-carousel-shell {
    position: relative;
    isolation: isolate;
    border-radius: var(--radius-xl);
    overflow: hidden;
    min-height: 0;
  }

  .edge-fade {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50px;
    pointer-events: none;
    z-index: 50;
  }

  .edge-fade--left {
    left: 0;
    background: linear-gradient(
      to right,
      var(--news-section-bg) 0%,
      color-mix(in srgb, var(--news-section-bg) 80%, transparent) 38%,
      transparent 100%
    );
  }

  .edge-fade--right {
    right: 0;
    background: linear-gradient(
      to left,
      var(--news-section-bg) 0%,
      color-mix(in srgb, var(--news-section-bg) 80%, transparent) 38%,
      transparent 100%
    );
  }

  .news-list-icon-btn {
    width: var(--header-action-size);
    min-width: var(--header-action-size);
    min-height: var(--header-action-size);
    padding: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    justify-self: end;
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

  .news-carousel {
    --card-basis: clamp(150px, 50vw, 250px);
    --card-overlap: clamp(20px, 6vw, 48px);
    position: relative;
    z-index: 1;
    list-style: none;
    margin: 0;
    padding: 24px 0 28px;
    display: flex;
    align-items: center;
    gap: 0;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .news-carousel::-webkit-scrollbar {
    display: none;
  }

  .news-carousel::before,
  .news-carousel::after {
    content: '';
    flex: 0 0 calc((100% - var(--card-basis)) / 2);
  }

  .news-carousel li {
    --card-offset: 0;
    --card-focus: 0;
    flex: 0 0 var(--card-basis);
    display: flex;
    align-items: center;
    min-width: 0;
    margin-left: calc(-1 * var(--card-overlap));
    scroll-snap-align: center;
    transition:
      transform var(--dur-ui) var(--motion-standard),
      z-index 140ms linear;
    transform: translate(
        calc(var(--card-offset) * -14px),
        calc((1 - var(--card-focus)) * 9px)
      )
      scale(calc(0.9 + var(--card-focus) * 0.2));
  }

  .news-carousel li:first-child {
    margin-left: 0;
  }

  .news-card,
  .news-empty {
    position: relative;
    overflow: hidden;
    width: 100%;
    text-align: left;
    border-radius: var(--radius-lg);
    padding: 14px;
    aspect-ratio: 1 / 1;
    min-height: 0;
    max-height: none;
    border: none;
    background: rgba(255, 253, 249, 0.2);
    backdrop-filter: blur(var(--app-glass-panel-blur, 14px))
      saturate(var(--app-glass-panel-saturate, 135%));
    -webkit-backdrop-filter: blur(var(--app-glass-panel-blur, 14px))
      saturate(var(--app-glass-panel-saturate, 135%));
    isolation: isolate;
    box-shadow:
      7px 8px 14px rgba(134, 104, 78, 0.2),
      -4px -3px 10px rgba(255, 255, 255, 0.58),
      inset 0 0 0 1px rgba(255, 255, 255, 0.34);
  }

  .news-card::before,
  .news-empty::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: linear-gradient(
      160deg,
      rgba(255, 255, 255, 0.28),
      rgba(255, 255, 255, 0.02) 58%,
      rgba(207, 177, 145, 0.14)
    );
    pointer-events: none;
  }

  .news-card > *,
  .news-empty > * {
    position: relative;
    z-index: 1;
  }

  .news-card {
    appearance: none;
    color: inherit;
    opacity: calc(0.84 + var(--card-focus, 1) * 0.16);
    transition:
      opacity var(--dur-ui) var(--motion-standard),
      transform var(--dur-ui) var(--motion-standard);
  }

  .news-card h3,
  .news-empty h3 {
    margin: 2px 0 6px;
    font-size: clamp(0.95rem, 0.87rem + 0.32vw, 1.1rem);
    line-height: var(--lh-tight);
  }

  .news-card p,
  .news-empty p {
    margin: 0;
    color: #6d5645;
    font-size: clamp(0.84rem, 0.8rem + 0.2vw, 0.94rem);
    line-height: 1.45;
  }

  .news-card {
    cursor: pointer;
  }

  .carousel-dots {
    --dots-ease: cubic-bezier(0.22, 0.61, 0.36, 1);
    --dots-dur: 520ms;
    display: flex;
    justify-content: center;
    padding-top: 2px;
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
    cursor: pointer;
    opacity: 0.5;
    transition:
      width var(--dots-dur) var(--dots-ease),
      background-color var(--dots-dur) var(--dots-ease),
      transform var(--dots-dur) var(--dots-ease),
      opacity var(--dots-dur) var(--dots-ease),
      box-shadow var(--dots-dur) var(--dots-ease);
  }

  .dot.active {
    width: 12px;
    background: rgba(165, 120, 82, 0.72);
    box-shadow: 0 0 0 1px rgba(165, 120, 82, 0.14);
    transform: scaleX(1);
    opacity: 0.95;
  }

  .dot:not(.active) {
    opacity: 0.48;
  }

  .dot:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--brand) 84%, #fff 16%);
    outline-offset: 3px;
  }

  .news-card:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--brand) 84%, #fff 16%);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    .news-carousel li,
    .dot {
      transition: none;
    }
  }
</style>
