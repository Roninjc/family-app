<script lang="ts">
  import { showAddMemberModal } from '../stores/modals'

  let showAddMemberModalValue = false
  showAddMemberModal.subscribe((value) => (showAddMemberModalValue = value))

  // Variables para los inputs modernos
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
      <h2>New Family Member</h2>
      <form>
        <input class="modern-input" type="text" bind:value={name} placeholder="Name" required />
        <input
          class="modern-input"
          type="text"
          bind:value={familyName}
          placeholder="Last name"
          required
        />

        <!-- TODO: Completar formulario con mas pasos y mas info -->

        <!-- <input type="text" id="last-name" name="last-name" required /> -->
        <button type="submit">Add</button>
      </form>
    </div>
  </div>
{/if}

<style lang="scss">
  .add-member-modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(255, 255, 255, 0.6);
    z-index: 999;

    .add-member-modal {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 40px 25px 25px;
      border-radius: 16px;
      backdrop-filter: blur(9px);
      background-color: rgba(255, 255, 255, 0.3);
      box-shadow: 0px 0px 20px 9px rgba(88, 88, 88, 0.2);
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

      // .close-modal {
      //   position: absolute;
      //   top: 10px;
      //   right: 10px;
      //   border: none;
      //   background: transparent;
      //   transition: ease 0.3s;
      //   cursor: pointer;

      //   &:hover {
      //     scale: 1.3;
      //   }
      // }
    }
  }
</style>
