<script lang="ts">
  import { onMount } from 'svelte'
  import { initTreeData, renderRoots, stack, treeVersion, visitedMembers } from '../stores/tree'
  import TreeNode from '../components/treeNode.svelte'
  import AddFamilyMemberModal from '../components/addFamilyMemberModal.svelte'
  import EditMemberModal from '../components/editMemberModal.svelte'

  export let data
  export let params: Record<string, string> = {}
  $: routeParamsCount = Object.keys(params).length

  let roots: string[] = []
  let treeWrapper: HTMLElement

  // Rebuild the graph whenever the page data changes (initial load or after
  // adding a member), then re-seed the render stores before the {#key} block
  // re-mounts the tree.
  $: if (data.familyData) initTreeData(data.familyData)
  $: resetTreeRender($treeVersion)

  function resetTreeRender(version: number) {
    visitedMembers.set([])
    // One root per tree to render: the main family first, then in-law
    // ancestors / disconnected components (see renderRoots).
    roots = renderRoots
    stack.set([...roots])

    if (version > 0) setTimeout(centerTree, 400)
  }

  onMount(() => {
    setTimeout(() => {
      centerTree()
      // TODO(WIP): animation draw parentChildren lines
    }, 400)
  })

  function centerTree() {
    if (!treeWrapper) return

    const containerWidth = treeWrapper.clientWidth
    const graphWidth = treeWrapper.scrollWidth

    const scrollLeft = (graphWidth - containerWidth) / 2
    treeWrapper.scrollLeft = scrollLeft
  }

  // Lines are measured once when each node mounts, so on window resize the
  // tree is re-mounted (debounced) to re-measure.
  let resizeTimer: ReturnType<typeof setTimeout>
  function handleResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => treeVersion.update((version) => version + 1), 250)
  }
</script>

<svelte:window on:resize={handleResize} />

<main id="family-tree-wrapper" data-route-params-count={routeParamsCount} bind:this={treeWrapper}>
  {#key $treeVersion}
    {#if roots.length > 0}
      {#each roots as rootMemberId (rootMemberId)}
        <TreeNode memberId={rootMemberId} />
      {/each}
    {:else}
      <div class="empty-tree-message" role="status">
        <p class="empty-title">Tu árbol familiar está listo para empezar.</p>
        <p class="empty-subtitle">
          Añade el primer miembro para construir conexiones, ramas y generaciones.
        </p>
      </div>
    {/if}
  {/key}
</main>
<AddFamilyMemberModal />
<EditMemberModal />

<style lang="scss">
  #family-tree-wrapper {
    --tree-row-height: 126px;
    --tree-generation-gap: 74px;
    --tree-generation-step: calc(var(--tree-row-height) + var(--tree-generation-gap));
    --tree-band-height: calc(var(--tree-row-height) + 10px);
    position: relative;
    display: flex;
    flex-direction: row;
    // Gap between root trees (main family, in-law branches...)
    gap: 120px;
    background: transparent;
    height: 100%;
    min-height: 100vh;
    padding: 24px;
    padding-bottom: max(154px, env(safe-area-inset-bottom));
    overflow: scroll;
    scroll-behavior: smooth;
    background-image: none;

    @media (max-width: 720px) {
      --tree-row-height: 120px;
      --tree-band-height: calc(var(--tree-row-height) + 8px);
      gap: 80px;
      padding: 16px;
      padding-bottom: max(182px, env(safe-area-inset-bottom));
    }
  }

  .empty-tree-message {
    margin: 0 auto;
    max-width: 520px;
    text-align: center;
    padding: 20px 18px;
    border-radius: 14px;
    color: var(--text-muted);
    background: linear-gradient(160deg, rgba(255, 252, 247, 0.72), rgba(255, 241, 224, 0.46));
    box-shadow: 0 14px 24px rgba(106, 62, 30, 0.12);

    .empty-title,
    .empty-subtitle {
      margin: 0;
    }

    .empty-title {
      font-size: var(--fs-lg);
      line-height: var(--lh-tight);
      color: var(--text-main);
      margin-bottom: 6px;
    }

    .empty-subtitle {
      font-size: var(--fs-sm);
      line-height: var(--lh-copy);
    }
  }
</style>
