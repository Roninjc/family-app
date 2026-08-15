<script lang="ts">
  import type { FamilyMember } from '$lib/types/familyTypes'
  import { matchesSearch } from '$lib/utils/text'
  import { createEventDispatcher, tick } from 'svelte'
  import { enhance } from '$app/forms'
  import { invalidateAll } from '$app/navigation'
  import MemberAutocompleteSuggestions from './ui/memberAutocompleteSuggestions.svelte'

  export let label: string
  export let addPlaceholder: string
  export let memberId: string
  // Relation kind as seen from the edited member (the server translates it
  // to the normalized table row)
  export let kind: 'parent' | 'child' | 'sibling' | 'partner' | 'previous_partner'
  export let relatedIds: string[] = []
  // Non-selectable ids: the member itself and anyone already related to them
  export let excludedIds: string[] = []
  export let members: FamilyMember[] = []
  export let editable = false
  export let maxItems: number | undefined = undefined
  // Probable relations (e.g. a child's siblings as likely children): offered
  // as one-click chips, never applied automatically
  export let suggested: FamilyMember[] = []
  export let suggestedLabel = ''

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
      matchesSearch(m.name + ' ' + m.familyName, search) &&
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
    // Wait until the hidden input holds the value before submitting
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
      <li class="chip empty">Sin registros</li>
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
          aria-label={`Buscar para ${label.toLowerCase()}`}
        />
        <MemberAutocompleteSuggestions
          show={showSuggestions}
          items={suggestions}
          activeIds={[]}
          tone="neutral"
          on:select={(event) => selectCandidate(event.detail)}
        />
      </div>
    </form>
    {#if suggested.length > 0}
      <div class="suggested-relations">
        {#if suggestedLabel}<span>{suggestedLabel}</span>{/if}
        {#each suggested as candidate (candidate.id)}
          <button
            type="button"
            class="suggested-chip app-suggested-chip"
            disabled={saving}
            on:click={() => selectCandidate(candidate)}
          >
            + {candidate.name}
            {candidate.familyName}
          </button>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<style lang="scss">
  .relation-editor {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin-bottom: 1rem;

    h4 {
      margin: 0;
      font-size: var(--fs-xs);
      color: var(--text-muted);
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
        min-height: 32px;
        padding: 5px 10px;
        border-radius: 999px;
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(255, 255, 255, 0.82);
        font-size: 0.9rem;
        color: var(--text-main);

        &.empty {
          color: var(--text-soft);
          border-style: dashed;
          background: rgba(255, 249, 241, 0.5);
        }

        form {
          display: flex;
        }

        .remove-chip {
          border: none;
          background: #f0e8dd;
          min-width: 24px;
          min-height: 24px;
          padding: 0;
          font-size: 1rem;
          line-height: 1;
          color: #6b5a4b;
          cursor: pointer;
          border-radius: 999px;
          box-shadow:
            2px 2px 5px rgba(149, 121, 95, 0.12),
            -2px -2px 5px rgba(255, 255, 255, 0.72);

          &:hover {
            color: var(--danger);
            background: #f5ede3;
          }

          &:disabled {
            opacity: 1;
            color: #9aa3af;
            cursor: not-allowed;
          }
        }
      }
    }

    .suggested-relations {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      font-size: var(--fs-xs);
      color: var(--brand);

      .suggested-chip {
        &:disabled {
          opacity: 1;
          border-color: #aeb8c5;
          background: #e3e8ef;
          color: #5c6673;
          cursor: not-allowed;
        }
      }
    }

    .autocomplete-wrapper {
      position: relative;

      .relation-input {
        width: 100%;
        box-sizing: border-box;
        min-height: 42px;
        padding: 0.45rem 0.75rem;
        border: 1px solid var(--field-border);
        border-radius: 10px;
        background: var(--field-bg);
        font-size: var(--fs-sm);
        color: var(--text-main);

        &:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(156, 90, 45, 0.16);
          background: #fff;
        }

        &::placeholder {
          color: #9f9f9f;
        }

        &:disabled {
          opacity: 1;
          cursor: not-allowed;
          background: #edf1f5;
          color: #6b7280;
          border-color: #cdd5df;
          box-shadow: none;
        }
      }
    }
  }
</style>
