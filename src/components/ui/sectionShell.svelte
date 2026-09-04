<script lang="ts">
  export let title: string
  export let ariaLabel: string | undefined = undefined
  export let background = 'var(--app-bg-deep, #f1ece4)'
  export let headerSideWidth = '38px'
  export let className = ''
</script>

<section
  class={`section-shell ${className}`.trim()}
  aria-label={ariaLabel ?? title}
  style={`--section-shell-bg: ${background}; --section-shell-side-width: ${headerSideWidth};`}
>
  <header class="section-shell-header">
    <div class="section-shell-side section-shell-leading">
      <slot name="leading" />
    </div>
    <h2>{title}</h2>
    <div class="section-shell-side section-shell-trailing">
      <slot name="trailing" />
    </div>
  </header>

  <div class="section-shell-content">
    <slot />
  </div>
</section>

<style lang="scss">
  .section-shell {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: auto minmax(0, 1fr);
    gap: var(--space-3);
    border-radius: var(--radius-xl);
    padding: var(--space-5);
    box-shadow: var(--neu-shadow-inset);
    background: var(--section-shell-bg);
  }

  .section-shell-header {
    display: grid;
    grid-template-columns:
      var(--section-shell-side-width) minmax(0, 1fr)
      var(--section-shell-side-width);
    column-gap: var(--space-2);
    align-items: center;
    min-width: 0;
    min-height: 40px;
  }

  .section-shell-side {
    display: flex;
    align-items: center;
    min-height: 0;
  }

  .section-shell-leading {
    justify-content: flex-start;
  }

  .section-shell-trailing {
    justify-content: flex-end;
  }

  .section-shell-header h2 {
    margin: 0;
    color: #4d382d;
    font-size: clamp(1.1rem, 1rem + 0.4vw, 1.35rem);
    text-align: center;
    justify-self: center;
  }

  .section-shell-content {
    min-width: 0;
    min-height: 0;
  }
</style>
