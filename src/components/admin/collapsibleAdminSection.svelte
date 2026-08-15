<script lang="ts">
  import { slide } from 'svelte/transition'

  export let open = false
  export let title = ''
  export let subtitle = ''
  export let revealClass = ''
  export let onToggle: () => void = () => {}
</script>

<section class={`admin-section ${revealClass}`.trim()} class:open={open}>
  <button
    type="button"
    class="section-toggle"
    on:click={() => {
      onToggle()
    }}
    aria-expanded={open}
  >
    <span>{title}</span>
    <small>
      {subtitle}
      <b class="toggle-state" aria-hidden="true">{open ? '−' : '+'}</b>
    </small>
  </button>

  {#if open}
    <div class="section-body" transition:slide={{ duration: 220 }}>
      <slot />
    </div>
  {/if}
</section>

<style lang="scss">
  .admin-section {
    margin-bottom: 1.05rem;
    background: transparent;
    border: none;
    border-radius: 15px;
    overflow: clip;
    box-shadow:
      5px 5px 12px rgba(149, 121, 95, 0.14),
      -5px -5px 12px rgba(255, 255, 255, 0.74);
    transition:
      box-shadow 0.22s var(--motion-standard),
      background-color 0.22s var(--motion-standard);

    &.open {
      background: transparent;
      box-shadow:
        7px 7px 15px rgba(149, 121, 95, 0.18),
        -6px -6px 15px rgba(255, 255, 255, 0.8);
    }

    .section-toggle {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 10px;
      border: none;
      background: transparent;
      color: var(--text-main);
      padding: 12px;
      text-align: left;
      cursor: pointer;
      border-radius: 14px;
      box-shadow: none;
      transition:
        background-color 0.22s var(--motion-standard),
        transform 0.22s var(--motion-standard),
        box-shadow 0.22s var(--motion-standard);

      &[aria-expanded='false']:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: translateY(-1px);
        box-shadow: none;
      }

      span {
        font-size: var(--fs-md);
        font-weight: 700;
      }

      small {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        font-size: var(--fs-2xs);
        color: var(--text-muted);
        font-weight: 600;

        .toggle-state {
          display: inline-grid;
          place-items: center;
          width: 18px;
          height: 18px;
          border-radius: 999px;
          font-size: 0.9rem;
          line-height: 1;
          font-weight: 700;
          color: #6b4b31;
          background: #f1e6d8;
          box-shadow:
            inset 2px 2px 5px rgba(149, 121, 95, 0.16),
            inset -2px -2px 5px rgba(255, 255, 255, 0.74);
        }
      }
    }

    .section-body {
      padding: 12px 12px 14px;
    }
  }

  @media (min-width: 760px) {
    .admin-section {
      border-radius: 16px;
    }
  }
</style>
