import { createDashboardActions, loadDashboardPage } from '$lib/server/feedPage'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  return loadDashboardPage(event)
}

export const actions: Actions = createDashboardActions()
