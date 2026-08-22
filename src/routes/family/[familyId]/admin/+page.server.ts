import { actions as baseActions, load as baseLoad } from '../../../admin/+page.server'
import { ACTIVE_FAMILY_COOKIE } from '$lib/server/activeFamily'
import type { Actions, PageServerLoad } from './$types'

const delegatedLoad = baseLoad as unknown as (event: Parameters<PageServerLoad>[0]) => ReturnType<PageServerLoad>

export const load: PageServerLoad = async (event) => {
  event.cookies.set(ACTIVE_FAMILY_COOKIE, event.params.familyId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
    sameSite: 'lax'
  })

  return delegatedLoad({
    ...event
  })
}

export const actions: Actions = baseActions as unknown as Actions
