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
    border: 1px solid var(--tree-node-border);
    border-radius: 14px;
    background: var(--tree-node-surface);
    box-shadow: var(--tree-node-shadow);
    backdrop-filter: blur(10px);
    z-index: 1;
    font: inherit;
    color: var(--text-main);
    cursor: pointer;
    transition:
      transform 0.24s var(--motion-standard),
      box-shadow 0.24s var(--motion-standard),
      border-color 0.24s var(--motion-standard);

    &:hover {
      transform: translateY(-2px);
      box-shadow:
        0 18px 28px rgba(104, 84, 64, 0.14),
        inset 0 1px 0 rgba(255, 255, 255, 0.85);
      border-color: rgba(137, 114, 95, 0.4);
    }
  }

  .picture-wrapper {
    width: 62px;
    height: 62px;
    border-radius: 50%;
    background: linear-gradient(155deg, rgba(155, 113, 88, 0.22), rgba(189, 200, 174, 0.24));
    border: 1px solid rgba(143, 125, 102, 0.34);
    color: #735844;
    font-size: 1.02rem;
    font-weight: 800;
    display: grid;
    place-items: center;
    box-shadow:
      inset 0 1px 2px rgba(255, 255, 255, 0.7),
      0 5px 12px rgba(104, 85, 66, 0.14);
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
    background: rgba(255, 255, 255, 0.52);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.72);
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
