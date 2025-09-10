<script lang="ts">
  export let width = '60px'
</script>

<div
  class="footer-button-wrapper"
  style="width: {width}; height: calc({width} / 2); border-radius: calc({width} / 2) calc({width} / 2) 0 0;"
>
  <slot />
</div>

<style lang="scss">
  .footer-button-wrapper {
    position: relative;
    background: #e0e0e0;
  }
</style>
