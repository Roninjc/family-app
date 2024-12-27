<script lang="ts">
</script>

<div class="add-family-member-button"></div>

<style lang="scss">
  .add-family-member-button {
    position: absolute;
    top: 1rem;
    right: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 50px;
    height: 50px;
    border-radius: 10px;
    background: #e0e0e0;
    box-shadow:
      6px 6px 12px #bebebe,
      -6px -6px 12px #ffffff;
    z-index: 2;
  }

  .add-family-member-button::before {
    content: '+';
    font-size: 30px;
    color: #333;
  }
</style>
