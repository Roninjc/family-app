<script lang="ts">
  import FamilyAdminPage from '../../../admin/+page.svelte'

  export let data: any
  export let form: any
  export let params: Record<string, string> = {}
</script>

<FamilyAdminPage {data} {form} {params} />
