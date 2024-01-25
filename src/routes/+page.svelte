<script lang="ts">
  import TreeNode from '../components/treeNode.svelte'
  import { familyTree, firstGenreation, stack } from '../stores/tree'

  let initialMemberId: string
  if (firstGenreation && firstGenreation.length > 0) {
    initialMemberId = firstGenreation[0].nodeId
    console.log(
      '---',
      familyTree,
      familyTree.getNodeRelationships(initialMemberId),
      firstGenreation
    )

    if (initialMemberId) {
      stack.set([initialMemberId])
    }
  }
</script>

<h1>Familia Castaño</h1>
<div id="family-tree-wrapper">
  {#if initialMemberId}
    <TreeNode memberId={initialMemberId} />
  {:else}
    No initial member
  {/if}
</div>

<style lang="scss">
  #family-tree-wrapper {
    display: flex;
    flex-direction: row;
    background-color: aquamarine;
  }
</style>
