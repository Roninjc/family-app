const appendQueryParam = (urlPath: string, key: string, value: string) => {
  const separator = urlPath.includes('?') ? '&' : '?'
  return `${urlPath}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`
}

const RECENT_SIGNUP_WINDOW_MS = 10 * 60 * 1000

const isRecentSignup = (user: { created_at?: string; last_sign_in_at?: string }) => {
  if (!user.created_at || !user.last_sign_in_at) return false

  const createdAt = Date.parse(user.created_at)
  const lastSignInAt = Date.parse(user.last_sign_in_at)

  if (Number.isNaN(createdAt) || Number.isNaN(lastSignInAt)) return false

  return Math.abs(lastSignInAt - createdAt) <= RECENT_SIGNUP_WINDOW_MS
}

const extractFamilyName = (families: unknown): string | null => {
  if (!families || typeof families !== 'object') return null

  if (Array.isArray(families)) {
    const first = families[0]
    if (first && typeof first === 'object' && 'name' in first && typeof first.name === 'string') {
      return first.name
    }

    return null
  }

  if ('name' in families && typeof families.name === 'string') {
    return families.name
  }

  return null
}

export const withSignupNotice = async (
  supabase: App.Locals['supabase'],
  nextPath: string
): Promise<string> => {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return nextPath

  let nextWithNotice = nextPath

  const { data: profile } = await supabase
    .from('profiles')
    .select('pending_notice')
    .eq('id', user.id)
    .single()

  const pendingNotice = profile?.pending_notice

  if (pendingNotice) {
    await supabase.from('profiles').update({ pending_notice: null }).eq('id', user.id)
    nextWithNotice = appendQueryParam(nextWithNotice, 'signup_notice', pendingNotice)
  }

  if (!isRecentSignup(user)) return nextWithNotice

  const { data: memberships } = await supabase
    .from('family_memberships')
    .select('role, families(name)')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  const membership = memberships?.[0]

  if (!membership?.role) return nextWithNotice

  if (!pendingNotice) {
    nextWithNotice = appendQueryParam(nextWithNotice, 'signup_notice', 'invitation_accepted')
  }

  nextWithNotice = appendQueryParam(nextWithNotice, 'signup_role', membership.role)

  const familyName = extractFamilyName(membership.families)

  if (familyName) {
    nextWithNotice = appendQueryParam(nextWithNotice, 'signup_family', familyName)
  }

  return nextWithNotice
}
