<script lang="ts">
  import { showAddMemberModal } from '../stores/modals'
  import LiquidGlassWrapper from './liquidGlassWrapper.svelte'
  // import ButtonWrapper from './buttonWrapper.svelte'
  // import AddFamilyMemberButton from './addFamilyMemberButton.svelte'
</script>

<footer>
  <LiquidGlassWrapper rounded={true}>
    <button class="footer-button profile-button"></button>
  </LiquidGlassWrapper>
  <LiquidGlassWrapper rounded={true}>
    <button
      class="footer-button add-family-member-button"
      on:click={() => showAddMemberModal.set(true)}
    ></button>
  </LiquidGlassWrapper>
</footer>

<style lang="scss">
  footer {
    position: sticky;
    bottom: 0;
    z-index: 2;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    padding: 1rem;
    border-radius: 9px;
    pointer-events: none;
    background: linear-gradient(to top, #e0e0e0 0%, transparent 60%);

    .footer-button {
      color: #333;
      border: none;
      width: 50px;
      height: 50px;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 0;
      background: none;
      pointer-events: auto;
      font: inherit;
      cursor: pointer;
    }

    .profile-button {
      &::before {
        content: '♟';
        font-size: 30px;
      }
    }

    .add-family-member-button {
      cursor: copy;

      &::before {
        content: '+';
        font-size: 30px;
      }
    }
  }
</style>
