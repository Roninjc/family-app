<script lang="ts">
  import type { FamilyNode } from '$lib/types/familyTypes'
  import { familyTree } from '../stores/tree'

  export let memberId: string

  const member: FamilyNode = familyTree.getList().get(memberId)
</script>

<span>{member.memberInfo.name}</span>

<style lang="scss">
</style>
