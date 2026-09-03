<script lang="ts">
  import type { AdminPageData, AdminPageForm } from '../../../../components/admin/types'
  import FamilyAdminPage from '../../../admin/+page.svelte'

  export let data: AdminPageData
  export let form: AdminPageForm
  export let params: Record<string, string> = {}
</script>

<FamilyAdminPage {data} {form} {params} />
