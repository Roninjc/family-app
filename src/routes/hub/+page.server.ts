import { createHubActions, loadHubPage } from '$lib/server/hubPage'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  return loadHubPage(event)
}

export const actions: Actions = createHubActions()
