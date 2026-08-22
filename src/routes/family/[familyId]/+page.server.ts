import { actions as baseActions, load as baseLoad } from '../../+page.server'
import type { Actions, PageServerLoad } from './$types'

const withFamilySearchParam = (url: URL, familyId: string) => {
  const next = new URL(url)
  next.searchParams.set('family', familyId)
  return next
}

const delegatedLoad = baseLoad as unknown as (event: Parameters<PageServerLoad>[0]) => ReturnType<PageServerLoad>

export const load: PageServerLoad = async (event) => {
  // Reuse the existing tree loader while scoping it to the family in the route path.
  return delegatedLoad({
    ...event,
    url: withFamilySearchParam(event.url, event.params.familyId)
  })
}

export const actions: Actions = baseActions as unknown as Actions
