import { createServerClient } from '@supabase/ssr'
import { redirect, type Handle } from '@sveltejs/kit'
import { sequence } from '@sveltejs/kit/hooks'
import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from '$env/static/public'
import { isMockFamilyMode } from '$lib/server/mockMode'
import type { Session } from '@supabase/supabase-js'

const supabase: Handle = async ({ event, resolve }) => {
  event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => {
        try {
          return event.cookies.getAll()
        } catch {
          return []
        }
      },
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            event.cookies.set(name, value, { ...options, path: '/' })
          })
        } catch {
          // Ignore cookie mutations if headers have already been sent or context is read-only
        }
      }
    }
  })

  // Use getUser() so auth is validated by Supabase Auth server.
  event.locals.safeGetSession = async () => {
    try {
      const {
        data: { user },
        error
      } = await event.locals.supabase.auth.getUser()

      if (error || !user) return { session: null, user: null }

      // The app only needs authenticated user checks in server hooks.
      return { session: null as Session | null, user }
    } catch {
      // Treat transient auth transport errors as unauthenticated request.
      return { session: null as Session | null, user: null }
    }
  }

  return resolve(event, {
    filterSerializedResponseHeaders(name) {
      return name === 'content-range' || name === 'x-supabase-api-version'
    }
  })
}

const authGuard: Handle = async ({ event, resolve }) => {
  const { user } = await event.locals.safeGetSession()
  event.locals.session = null
  event.locals.user = user

  const isAuthRoute =
    event.url.pathname.startsWith('/login') || event.url.pathname.startsWith('/auth')

  if (!user && !isAuthRoute && !isMockFamilyMode()) {
    throw redirect(303, '/login')
  }

  if (user && event.url.pathname === '/login') {
    throw redirect(303, '/hub')
  }

  return resolve(event)
}

export const handle = sequence(supabase, authGuard)
