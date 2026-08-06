<script lang="ts">
  import type { FamilyNode } from '$lib/types/familyTypes'
  import { editingMemberId, showEditMemberModal } from '../stores/modals'
  import { familyTree } from '../stores/tree'

  export let memberId: string

  const member: FamilyNode = familyTree.getList().get(memberId)
  const name = member.memberInfo.name
  const familyName = member.memberInfo.familyName
  const initials = `${name?.[0] ?? ''}${familyName?.[0] ?? ''}`.toUpperCase()

  function openMemberModal() {
    editingMemberId.set(memberId)
    showEditMemberModal.set(true)
  }
</script>

<button type="button" class="member-badge" on:click={openMemberModal}>
  <div class="picture-wrapper" aria-hidden="true">{initials}</div>
  <div class="name-wrapper">
    <div class="name-container">
      {name}
    </div>
    <div class="family-name-container">
      {familyName}
    </div>
  </div>
</button>

<style lang="scss">
  .member-badge {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 7px;
    width: 152px;
    min-height: 126px;
    padding: 10px 8px;
    overflow: hidden;
    border: none;
    border-radius: 14px;
    background: var(--neu-surface);
    box-shadow: var(--neu-shadow-out-soft);
    z-index: 1;
    font: inherit;
    color: var(--text-main);
    cursor: pointer;
    transition:
      transform 0.24s var(--motion-standard),
      box-shadow 0.24s var(--motion-standard),
      border-color 0.24s var(--motion-standard);

    &:hover {
      transform: translateY(-1px);
      box-shadow: 7px 7px 14px rgba(154, 132, 109, 0.28), -7px -7px 14px rgba(255, 255, 255, 0.82);
    }
  }

  .picture-wrapper {
    width: 62px;
    height: 62px;
    border-radius: 50%;
    background: #f3ede5;
    border: none;
    color: #735844;
    font-size: 1.02rem;
    font-weight: 800;
    display: grid;
    place-items: center;
    box-shadow:
      inset 4px 4px 8px rgba(154, 132, 109, 0.2),
      inset -4px -4px 8px rgba(255, 255, 255, 0.86);
  }

  .name-wrapper {
    border-radius: 9px;
    overflow: hidden;
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    flex-grow: 1;
    gap: 2px;
    padding: 6px 6px 5px;
    background: #f5efe8;
    box-shadow: var(--neu-shadow-inset);
  }

  .name-container,
  .family-name-container {
    max-width: 100%;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
  }

  .name-container {
    font-size: var(--fs-sm);
    font-weight: 700;
    line-height: 1.2;
  }

  .family-name-container {
    font-size: var(--fs-xs);
    color: var(--accent-plum);
    line-height: 1.2;
  }

  @media (max-width: 720px) {
    .member-badge {
      width: 142px;
      min-height: 120px;
      padding: 8px 7px;
    }

    .picture-wrapper {
      width: 58px;
      height: 58px;
      font-size: 0.95rem;
    }
  }
</style>
