<script lang="ts">
  import ChipToggleGroup from '../ui/chipToggleGroup.svelte'
  import type {
    DashboardFamilySummary,
    DashboardNote,
    DashboardNoteType,
    DashboardNotesFilter
  } from './types'

  export let family: Pick<DashboardFamilySummary, 'id' | 'name' | 'canManageNotes'>

  export let notes: DashboardNote[] = []
  export let filter: DashboardNotesFilter = 'all'
  export let filterOptions: Array<{ value: string; label: string }> = []

  export let status: {
    created?: boolean
    updated?: boolean
    deleted?: boolean
    errorMessage?: string
  } = {}

  export let editingId: string | null = null

  export let titleDraft = ''
  export let bodyDraft = ''
  export let typeDraft: DashboardNoteType = 'note'

  export let onFilterChange: (event: CustomEvent<string>) => void = () => {}
  export let onEditStart: (note: DashboardNote) => void = () => {}
  export let onEditCancel: () => void = () => {}
</script>

<div class="notes-card">
  <div class="notes-header">
    <h4>Noticias y notas</h4>
  </div>

  <div class="notes-filter-row">
    <ChipToggleGroup
      ariaLabel={`Filtros de notas en ${family.name}`}
      options={filterOptions}
      value={filter}
      on:change={onFilterChange}
    />
  </div>

  {#if status.errorMessage}
    <p class="note-error" role="alert">{status.errorMessage}</p>
  {/if}

  {#if status.created}
    <p class="note-ok" role="status">Nota creada.</p>
  {/if}
  {#if status.updated}
    <p class="note-ok" role="status">Nota actualizada.</p>
  {/if}
  {#if status.deleted}
    <p class="note-ok" role="status">Nota eliminada.</p>
  {/if}

  <ul>
    {#each notes as note (note.id)}
      <li>
        <div class="note-head">
          <h5>{note.title}</h5>
          <span class="note-type" class:news={note.noteType === 'news'}>
            {note.noteType === 'news' ? 'Noticia' : 'Nota'}
          </span>
        </div>

        {#if editingId === note.id}
          <form method="POST" action="?/updateNote" class="note-form note-form-inline">
            <input type="hidden" name="familyId" value={family.id} />
            <input type="hidden" name="noteId" value={note.id} />
            <label>
              Título
              <input
                class="modern-input"
                name="title"
                bind:value={titleDraft}
                maxlength="120"
                required
              />
            </label>
            <label>
              Tipo
              <select class="modern-select" name="noteType" bind:value={typeDraft}>
                <option value="note">Nota</option>
                <option value="news">Noticia</option>
              </select>
            </label>
            <label>
              Contenido
              <textarea class="modern-textarea" name="body" rows="3" bind:value={bodyDraft} required
              ></textarea>
            </label>
            <div class="note-actions">
              <button class="app-btn app-btn--primary" type="submit">Guardar</button>
              <button
                class="app-btn app-btn--ghost"
                type="button"
                on:click={() => {
                  onEditCancel()
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        {:else}
          <p>{note.body}</p>
          {#if family.canManageNotes}
            <div class="note-actions">
              <button
                type="button"
                class="app-btn app-btn--ghost note-action-btn"
                on:click={() => {
                  onEditStart(note)
                }}
              >
                Editar
              </button>
              <form method="POST" action="?/deleteNote">
                <input type="hidden" name="familyId" value={family.id} />
                <input type="hidden" name="noteId" value={note.id} />
                <button class="app-btn app-btn--danger note-action-btn" type="submit">
                  Eliminar
                </button>
              </form>
            </div>
          {/if}
        {/if}
      </li>
    {/each}
  </ul>

  {#if notes.length === 0}
    <p class="notes-empty">No hay resultados para este filtro.</p>
  {/if}
</div>

<style lang="scss">
  .notes-card {
    --notes-card-shadow: 4px 4px 9px rgba(154, 132, 109, 0.17),
      -4px -4px 9px rgba(255, 255, 255, 0.72);
    --notes-list-item-shadow: 3px 3px 7px rgba(154, 132, 109, 0.14),
      -3px -3px 7px rgba(255, 255, 255, 0.7);
    border-radius: var(--radius-card);
    background: color-mix(in srgb, var(--neu-surface-soft) 88%, #ffffff 12%);
    border: none;
    box-shadow: var(--notes-card-shadow);
    transition:
      transform var(--dur-ui) var(--motion-standard),
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease);
    position: relative;
    padding: var(--space-3);
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .notes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-0);
  }

  .notes-filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-1);
    margin-bottom: var(--space-2);
  }

  .note-action-btn:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--brand) 88%, #fff 12%);
    outline-offset: 3px;
    box-shadow: var(--focus-ring-warm);
  }

  .note-form {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-bottom: var(--space-2);
  }

  .note-form label {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .modern-input,
  .modern-select,
  .modern-textarea {
    width: 100%;
    border: 1px solid var(--field-border);
    border-radius: var(--radius-control);
    background: var(--field-bg);
    color: var(--text-main);
    font-family: inherit;
    font-size: var(--fs-sm);
  }

  .modern-input,
  .modern-select {
    min-height: 40px;
    padding: var(--space-1) var(--space-2);
  }

  .modern-textarea {
    padding: var(--space-2) var(--space-2);
    resize: vertical;
  }

  .note-actions {
    display: flex;
    gap: var(--space-1);
    margin-top: var(--space-2);
    flex-wrap: wrap;
  }

  .note-action-btn {
    min-height: 34px;
    font-size: var(--fs-xs);
    padding: var(--space-2) var(--space-2);
  }

  .note-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
    margin-bottom: var(--space-1);
  }

  .note-type {
    border-radius: var(--radius-pill);
    padding: var(--space-0) var(--space-2);
    font-size: var(--fs-2xs);
    background: var(--chip-warm-bg);
    color: var(--text-warm-chip);
    white-space: nowrap;
  }

  .note-type.news {
    background: var(--chip-warm-bg-hover);
    color: var(--text-warm-strong);
  }

  .note-ok,
  .note-error {
    margin: 0 0 var(--space-2);
    font-size: var(--fs-xs);
  }

  .note-ok {
    color: var(--feedback-success-text);
  }

  .note-error {
    color: var(--feedback-error-text);
  }

  h4 {
    margin: 0;
    font-size: var(--fs-md);
  }

  ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin: 0;
    padding: 0;
    min-height: 0;
  }

  li {
    padding: var(--space-2) var(--space-3);
    border-radius: var(--radius-control);
    background: color-mix(in srgb, var(--neu-surface-soft) 90%, #ffffff 10%);
    border: none;
    box-shadow: var(--notes-list-item-shadow);
    transition: box-shadow var(--neumo-shadow-transition-duration)
      var(--neumo-shadow-transition-ease);
  }

  h5,
  p {
    margin: 0;
  }

  h5 {
    font-size: var(--fs-sm);
    margin-bottom: var(--space-1);
  }

  p {
    color: var(--text-muted);
    font-size: var(--fs-xs);
  }

  .notes-empty {
    margin: var(--space-2) 0 0;
    color: var(--text-muted);
    font-size: var(--fs-xs);
  }
</style>
