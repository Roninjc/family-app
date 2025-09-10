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
    <div class="footer-bar"></div>
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
      }
    }
  }
</style>
