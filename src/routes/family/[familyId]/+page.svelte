<script lang="ts">
  import type { PageData } from './$types'
  import FamilyTreePage from '../../+page.svelte'

  export let data: PageData
  export let params: Record<string, string> = {}
</script>

<FamilyTreePage {data} {params} />
