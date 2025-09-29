<script lang="ts">
  export let width = '60px'
</script>

<div
  class="footer-button-wrapper"
  style="width: {width}; height: {width}; border-radius: calc({width} / 2);"
>
  <slot />
</div>

<style lang="scss">
  .footer-button-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    background: #e0e0e0;
    transform: translateY(50%);
    pointer-events: auto;
  }
</style>
