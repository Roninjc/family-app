<script lang="ts">
  import CarouselCard from './carouselCard.svelte'
  import type { DashboardFamilySummary } from '../feed/types'

  export let family: DashboardFamilySummary

  const familyPreviewText = (family: DashboardFamilySummary) => {
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

  const lineageNames = (family: DashboardFamilySummary) => {
    const source = family.previewMembers.filter(Boolean)
    const base = source.length > 0 ? source : [family.name, 'Origen', 'Memoria']
    return [...base, ...base, ...base]
  }
</script>

<CarouselCard
  as="a"
  href={family.treeHref}
  aspectRatio="4 / 5"
  className="family-story-card"
  ariaLabel={`Entrar al nivel familiar de ${family.name}`}
  data-sveltekit-preload-data="tap"
  data-sveltekit-preload-code="eager"
>
  <div class="panel-header">
    <h3>{family.name}</h3>
  </div>

  <div class="family-seal" aria-hidden="true">
    <span>{familyMonogram(family.name)}</span>
  </div>

  <p class="family-preview-copy">{familyPreviewText(family)}</p>

  <div class="family-lineage" aria-hidden="true">
    <div class="lineage-track">
      {#each lineageNames(family) as name, index (`${family.id}-lineage-${index}`)}
        <span>{name}</span>
      {/each}
    </div>
  </div>
  <div class="loading-sheen" aria-hidden="true"></div>
</CarouselCard>

<style lang="scss">
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

  .panel-header h3 {
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

  :global(.is-loading .loading-sheen) {
    opacity: 1;
    animation: loading-sweep 1.2s var(--motion-standard) infinite;
  }

  :global(.is-loading .family-story-card > :not(.loading-sheen)) {
    opacity: 0.72;
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

  @media (prefers-reduced-motion: reduce) {
    :global(.family-story-card),
    .lineage-track {
      transition: none;
      animation: none;
    }
  }
</style>
