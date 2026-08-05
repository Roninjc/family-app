<script lang="ts">
  import type { FamilyMember } from '$lib/types/familyTypes'
  import { createEventDispatcher, tick } from 'svelte'
  import { enhance } from '$app/forms'
  import { invalidateAll } from '$app/navigation'

  export let label: string
  export let addPlaceholder: string
  export let memberId: string
  // Tipo de relación visto desde el miembro editado (el servidor lo traduce
  // a la fila normalizada de la tabla)
  export let kind: 'parent' | 'child' | 'sibling' | 'partner' | 'previous_partner'
  export let relatedIds: string[] = []
  // Ids no seleccionables: el propio miembro y quienes ya tienen otra relación con él
  export let excludedIds: string[] = []
  export let members: FamilyMember[] = []
  export let editable = false
  export let maxItems: number | undefined = undefined

  const dispatch = createEventDispatcher<{ error: string }>()

  let search = ''
  let showSuggestions = false
  let pendingOtherId = ''
  let saving = false
  let addFormEl: HTMLFormElement

  $: relatedMembers = relatedIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is FamilyMember => Boolean(m))
  $: suggestions = members.filter(
    (m) =>
      (m.name + ' ' + m.familyName).toLowerCase().includes(search.toLowerCase()) &&
      !relatedIds.includes(m.id) &&
      !excludedIds.includes(m.id)
  )
  $: canAdd = editable && (maxItems === undefined || relatedIds.length < maxItems)

  const enhanceRelation = () => {
    saving = true

    return async ({ result }: { result: import('@sveltejs/kit').ActionResult }) => {
      saving = false
      pendingOtherId = ''

      if (result.type === 'success') {
        await invalidateAll()
      } else if (result.type === 'failure') {
        dispatch(
          'error',
          String(result.data?.relationError ?? 'No se pudo actualizar la relación.')
        )
      } else if (result.type === 'error') {
        dispatch('error', 'No se pudo actualizar la relación.')
      }
    }
  }

  async function selectCandidate(candidate: FamilyMember) {
    pendingOtherId = candidate.id
    search = ''
    showSuggestions = false
    // Espera a que el hidden input tenga el valor antes de enviar
    await tick()
    addFormEl.requestSubmit()
  }
</script>

<div class="relation-editor">
  <h4>{label}</h4>
  <ul class="chips">
    {#each relatedMembers as related (related.id)}
      <li class="chip">
        <span>{related.name} {related.familyName}</span>
        {#if editable}
          <form method="POST" action="?/removeRelation" use:enhance={enhanceRelation}>
            <input type="hidden" name="memberId" value={memberId} />
            <input type="hidden" name="otherId" value={related.id} />
            <input type="hidden" name="kind" value={kind} />
            <button
              type="submit"
              class="remove-chip"
              disabled={saving}
              aria-label={`Quitar ${related.name} de ${label}`}>×</button
            >
          </form>
        {/if}
      </li>
    {:else}
      <li class="chip empty">—</li>
    {/each}
  </ul>
  {#if canAdd}
    <form method="POST" action="?/addRelation" use:enhance={enhanceRelation} bind:this={addFormEl}>
      <input type="hidden" name="memberId" value={memberId} />
      <input type="hidden" name="otherId" value={pendingOtherId} />
      <input type="hidden" name="kind" value={kind} />
      <div class="autocomplete-wrapper">
        <input
          class="relation-input"
          type="text"
          placeholder={addPlaceholder}
          bind:value={search}
          disabled={saving}
          on:input={() => (showSuggestions = true)}
          on:focus={() => (showSuggestions = true)}
          on:blur={() => setTimeout(() => (showSuggestions = false), 100)}
          on:keydown={(e) => {
            if (e.key === 'Enter') e.preventDefault()
          }}
          autocomplete="off"
        />
        {#if showSuggestions && suggestions.length > 0}
          <ul class="autocomplete-suggestions">
            {#each suggestions as candidate (candidate.id)}
              <li>
                <!-- mousedown|preventDefault: selecciona antes del blur del input -->
                <button
                  type="button"
                  on:mousedown|preventDefault={() => selectCandidate(candidate)}
                >
                  {candidate.name}
                  {candidate.familyName}
                </button>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </form>
  {/if}
</div>

<style lang="scss">
  .relation-editor {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1rem;

    h4 {
      margin: 0;
      font-size: 0.85rem;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.4rem;
      margin: 0;
      padding: 0;
      list-style: none;

      .chip {
        display: flex;
        align-items: center;
        gap: 0.3rem;
        padding: 4px 10px;
        border-radius: 999px;
        background: #fafafa;
        border: 1px solid #e0e0e0;
        font-size: 0.9rem;
        color: #444;

        &.empty {
          color: #9f9f9f;
          border-style: dashed;
        }

        form {
          display: flex;
        }

        .remove-chip {
          border: none;
          background: none;
          padding: 0 2px;
          font-size: 1rem;
          line-height: 1;
          color: #9f9f9f;
          cursor: pointer;

          &:hover {
            color: #dc2626;
          }
        }
      }
    }

    .autocomplete-wrapper {
      position: relative;

      .relation-input {
        width: 100%;
        box-sizing: border-box;
        padding: 0.45rem 0.75rem;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        background: #fafafa;
        font-size: 0.9rem;
        color: #444;

        &:focus {
          outline: none;
          border-color: #7c3aed;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.12);
          background: #fff;
        }

        &::placeholder {
          color: #9f9f9f;
        }
      }

      .autocomplete-suggestions {
        position: absolute;
        top: 110%;
        left: 0;
        right: 0;
        background: #fff;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        z-index: 10;
        max-height: 180px;
        overflow-y: auto;
        margin: 0;
        padding: 0;
        list-style: none;

        li button {
          width: 100%;
          padding: 8px 14px;
          border: none;
          background: none;
          font: inherit;
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition: background 0.2s;

          &:hover,
          &:focus {
            background: #f3f3ff;
            color: #7c3aed;
          }
        }
      }
    }
  }
</style>
