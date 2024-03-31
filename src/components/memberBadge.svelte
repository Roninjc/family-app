<script lang="ts">
  import type { FamilyNode } from '$lib/types/familyTypes'
  import { familyTree } from '../stores/tree'

  export let memberId: string

  const member: FamilyNode = familyTree.getList().get(memberId)
  const name = member.memberInfo.name
  const completeMemberFamilyName = `${member.memberInfo.firstFamilyName} ${member.memberInfo.secondFamilyName}`
</script>

<div class="member-badge">
  <div class="picture-wrapper"></div>
  <div class="name-wrapper">
    <div class="name-container">
      {name}
    </div>
    <div class="family-name-container">
      {completeMemberFamilyName}
    </div>
  </div>
</div>

<style lang="scss">
  .member-badge {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 5px;
    width: 140px;
    height: 110px;
    padding: 5px;
    overflow: hidden;
    border-radius: 10px;
    background: linear-gradient(145deg, #f0f0f0, #cacaca);
    box-shadow:
      6px 6px 12px #bebebe,
      -6px -6px 12px #ffffff;
    z-index: 1;
  }

  .picture-wrapper {
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: #e0e0e0;
    box-shadow:
      inset 3px 3px 6px #bebebe,
      inset -3px -3px 6px #ffffff;
  }

  .name-wrapper {
    border-radius: 10px;
    white-space: nowrap;
    overflow: hidden;
    width: 100%;
    padding: 3px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
    background: #e0e0e0;
    box-shadow:
      inset 3px 3px 6px #bebebe,
      inset -3px -3px 6px #ffffff;
  }
</style>
