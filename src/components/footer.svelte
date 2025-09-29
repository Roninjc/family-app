<script lang="ts">
  import ButtonWrapper from './buttonWrapper.svelte'
  import AddFamilyMemberButton from './addFamilyMemberButton.svelte'
</script>

<footer>
  <div class="footer-content">
    <div class="footer-buttons-container">
      <ButtonWrapper width="80px">
        <AddFamilyMemberButton />
      </ButtonWrapper>
    </div>
    <div class="footer-bar">
      <div class="footer-bar-container"></div>
      <div class="footer-bar-container">Profile</div>
    </div>
  </div>
</footer>

<style lang="scss">
  footer {
    position: sticky;
    bottom: 0;
    height: 100px;
    z-index: 2;
    display: flex;
    align-items: flex-end;
    pointer-events: none;

    .footer-content {
      position: relative;
      width: 100%;
      filter: drop-shadow(0px 0px 10px rgba(0, 0, 0, 0.5));
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;

      .footer-buttons-container {
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
      }

      .footer-bar {
        width: 100%;
        height: 50px;
        background: #e0e0e0;
        display: flex;
        justify-content: space-evenly;
        pointer-events: auto;

        .footer-bar-container {
          flex: 1 0 0;
          display: flex;
          justify-content: center;
          align-items: center;
          cursor: pointer;
        }
      }
    }
  }
</style>
