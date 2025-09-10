<script lang="ts">
  import { showAddMemberModal } from '../stores/modals'
</script>

<button class="add-family-member-button" on:click={() => showAddMemberModal.set(true)}></button>

<style lang="scss">
  .add-family-member-button {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translate(-50%, 50%);
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background: #e0e0e0;
    box-shadow:
      6px 6px 12px #bebebe,
      -6px -6px 12px #ffffff;
    border: none;

    &::before {
      content: '+';
      font-size: 30px;
      color: #333;
    }
  }
</style>
