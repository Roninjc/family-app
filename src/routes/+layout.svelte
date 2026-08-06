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
  .signup-notice {
    position: fixed;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2000;
    max-width: min(92vw, 680px);
    padding: 10px 14px;
    border-radius: 10px;
    background: #fff3cd;
    color: #5f4500;
    border: 1px solid #f6df96;
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
    font-size: 0.9rem;
    line-height: 1.35;
    text-align: center;
  }
</style>
