<script lang="ts">
  import { showAddMemberModal } from '../stores/modals'
</script>

<button class="add-family-member-button" on:click={() => showAddMemberModal.set(true)}></button>

<style lang="scss">
  .add-family-member-button {
    --fab-shadow-rest: 6px 6px 12px #bebebe, -6px -6px 12px #ffffff;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #e0e0e0;
    box-shadow: var(--fab-shadow-rest);
    border: none;
    cursor: pointer;
    transition:
      box-shadow var(--neumo-shadow-transition-duration) var(--neumo-shadow-transition-ease),
      background-color 0.22s var(--motion-standard);

    &::before {
      content: '+';
      font-size: 30px;
      color: #333;
    }
  }
</style>
