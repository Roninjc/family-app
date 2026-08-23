<script lang="ts">
  import ChipToggleGroup from '../ui/chipToggleGroup.svelte'
  import type { HubFamilySummary, HubNote, HubNoteType, HubNotesFilter } from './types'

  export let family: Pick<HubFamilySummary, 'id' | 'name' | 'canManageNotes'>

  export let notes: HubNote[] = []
  export let filter: HubNotesFilter = 'all'
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
  export let typeDraft: HubNoteType = 'note'

  export let onFilterChange: (event: CustomEvent<string>) => void = () => {}
  export let onEditStart: (note: HubNote) => void = () => {}
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
              <input class="modern-input" name="title" bind:value={titleDraft} maxlength="120" required />
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
              <textarea class="modern-textarea" name="body" rows="3" bind:value={bodyDraft} required></textarea>
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
    border-radius: 14px;
    background: color-mix(in srgb, var(--neu-surface-soft) 88%, #ffffff 12%);
    border: none;
    box-shadow:
      4px 4px 9px rgba(154, 132, 109, 0.17),
      -4px -4px 9px rgba(255, 255, 255, 0.72);
    transition:
      transform 0.22s var(--motion-standard),
      box-shadow 0.22s var(--motion-standard);
    position: relative;
    padding: 14px;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .notes-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 2px;
  }

  .notes-filter-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 8px;
  }

  .note-action-btn:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--brand) 86%, #fff 14%);
    outline-offset: 3px;
    box-shadow: 0 0 0 5px rgba(223, 203, 182, 0.38);
  }

  .note-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 10px;
  }

  .note-form label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--fs-xs);
    color: var(--text-muted);
  }

  .modern-input,
  .modern-select,
  .modern-textarea {
    width: 100%;
    border: 1px solid rgba(168, 132, 101, 0.32);
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.78);
    color: var(--text-main);
    font-family: inherit;
    font-size: var(--fs-sm);
  }

  .modern-input,
  .modern-select {
    min-height: 40px;
    padding: 0.42rem 0.58rem;
  }

  .modern-textarea {
    padding: 0.52rem 0.58rem;
    resize: vertical;
  }

  .note-actions {
    display: flex;
    gap: 6px;
    margin-top: 8px;
    flex-wrap: wrap;
  }

  .note-action-btn {
    min-height: 34px;
    font-size: var(--fs-xs);
    padding: 0.45rem 0.68rem;
  }

  .note-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 4px;
  }

  .note-type {
    border-radius: 999px;
    padding: 2px 8px;
    font-size: var(--fs-2xs);
    background: rgba(117, 108, 96, 0.16);
    color: #5e4c3e;
    white-space: nowrap;
  }

  .note-type.news {
    background: rgba(161, 120, 80, 0.2);
    color: #6f4a2e;
  }

  .note-ok,
  .note-error {
    margin: 0 0 8px;
    font-size: var(--fs-xs);
  }

  .note-ok {
    color: var(--ok);
  }

  .note-error {
    color: var(--danger);
  }

  h4 {
    margin: 0;
    font-size: var(--fs-md);
  }

  ul {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 0;
    padding: 0;
    min-height: 0;
  }

  li {
    padding: 10px 11px;
    border-radius: 10px;
    background: color-mix(in srgb, var(--neu-surface-soft) 90%, #ffffff 10%);
    border: none;
    box-shadow:
      3px 3px 7px rgba(154, 132, 109, 0.14),
      -3px -3px 7px rgba(255, 255, 255, 0.7);
  }

  h5,
  p {
    margin: 0;
  }

  h5 {
    font-size: var(--fs-sm);
    margin-bottom: 4px;
  }

  p {
    color: var(--text-muted);
    font-size: var(--fs-xs);
  }

  .notes-empty {
    margin: 8px 0 0;
    color: var(--text-muted);
    font-size: var(--fs-xs);
  }
</style>
