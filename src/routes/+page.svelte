<script lang="ts">
  import { onMount } from 'svelte'
  import { familyTree, firstGenreation, stack } from '../stores/tree'
  import Header from '../components/header.svelte'
  import TreeNode from '../components/treeNode.svelte'
  import Footer from '../components/footer.svelte'
  import AddFamilyMemberModal from '../components/addFamilyMemberModal.svelte'

  let initialMemberId: string
  let treeWrapper: HTMLElement

  if (firstGenreation && firstGenreation.length > 0) {
    initialMemberId = firstGenreation[0].nodeId

    if (initialMemberId) {
      stack.set([initialMemberId])
    }
  }

  onMount(() => {
    setTimeout(() => {
      centerTree()
      // familyTree.getParentsChildren()
      console.log(familyTree.getParentsChildren())
      // TODO(WIP): animation draw parentChildren limes
    }, 400)
  })

  function centerTree() {
    const containerWidth = treeWrapper.clientWidth
    const graphWidth = treeWrapper.scrollWidth

    const scrollLeft = (graphWidth - containerWidth) / 2
    treeWrapper.scrollLeft = scrollLeft
  }
</script>

<Header />
<main id="family-tree-wrapper" bind:this={treeWrapper}>
  {#if initialMemberId}
    <TreeNode memberId={initialMemberId} />
  {:else}
    It seem as you still have not added any member of this family.
  {/if}
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
