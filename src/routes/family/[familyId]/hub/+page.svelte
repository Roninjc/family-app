<script lang="ts">
  import FamilyHubPage from '../../../hub/+page.svelte'

  export let data: any
  export let form: any
  export let params: Record<string, string> = {}
</script>

<FamilyHubPage {data} {form} {params} />
