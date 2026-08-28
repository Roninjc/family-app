<script lang="ts">
  export let title = ''
  export let subtitle = ''
  export let statusLabel = 'Próximamente'
  export let ctaLabel = 'Disponible pronto'
  export let highlights: string[] = []
</script>

<article class="upcoming-card app-card-soft-raised" aria-label={`${title} próximamente`}>
  <header>
    <p class="status-pill">{statusLabel}</p>
    <h3>{title}</h3>
    <p class="subtitle">{subtitle}</p>
  </header>

  <ul>
    {#each highlights as item}
      <li>{item}</li>
    {/each}
  </ul>

  <button class="app-btn app-btn--ghost" type="button" disabled aria-disabled="true">{ctaLabel}</button>
</article>

<style lang="scss">
  .upcoming-card {
    display: flex;
    flex-direction: column;
    gap: 14px;
    padding: 18px;
    border-radius: var(--radius-xl);
    max-height: min(74dvh, 760px);
    overflow: auto;
    background:
      radial-gradient(circle at 8% 8%, rgba(255, 255, 255, 0.62), transparent 45%),
      linear-gradient(145deg, rgba(246, 239, 229, 0.88), rgba(236, 226, 212, 0.92));
  }

  .upcoming-card::-webkit-scrollbar {
    width: 6px;
  }

  .upcoming-card::-webkit-scrollbar-thumb {
    border-radius: 999px;
    background: rgba(155, 125, 96, 0.35);
  }

  header {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  h3 {
    margin: 0;
    font-size: 1.1rem;
    color: #4e392d;
  }

  .subtitle {
    margin: 0;
    color: var(--text-muted);
    font-size: var(--fs-sm);
    line-height: var(--lh-copy);
  }

  .status-pill {
    margin: 0;
    width: fit-content;
    border-radius: var(--radius-pill);
    padding: 4px 10px;
    font-size: var(--fs-2xs);
    letter-spacing: 0.04em;
    text-transform: uppercase;
    background: rgba(189, 150, 103, 0.2);
    color: #7d5a39;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 8px;
  }

  li {
    padding-left: 14px;
    position: relative;
    color: #6c5544;
    font-size: var(--fs-sm);
  }

  li::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: rgba(168, 128, 80, 0.74);
    position: absolute;
    left: 0;
    top: 0.52rem;
  }

  button[disabled] {
    cursor: not-allowed;
    opacity: 0.66;
  }

  @media (min-width: 900px) {
    .upcoming-card {
      max-height: min(70dvh, 720px);
    }
  }
</style>
