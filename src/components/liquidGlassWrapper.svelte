<script lang="ts">
  export let rounded: boolean = false
</script>

<div class="liquid-glass-wrapper round-corners" class:rounded>
  <div class="liquid-glass-effect round-corners" class:rounded></div>
  <div class="liquid-glass-tint round-corners" class:rounded></div>
  <div class="liquid-glass-shine round-corners" class:rounded></div>
  <div class="liquid-glass-text-container">
    <slot />
  </div>
  <svg style="display: none">
    <filter
      id="glass-distortion"
      x="0%"
      y="0%"
      width="100%"
      height="100%"
      filterUnits="objectBoundingBox"
    >
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.01 0.01"
        numOctaves="1"
        seed="5"
        result="turbulence"
      />

      <feComponentTransfer in="turbulence" result="mapped">
        <feFuncR type="gamma" amplitude="1" exponent="10" offset="0.5" />
        <feFuncG type="gamma" amplitude="0" exponent="1" offset="0" />
        <feFuncB type="gamma" amplitude="0" exponent="1" offset="0.5" />
      </feComponentTransfer>

      <feGaussianBlur in="turbulence" stdDeviation="3" result="softMap" />

      <feSpecularLighting
        in="softMap"
        surfaceScale="5"
        specularConstant="1"
        specularExponent="100"
        lighting-color="white"
        result="specLight"
      >
        <fePointLight x="-200" y="-200" z="300" />
      </feSpecularLighting>

      <feComposite
        in="specLight"
        operator="arithmetic"
        k1="0"
        k2="1"
        k3="1"
        k4="0"
        result="litImage"
      />

      <feDisplacementMap
        in="SourceGraphic"
        in2="softMap"
        scale="150"
        xChannelSelector="R"
        yChannelSelector="G"
      />
    </filter>
  </svg>
</div>

<style lang="scss">
  .liquid-glass-wrapper {
    position: relative;
    display: flex;
    font-weight: 600;
    color: var(--text-main);
    cursor: default;
    background: var(--neu-surface);
    border: none;
    box-shadow: var(--neu-shadow-out);
    backdrop-filter: none;
    transition:
      box-shadow 0.25s var(--motion-standard),
      transform 0.25s var(--motion-standard);
  }

  .liquid-glass-effect {
    display: none;
  }

  .liquid-glass-tint {
    display: none;
  }

  .liquid-glass-shine {
    display: none;
  }

  .liquid-glass-text-container {
    z-index: 3;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }

  .round-corners {
    border-radius: 9px;
  }

  .rounded {
    border-radius: 50%;
  }
</style>
