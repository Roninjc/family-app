<script lang="ts">
  import type { Relationship } from '$lib/types/familyTypes'
  import { get } from 'svelte/store'
  import { familyTree, stack, visitedMembers } from '../stores/tree'

  export let member: string

  const actualVisitedMembers = get(visitedMembers)
  const actualStack = get(stack)
  console.log(actualVisitedMembers)

  let memberToDisplay: string

  if (member && !actualVisitedMembers.includes(member)) {
    memberToDisplay = member

    // Add actual member to visitedMembers store
    actualVisitedMembers.push(member)
    visitedMembers.set(actualVisitedMembers)

    const relationships: Relationship[] = familyTree.getNodeRelationships(member)
    console.log(relationships, member)
    for (const i in relationships) {
      // Add member's relatives to stack for next loop
      actualStack.push(relationships[i].nodeId)
      stack.set(actualStack)
    }
  }
</script>

<div class="member-node">
  {memberToDisplay}
</div>

<style lang="scss">
</style>
