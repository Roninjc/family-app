import { createTreeActions, loadTreePage } from '$lib/server/treePage'
import type { Actions, PageServerLoad } from './$types'

export const load: PageServerLoad = async (event) => {
  return loadTreePage(event)
}

export const actions: Actions = createTreeActions()
