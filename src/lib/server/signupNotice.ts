const appendQueryParam = (urlPath: string, key: string, value: string) => {
  const separator = urlPath.includes('?') ? '&' : '?'
  return `${urlPath}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`
}

export const withSignupNotice = async (
  supabase: App.Locals['supabase'],
  nextPath: string
): Promise<string> => {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) return nextPath

  const { data: profile } = await supabase
    .from('profiles')
    .select('pending_notice')
    .eq('id', user.id)
    .single()

  const pendingNotice = profile?.pending_notice

  if (!pendingNotice) return nextPath

  await supabase.from('profiles').update({ pending_notice: null }).eq('id', user.id)

  return appendQueryParam(nextPath, 'signup_notice', pendingNotice)
}
