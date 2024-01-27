<script lang="ts">
  import { onMount } from 'svelte'
  import TreeNode from '../components/treeNode.svelte'
  import { firstGenreation, stack } from '../stores/tree'

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
    }, 400)
  })

  function centerTree() {
    const containerWidth = treeWrapper.clientWidth
    const graphWidth = treeWrapper.scrollWidth

    const scrollLeft = (graphWidth - containerWidth) / 2
    treeWrapper.scrollLeft = scrollLeft
  }
</script>

<h1>Familia Castaño</h1>
<div id="family-tree-wrapper" bind:this={treeWrapper}>
  {#if initialMemberId}
    <TreeNode memberId={initialMemberId} />
  {:else}
    No initial member
  {/if}
</div>

<style lang="scss">
  :global(body) {
    margin: 0;
  }

  #family-tree-wrapper {
    display: flex;
    flex-direction: row;
    background-color: #e0e0e0;
    overflow: scroll;
    padding: 20px;
    scroll-behavior: smooth;
  }
</style>
