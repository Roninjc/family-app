import { createAdminActions, loadAdminPage } from '$lib/server/adminPage'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  return loadAdminPage(event)
}

export const actions: Actions = createAdminActions()
