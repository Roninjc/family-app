<script lang="ts">
  import type { HubFamilySummary } from './types'

  export let family: Pick<
    HubFamilySummary,
    'id' | 'name' | 'membersCount' | 'linksCount' | 'previewMembers'
  >
</script>

<div class="preview-card" aria-label={`Previsualización de ${family.name}`}>
  <div class="preview-stats app-stat-grid">
    <p class="app-stat-item">
      <strong>{family.membersCount}</strong>
      <span>miembros</span>
    </p>
    <p class="app-stat-item">
      <strong>{family.linksCount}</strong>
      <span>relaciones</span>
    </p>
  </div>
  <ul class="preview-members">
    {#each family.previewMembers as memberName}
      <li>{memberName}</li>
    {/each}
  </ul>
</div>

<style lang="scss">
  .preview-card {
    --preview-card-shadow: 4px 4px 9px rgba(154, 132, 109, 0.17),
      -4px -4px 9px rgba(255, 255, 255, 0.72);
    border-radius: var(--radius-card);
    background: color-mix(in srgb, var(--neu-surface-soft) 88%, #ffffff 12%);
    border: none;
    box-shadow: var(--preview-card-shadow);
    transition:
      transform var(--dur-ui) var(--motion-standard),
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease);
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  .preview-stats {
    display: flex;
    gap: var(--space-2);
  }

  .preview-stats .app-stat-item {
    flex: 1;
    padding: var(--space-2) var(--space-2);
    color: var(--text-main);
  }

  .preview-stats .app-stat-item strong {
    font-size: 1.08rem;
    line-height: 1;
  }

  .preview-stats .app-stat-item span {
    font-size: var(--fs-2xs);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .preview-members {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-evenly;
    gap: var(--space-1);
    margin: 0;
    padding: 0;
  }

  .preview-members li {
    border-radius: var(--radius-pill);
    background: var(--chip-warm-bg);
    color: var(--text-warm-chip);
    padding: var(--space-1) var(--space-2);
    font-size: var(--fs-xs);
  }
</style>
