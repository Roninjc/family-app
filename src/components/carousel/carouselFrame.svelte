<script lang="ts">
  import { onMount } from 'svelte'

  type CarouselChangeReason = 'mount' | 'scroll' | 'dot' | 'keyboard'
  type CarouselScrollBehavior = 'auto' | 'smooth'

  export let items: unknown[] = []
  export let activeIndex: number | null = null
  export let initialActiveIndex = 0
  export let ariaLabel = 'Carrusel'
  export let dotsAriaLabel = 'Indicador del carrusel'
  export let getItemKey: (item: unknown, index: number) => string = (_, index) => String(index)
  export let getDotAriaLabel: (item: unknown, index: number) => string = (_, index) =>
    `Ir al elemento ${index + 1}`
  export let cardBasis = 'clamp(220px, 68vw, 360px)'
  export let cardOverlap = 'clamp(20px, 6vw, 48px)'
  export let edgeFadeColor = 'var(--app-bg-deep, #f1ece4)'
  export let showDots = true
  export let shellClass = ''
  export let trackClass = ''
  export let itemClass = ''
  export let onActiveIndexChange: (
    nextIndex: number,
    item: unknown,
    reason: CarouselChangeReason
  ) => void = () => {}

  let trackEl: HTMLUListElement | null = null
  let itemEls: HTMLLIElement[] = []
  let localActiveIndex = 0
  let resolvedActiveIndex = 0
  let lastSyncedActiveIndex: number | null = null
  let lastScrollLeft = 0
  let scrollDirection: -1 | 0 | 1 = 0

  const clampIndex = (index: number) => {
    if (items.length === 0) return 0
    return Math.max(0, Math.min(index, items.length - 1))
  }

  $: if (items.length === 0) {
    localActiveIndex = 0
  } else {
    localActiveIndex = clampIndex(localActiveIndex)
  }

  $: if (activeIndex !== null && activeIndex !== lastSyncedActiveIndex) {
    localActiveIndex = clampIndex(activeIndex)
    lastSyncedActiveIndex = activeIndex
  }

  $: resolvedActiveIndex = clampIndex(localActiveIndex)

  const centerOf = (element: Element) => {
    const rect = element.getBoundingClientRect()
    return rect.left + rect.width / 2
  }

  const setActiveIndex = (nextIndex: number, reason: CarouselChangeReason) => {
    if (items.length === 0) return

    const clamped = clampIndex(nextIndex)
    localActiveIndex = clamped
    onActiveIndexChange(clamped, items[clamped], reason)
  }

  const applyVisualStateFromCenter = (reason: CarouselChangeReason) => {
    if (!trackEl || items.length === 0) {
      localActiveIndex = 0
      return
    }

    const cards = itemEls.filter(Boolean)
    const carouselCenter = centerOf(trackEl)
    let closestIndex = 0
    let minDistance = Number.POSITIVE_INFINITY
    const distanceByIndex: number[] = []
    const offsetByIndex: number[] = []

    cards.forEach((card, index) => {
      const cardCenter = centerOf(card)
      const distance = Math.abs(cardCenter - carouselCenter)
      const cardWidth = card.getBoundingClientRect().width || 1
      const offset = (cardCenter - carouselCenter) / cardWidth
      const absOffset = Math.min(Math.abs(offset), 1.2)
      const focus = Math.max(0, 1 - absOffset)

      distanceByIndex[index] = distance
      offsetByIndex[index] = offset

      card.style.setProperty('--card-offset', `${offset}`)
      card.style.setProperty('--card-focus', `${focus}`)

      if (distance < minDistance) {
        minDistance = distance
        closestIndex = index
      }
    })

    const stackOrder = cards
      .map((_, index) => index)
      .sort((a, b) => {
        const distanceDelta = distanceByIndex[a] - distanceByIndex[b]

        if (Math.abs(distanceDelta) < 1.1 && scrollDirection !== 0) {
          const incomingA = scrollDirection > 0 ? offsetByIndex[a] > 0 : offsetByIndex[a] < 0
          const incomingB = scrollDirection > 0 ? offsetByIndex[b] > 0 : offsetByIndex[b] < 0

          if (incomingA !== incomingB) return incomingA ? -1 : 1
        }

        if (distanceDelta !== 0) return distanceDelta
        return a - b
      })

    stackOrder.forEach((index, rank) => {
      cards[index].style.zIndex = String(100 - rank)
    })

    if (closestIndex !== resolvedActiveIndex) {
      setActiveIndex(closestIndex, reason)
    }
  }

  const handleTrackScroll = () => {
    let hasDirectionalDelta = false

    if (trackEl) {
      const nextScrollLeft = trackEl.scrollLeft
      const delta = nextScrollLeft - lastScrollLeft

      if (Math.abs(delta) > 0.2) {
        scrollDirection = delta > 0 ? 1 : -1
        hasDirectionalDelta = true
      }

      lastScrollLeft = nextScrollLeft
    }

    if (!hasDirectionalDelta) return

    applyVisualStateFromCenter('scroll')
  }

  const focusItemAt = (
    index: number,
    behavior: CarouselScrollBehavior,
    reason: CarouselChangeReason
  ) => {
    const item = itemEls[index]

    if (item && typeof item.scrollIntoView === 'function') {
      item.scrollIntoView({ behavior, inline: 'center', block: 'nearest' })
    }

    setActiveIndex(index, reason)
  }

  const handleDotKeydown = (event: KeyboardEvent, index: number) => {
    if (items.length === 0) return

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      const nextIndex = (index + 1) % items.length
      focusItemAt(nextIndex, 'smooth', 'keyboard')
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      const prevIndex = (index - 1 + items.length) % items.length
      focusItemAt(prevIndex, 'smooth', 'keyboard')
      return
    }

    if (event.key === 'Home') {
      event.preventDefault()
      focusItemAt(0, 'smooth', 'keyboard')
      return
    }

    if (event.key === 'End') {
      event.preventDefault()
      focusItemAt(items.length - 1, 'smooth', 'keyboard')
    }
  }

  onMount(() => {
    if (trackEl) {
      lastScrollLeft = trackEl.scrollLeft
    }

    if (items.length > 0) {
      const initialIndex = activeIndex === null ? initialActiveIndex : activeIndex
      focusItemAt(clampIndex(initialIndex), 'auto', 'mount')
    }

    // scrollIntoView may not fire a scroll event when the card is already centered,
    // so --card-offset/--card-focus still need an explicit initial computation.
    applyVisualStateFromCenter('mount')
  })
</script>

<div
  class={`carousel-shell ${shellClass}`}
  style={`--carousel-card-basis: ${cardBasis}; --carousel-card-overlap: ${cardOverlap}; --carousel-edge-bg: ${edgeFadeColor};`}
>
  <ul
    class={`carousel-track ${trackClass}`}
    bind:this={trackEl}
    on:scroll={handleTrackScroll}
    role="region"
    aria-label={ariaLabel}
  >
    {#if items.length === 0}
      <li class={`carousel-item carousel-item-empty ${itemClass}`}>
        <slot name="empty" />
      </li>
    {:else}
      {#each items as item, index (getItemKey(item, index))}
        <li
          class={`carousel-item ${itemClass}`}
          class:active={index === resolvedActiveIndex}
          class:is-active={index === resolvedActiveIndex}
          class:is-near={Math.abs(index - resolvedActiveIndex) === 1}
          class:is-far={Math.abs(index - resolvedActiveIndex) >= 2}
          bind:this={itemEls[index]}
        >
          <slot {item} {index} isActive={index === resolvedActiveIndex} />
        </li>
      {/each}
    {/if}
  </ul>

  <div class="edge-fade edge-fade--left" aria-hidden="true"></div>
  <div class="edge-fade edge-fade--right" aria-hidden="true"></div>
</div>

{#if showDots && items.length > 1}
  <div class="carousel-dots" role="tablist" aria-label={dotsAriaLabel}>
    <div class="dots-track">
      {#each items as item, index (getItemKey(item, index))}
        <button
          class="dot"
          class:active={index === resolvedActiveIndex}
          type="button"
          role="tab"
          aria-selected={index === resolvedActiveIndex}
          tabindex={index === resolvedActiveIndex ? 0 : -1}
          aria-label={getDotAriaLabel(item, index)}
          on:click={() => {
            focusItemAt(index, 'smooth', 'dot')
          }}
          on:keydown={(event) => {
            handleDotKeydown(event, index)
          }}
        ></button>
      {/each}
    </div>
  </div>
{/if}

<style lang="scss">
  .carousel-shell {
    position: relative;
    isolation: isolate;
    border-radius: var(--radius-xl);
    margin-inline: 0;
    min-width: 0;
    min-height: 0;
    background: transparent;
    overflow: hidden;
  }

  .carousel-track {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    list-style: none;
    margin: 0;
    padding-block: var(--space-6) calc(var(--space-6) + var(--space-3));
    padding-inline: 0;
    gap: 0;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .carousel-track::-webkit-scrollbar {
    display: none;
  }

  .carousel-track::before,
  .carousel-track::after {
    content: '';
    flex: 0 0 calc((100% - var(--carousel-card-basis)) / 2);
  }

  .carousel-item {
    --card-offset: 0;
    --card-focus: 0;
    flex: 0 0 var(--carousel-card-basis);
    display: flex;
    align-items: center;
    min-width: 0;
    margin-left: calc(-1 * var(--carousel-card-overlap));
    scroll-snap-align: center;
    transition:
      transform var(--dur-ui) var(--motion-standard),
      z-index 140ms linear;
    transform: translate(calc(var(--card-offset) * -14px), calc((1 - var(--card-focus)) * 9px))
      scale(calc(0.9 + var(--card-focus) * 0.2));
  }

  .carousel-item:first-child {
    margin-left: 0;
  }

  .edge-fade {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 50px;
    pointer-events: none;
    z-index: 110;
  }

  .edge-fade--left {
    left: 0;
    background: linear-gradient(
      to right,
      var(--carousel-edge-bg) 0%,
      color-mix(in srgb, var(--carousel-edge-bg) 80%, transparent) 38%,
      transparent 100%
    );
  }

  .edge-fade--right {
    right: 0;
    background: linear-gradient(
      to left,
      var(--carousel-edge-bg) 0%,
      color-mix(in srgb, var(--carousel-edge-bg) 80%, transparent) 38%,
      transparent 100%
    );
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

  @media (prefers-reduced-motion: reduce) {
    .carousel-item,
    .dot {
      transition: none;
    }
  }
</style>
