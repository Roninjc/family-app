<script lang="ts">
  import type { FamilyNode } from '$lib/types/familyTypes'
  import { familyTree } from '../stores/tree'

  export let memberId: string

  const member: FamilyNode = familyTree.getList().get(memberId)
  console.log('mmm', member)
</script>

<span>{member.memberInfo.name}</span>

<style lang="scss">
</style>
