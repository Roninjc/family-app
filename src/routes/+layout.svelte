<script lang="ts">
  import { invalidate } from '$app/navigation'
  import { page } from '$app/stores'
  import { onMount } from 'svelte'

  export let data

  $: ({ supabase, session } = data)
  $: signupNoticeCode = $page.url.searchParams.get('signup_notice')
  $: signupNoticeMessage =
    signupNoticeCode === 'member_link_already_claimed'
      ? 'Tu cuenta se creó correctamente, pero ese miembro ya está vinculado a otra cuenta.'
      : null

  onMount(() => {
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (newSession?.expires_at !== session?.expires_at) {
        invalidate('supabase:auth')
      }
    })

    return () => subscription.unsubscribe()
  })
</script>

{#if signupNoticeMessage}
  <div class="signup-notice" role="status">
    {signupNoticeMessage}
  </div>
{/if}

<slot />

<style lang="scss">
  :global(:root) {
    --app-bg:
      radial-gradient(circle at 12% 14%, rgba(250, 231, 204, 0.7), transparent 32%),
      radial-gradient(circle at 88% 8%, rgba(201, 224, 241, 0.62), transparent 30%),
      #e7e7e7;
    --surface-soft: rgba(255, 255, 255, 0.34);
    --surface-strong: rgba(255, 255, 255, 0.56);
    --text-main: #2a2a31;
    --text-muted: #63636b;
    --brand: #1f4f7b;
    --ok: #267a5f;
    --danger: #b23333;
    --field-border: #d8dae0;
    --field-bg: #f8f9fb;
  }

  :global(html),
  :global(body) {
    min-height: 100%;
  }

  :global(body) {
    margin: 0;
    background: var(--app-bg);
    color: var(--text-main);
    font-family: 'Avenir Next', 'Gill Sans', 'Trebuchet MS', 'Noto Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;
  }

  :global(*) {
    box-sizing: border-box;
  }

  .signup-notice {
    position: fixed;
    top: max(10px, env(safe-area-inset-top));
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    max-width: min(92vw, 680px);
    padding: 10px 14px;
    border-radius: 12px;
    background: #fff3cd;
    color: #5f4500;
    border: 1px solid #f6df96;
    box-shadow: 0 10px 24px rgba(36, 23, 0, 0.13);
    font-size: 0.9rem;
    line-height: 1.35;
    text-align: center;
  }
</style>
