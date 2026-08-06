import { createServerClient } from '@supabase/ssr'
import { redirect, type Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public'
import { isMockFamilyMode } from '$lib/server/mockMode'

const supabase: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => event.cookies.getAll(),
      setAll: (cookiesToSet) => {
        cookiesToSet.forEach(({ name, value, options }) => {
          event.cookies.set(name, value, { ...options, path: '/' })
        })
      }
    }
  })

  // getSession() alone reads the (unverified) cookie; getUser() validates the
  // JWT against the auth server, so only trust the pair together.
  event.locals.safeGetSession = async () => {
    const {
      data: { session }
    } = await event.locals.supabase.auth.getSession()

    if (!session) return { session: null, user: null }

    const {
      data: { user },
      error
    } = await event.locals.supabase.auth.getUser()

    if (error || !user) return { session: null, user: null }

    return { session, user }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    }
  })
}

const authGuard: Handle = async ({ event, resolve }) => {
  const { session, user } = await event.locals.safeGetSession()
  event.locals.session = session
  event.locals.user = user

  const isAuthRoute =
    event.url.pathname.startsWith('/login') || event.url.pathname.startsWith('/auth')

  if (!session && !isAuthRoute && !isMockFamilyMode()) {
    redirect(303, '/login')
  }

  if (session && event.url.pathname === '/login') {
    redirect(303, '/')
  }

  return resolve(event)
}

export const handle = sequence(supabase, authGuard)
