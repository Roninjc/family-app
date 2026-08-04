<script lang="ts">
  import { onMount } from 'svelte'
  import { firstGeneration, initTreeData, stack, treeVersion, visitedMembers } from '../stores/tree'
  import Header from '../components/header.svelte'
  import TreeNode from '../components/treeNode.svelte'
  import Footer from '../components/footer.svelte'
  import AddFamilyMemberModal from '../components/addFamilyMemberModal.svelte'

  export let data

  let initialMemberId: string | undefined
  let treeWrapper: HTMLElement

  // Rebuild the graph whenever the page data changes (initial load or after
  // adding a member), then re-seed the render stores before the {#key} block
  // re-mounts the tree.
  $: if (data.familyData) initTreeData(data.familyData)
  $: resetTreeRender($treeVersion)

  function resetTreeRender(version: number) {
    visitedMembers.set([])
    initialMemberId = firstGeneration?.[0]?.nodeId
    stack.set(initialMemberId ? [initialMemberId] : [])

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
</script>

<Header />
<main id="family-tree-wrapper" bind:this={treeWrapper}>
  {#key $treeVersion}
    {#if initialMemberId}
      <TreeNode memberId={initialMemberId} />
    {:else}
      It seem as you still have not added any member of this family.
    {/if}
  {/key}
</main>
<Footer />
<AddFamilyMemberModal />

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
    background-color: #e0e0e0;
    height: 100%;
    padding: 40px;
    overflow: scroll;
    scroll-behavior: smooth;
  }
</style>
