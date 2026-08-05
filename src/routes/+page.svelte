<script lang="ts">
  import { onMount } from 'svelte'
  import { initTreeData, renderRoots, stack, treeVersion, visitedMembers } from '../stores/tree'
  import Header from '../components/header.svelte'
  import TreeNode from '../components/treeNode.svelte'
  import Footer from '../components/footer.svelte'
  import AddFamilyMemberModal from '../components/addFamilyMemberModal.svelte'
  import EditMemberModal from '../components/editMemberModal.svelte'

  export let data

  let roots: string[] = []
  let treeWrapper: HTMLElement

  // Rebuild the graph whenever the page data changes (initial load or after
  // adding a member), then re-seed the render stores before the {#key} block
  // re-mounts the tree.
  $: if (data.familyData) initTreeData(data.familyData)
  $: resetTreeRender($treeVersion)

  function resetTreeRender(version: number) {
    visitedMembers.set([])
    // Una raíz por árbol a renderizar: la familia principal primero y después
    // los ancestros de consortes / componentes desconectados (ver renderRoots).
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

  // Las líneas se miden una sola vez al montar cada nodo, así que al cambiar
  // el tamaño de la ventana se re-monta el árbol (con debounce) para re-medir.
  let resizeTimer: ReturnType<typeof setTimeout>
  function handleResize() {
    clearTimeout(resizeTimer)
    resizeTimer = setTimeout(() => treeVersion.update((version) => version + 1), 250)
  }
</script>

<svelte:window on:resize={handleResize} />

<Header />
<main id="family-tree-wrapper" bind:this={treeWrapper}>
  {#key $treeVersion}
    {#if roots.length > 0}
      {#each roots as rootMemberId (rootMemberId)}
        <TreeNode memberId={rootMemberId} />
      {/each}
    {:else}
      It seem as you still have not added any member of this family.
    {/if}
  {/key}
</main>
<Footer />
<AddFamilyMemberModal />
<EditMemberModal />

<style lang="scss">
  :global(body) {
    margin: 0;
    width: 100vw;
    height: 100vh;
    background: #e0e0e0;
  }

  #family-tree-wrapper {
    position: relative;
    display: flex;
    flex-direction: row;
    // Separación entre árboles raíz (familia principal, ramas políticas...)
    gap: 120px;
    background-color: #e0e0e0;
    height: 100%;
    padding: 40px;
    overflow: scroll;
    scroll-behavior: smooth;
  }
</style>
