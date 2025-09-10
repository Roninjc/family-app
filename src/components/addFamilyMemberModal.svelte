<script lang="ts">
  import { showAddMemberModal } from '../stores/modals'

  let showAddMemberModalValue = false
  showAddMemberModal.subscribe((value) => (showAddMemberModalValue = value))
</script>

{#if showAddMemberModalValue}
  <div class="add-member-modal">
    <h2>Add Family Member</h2>
    <form>
      <label for="name">Name:</label>
      <input type="text" id="name" name="name" required />
      <button type="submit">Add</button>
    </form>
    <button on:click={() => showAddMemberModal.set(false)}>Cancel</button>
  </div>
{/if}

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

  .add-member-modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    padding: 20px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    border-radius: 8px;
    z-index: 1000;

    h2 {
      margin-top: 0;
    }

    form {
      display: flex;
      flex-direction: column;

      label {
        margin-bottom: 8px;
      }

      input {
        margin-bottom: 16px;
        padding: 8px;
        border: 1px solid #ccc;
        border-radius: 4px;
      }

      button[type='submit'] {
        padding: 10px;
        background-color: #4caf50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;

        &:hover {
          background-color: #45a049;
        }
      }
    }

    button {
      margin-top: 10px;
      padding: 10px;
      background-color: #f44336;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;

      &:hover {
        background-color: #da190b;
      }
    }
  }
</style>
