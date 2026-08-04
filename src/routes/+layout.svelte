<script lang="ts">
  import { invalidate } from '$app/navigation'
  import { onMount } from 'svelte'

  export let data

  $: ({ supabase, session } = data)

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

<slot />
