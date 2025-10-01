<script lang="ts">
  import { showAddMemberModal } from '../stores/modals'
  import LiquidGlassWrapper from './liquidGlassWrapper.svelte'

  let showAddMemberModalValue = false
  showAddMemberModal.subscribe((value) => (showAddMemberModalValue = value))

  let name = ''
  let familyName = ''
</script>

{#if showAddMemberModalValue}
  <div
    class="add-member-modal-backdrop"
    role="button"
    tabindex="0"
    aria-label="Close add family member modal"
    on:click|stopPropagation={() => showAddMemberModal.set(false)}
    on:keydown={(e) => {
      if (e.key === 'Escape') showAddMemberModal.set(false)
    }}
  >
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div class="add-member-modal" role="banner" on:click|stopPropagation>
      <!-- <button class="close-modal" on:click={() => showAddMemberModal.set(false)}>⨯</button> -->
      <LiquidGlassWrapper>
        <h2>New Family Member</h2>
        <form>
          <input class="modern-input" type="text" bind:value={name} placeholder="Name" required />
          <input
            class="modern-input"
            type="text"
            bind:value={familyName}
            placeholder="Family name"
            required
          />

          <!-- TODO: Completar formulario con mas pasos y mas info -->

          <!-- <input type="text" id="last-name" name="last-name" required /> -->
          <button type="submit">Add</button>
        </form>
      </LiquidGlassWrapper>
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
        <!-- Seeds: 14, 17,  -->

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
{/if}

<style lang="scss">
  .add-member-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.4);
    z-index: 999;

    .add-member-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      border-radius: 16px;
      background-color: rgba(255, 255, 255, 0.3);
      z-index: 1000;

      h2 {
        margin-top: 0;
        text-wrap: nowrap;
      }

      form {
        display: flex;
        flex-direction: column;

        label {
          margin-bottom: 8px;
        }
        .modern-input {
          padding: 0.5rem 0.75rem;
          margin-bottom: 1rem;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          background: #fafafa;
          font-size: 1rem;
          transition:
            border-color 0.2s,
            box-shadow 0.2s;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
          &:focus {
            outline: none;
            border-color: #7c3aed;
            box-shadow: 0 2px 8px rgba(124, 58, 237, 0.12);
            background: #fff;
          }
        }

        button[type='submit'] {
          padding: 10px;
          background-color: #16a31aa0;
          color: white;
          border: none;
          border-radius: 9px;
          transition: ease 0.3s;
          cursor: pointer;

          &:hover {
            background-color: #39893daa;
          }
        }
      }
    }

    :global(.add-member-modal .liquid-glass-text-container) {
      flex-direction: column;
      padding: 40px 25px 25px;
    }
  }
</style>
