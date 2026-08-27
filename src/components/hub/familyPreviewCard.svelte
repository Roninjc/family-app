<script lang="ts">
  import type { HubFamilySummary } from './types'

  export let family: Pick<HubFamilySummary, 'id' | 'name' | 'membersCount' | 'linksCount' | 'previewMembers'>
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
    border-radius: 14px;
    background: color-mix(in srgb, var(--neu-surface-soft) 88%, #ffffff 12%);
    border: none;
    box-shadow: var(--preview-card-shadow);
    transition:
      transform 0.22s var(--motion-standard),
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease);
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .preview-stats {
    display: flex;
    gap: 10px;
  }

  .preview-stats .app-stat-item {
    flex: 1;
    padding: 8px 10px;
    color: #5b4430;
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
    gap: 6px;
    margin: 0;
    padding: 0;
  }

  .preview-members li {
    border-radius: 999px;
    background: rgba(127, 94, 66, 0.14);
    color: #5c4534;
    padding: 5px 9px;
    font-size: var(--fs-xs);
  }
</style>
