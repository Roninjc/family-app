<script lang="ts">
  import { onMount } from 'svelte'
  import { familyTree, firstGenreation, stack } from '../stores/tree'
  import AddFamilyMemberButton from '../components/addFamilyMemberButton.svelte'
  import TreeNode from '../components/treeNode.svelte'

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

<header>
  <h1>Familia Castaño</h1>
  <AddFamilyMemberButton />
</header>
<main id="family-tree-wrapper" bind:this={treeWrapper}>
  {#if initialMemberId}
    <TreeNode memberId={initialMemberId} />
  {:else}
    It seem as you still have not added any member of this family.
  {/if}
</main>

<style lang="scss">
  :global(body) {
    margin: 0;
    width: 100vw;
    height: 100vh;
    background: #e0e0e0;
  }

  header {
    position: sticky;
    top: 0;
    height: 80px;
    overflow: hidden;
    z-index: 2;
    backdrop-filter: blur(9px);
    box-shadow: 0px 6px 12px 4px #bebebe;

    h1 {
      text-align: center;
    }
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
