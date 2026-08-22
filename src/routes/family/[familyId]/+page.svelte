<script lang="ts">
  import FamilyTreePage from '../../+page.svelte'

  export let data: any
  export let params: Record<string, string> = {}
</script>

<FamilyTreePage {data} {params} />
