<script lang="ts">
  export let as: 'button' | 'a' | 'div' = 'div'
  export let href: string | undefined = undefined
  export let ariaLabel: string | undefined = undefined
  export let aspectRatio = '1 / 1'
  export let className = ''
  export let onClick: (event: MouseEvent) => void = () => {}
</script>

<svelte:element
  this={as}
  class={`carousel-card ${className}`.trim()}
  class:is-interactive={as !== 'div'}
  style={`--card-aspect-ratio: ${aspectRatio};`}
  href={as === 'a' ? href : undefined}
  type={as === 'button' ? 'button' : undefined}
  role={as === 'a' ? 'link' : as === 'button' ? 'button' : undefined}
  aria-label={ariaLabel}
  on:click={as === 'div' ? undefined : onClick}
  {...$$restProps}
>
  <slot />
</svelte:element>

<style lang="scss">
  .carousel-card {
    position: relative;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    gap: var(--space-3);
    width: 100%;
    text-align: left;
    text-decoration: none;
    appearance: none;
    color: inherit;
    font: inherit;
    border: none;
    border-radius: var(--radius-lg);
    padding: var(--space-5);
    aspect-ratio: var(--card-aspect-ratio, 1 / 1);
    min-height: 0;
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
    opacity: calc(0.84 + var(--card-focus, 1) * 0.16);
    transition:
      opacity var(--dur-ui) var(--motion-standard),
      transform var(--dur-ui) var(--motion-standard),
      box-shadow var(--dur-ui) var(--motion-standard);
  }

  .carousel-card::before {
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

  .carousel-card > :global(*) {
    position: relative;
    z-index: 1;
  }

  .carousel-card.is-interactive {
    cursor: pointer;
  }

  .carousel-card.is-interactive:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--brand) 84%, #fff 16%);
    outline-offset: 2px;
  }
</style>
