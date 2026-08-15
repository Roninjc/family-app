<script lang="ts">
  import GearIcon from '../icons/gearIcon.svelte'

  type FamilyMetrics = {
    membersCount: number
    usersCount: number
    unlinkedMembersCount: number
    activeInvitesCount: number
    managersCount: number
  }

  type Family = {
    id: string
    name: string
    role: string
    metrics: FamilyMetrics
  }

  export let families: Family[] = []
  export let focusedFamilyId = ''
  export let activeFamilyId = ''

  export let familyCarousel: HTMLDivElement | null = null

  export let trackFamilyCard: (node: HTMLElement, familyId: string) => { destroy: () => void }
  export let onDetectCenteredFamily: () => void = () => {}
  export let onSwitchFamily: (familyId: string) => void = () => {}
  export let onOpenFamilySettings: (family: Family) => void = () => {}
  export let onGoToFamilyAt: (index: number) => void = () => {}
</script>

<section class="family-scope-section reveal-fade-up reveal-delay-1">
  <div class="section-body family-scope-row">
    <div class="family-carousel-shell" class:multi={families.length > 1}>
      <div
        class="family-carousel"
        bind:this={familyCarousel}
        on:scroll={onDetectCenteredFamily}
        role="tablist"
        aria-label="Cambiar familia administrada"
      >
        {#each families as family (family.id)}
          <div
            class="family-card"
            class:active={family.id === focusedFamilyId}
            role="tab"
            tabindex={family.id === focusedFamilyId ? 0 : -1}
            aria-selected={family.id === activeFamilyId}
            use:trackFamilyCard={family.id}
            on:click={() => {
              onSwitchFamily(family.id)
            }}
            on:keydown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSwitchFamily(family.id)
              }
            }}
          >
            <div class="family-card-header">
              <span>{family.name}</span>
              {#if family.role !== 'viewer'}
                <button
                  type="button"
                  class="app-settings-trigger"
                  aria-label={`Abrir ajustes de ${family.name}`}
                  title="Ajustes de familia"
                  on:click|stopPropagation={() => {
                    onOpenFamilySettings(family)
                  }}
                  on:keydown|stopPropagation={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onOpenFamilySettings(family)
                    }
                  }}
                >
                  <GearIcon />
                </button>
              {/if}
            </div>

            <div class="family-metrics-grid app-stat-grid">
              <p class="app-stat-item">
                <strong>{family.metrics.membersCount}</strong>
                <span>Miembros</span>
              </p>
              <p class="app-stat-item">
                <strong>{family.metrics.usersCount}</strong>
                <span>Usuarios</span>
              </p>
              <p class="app-stat-item">
                <strong>{family.metrics.unlinkedMembersCount}</strong>
                <span>Sin vincular</span>
              </p>
              <p class="app-stat-item">
                <strong>{family.metrics.activeInvitesCount}</strong>
                <span>Invitaciones activas</span>
              </p>
              <p class="app-stat-item">
                <strong>{family.metrics.managersCount}</strong>
                <span>Gestores (admin/editor)</span>
              </p>
            </div>
          </div>
        {/each}
      </div>
    </div>

    {#if families.length > 1}
      <div class="carousel-dots" role="tablist" aria-label="Paginación de familias">
        {#each families as family, index (family.id)}
          <button
            type="button"
            class="dot"
            class:active={family.id === focusedFamilyId}
            role="tab"
            aria-selected={family.id === focusedFamilyId}
            aria-label={`Ir a ${family.name}`}
            on:click={() => {
              onGoToFamilyAt(index)
            }}
          ></button>
        {/each}
      </div>
    {/if}
  </div>
</section>

<style lang="scss">
  .family-scope-section {
    margin-bottom: 0.8rem;

    .section-body {
      padding: 2px 2px 6px;
    }
  }

  .family-scope-row {
    display: flex;
    justify-content: center;
    align-items: stretch;
    gap: 12px;
    flex-wrap: wrap;
  }

  .family-carousel-shell {
    width: min(980px, 100%);
    border-radius: 15px;
    padding: 6px;
    background: color-mix(in srgb, var(--neu-surface) 74%, transparent);
    box-shadow:
      inset 2px 2px 6px rgba(149, 121, 95, 0.12),
      inset -2px -2px 6px rgba(255, 255, 255, 0.64);

    &.multi {
      margin-inline: auto;
    }
  }

  .family-carousel {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(100%, 100%);
    gap: 12px;
    overflow-x: auto;
    scroll-snap-type: x mandatory;
    scroll-behavior: smooth;
    padding: 4px;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .family-card {
    scroll-snap-align: center;
    min-width: 0;
    border-radius: 13px;
    border: none;
    border-radius: inherit;
    min-height: 168px;
    width: 100%;
    padding: 0.8rem 0.9rem;
    background: transparent;
    color: #5d4735;
    cursor: default;
    text-align: left;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.7rem;

    &:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--brand) 86%, #fff 14%);
      outline-offset: 2px;
    }

    .family-card-header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 8px;

      span {
        font-size: var(--fs-md);
        font-weight: 800;
        color: #5d4735;
      }
    }

    .family-metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;

      p:last-child {
        grid-column: 1 / -1;
      }
    }

    &.active,
    &[aria-selected='true'] {
      background: transparent;
      border: none;
    }
  }

  .carousel-dots {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-top: 0.55rem;

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      border: none;
      background: #d7ccbe;
      cursor: pointer;
      box-shadow:
        2px 2px 5px rgba(149, 121, 95, 0.14),
        -2px -2px 5px rgba(255, 255, 255, 0.72);
      transition:
        transform 0.2s var(--motion-standard),
        background-color 0.2s var(--motion-standard),
        box-shadow 0.2s var(--motion-standard);

      &.active {
        transform: scale(1.2);
        background: #bfa58f;
        box-shadow:
          inset 1px 1px 3px rgba(149, 121, 95, 0.2),
          inset -1px -1px 3px rgba(255, 255, 255, 0.6);
      }
    }
  }
</style>
