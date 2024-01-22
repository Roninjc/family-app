<script lang="ts">
  import TreeNode from '../components/treeNode.svelte'
  import { familyTree, firstGenreation, stack } from '../stores/tree'

  let initialMember: string
  if (firstGenreation && firstGenreation.length > 0) {
    initialMember = firstGenreation[0].nodeId
    console.log('---', familyTree, familyTree.getNodeRelationships(initialMember), firstGenreation)

    if (initialMember) {
      stack.set([initialMember])
    }
  }
</script>

<h1>Familia Castaño</h1>
<div id="family-tree-wrapper">
  {#if initialMember}
    <TreeNode member={initialMember} />
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
