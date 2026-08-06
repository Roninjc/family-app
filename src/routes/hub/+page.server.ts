import { redirect } from '@sveltejs/kit'
import { isMockFamilyMode } from '$lib/server/mockMode'
import type { Role } from '$lib/types/auth'
import type { PageServerLoad } from './$types'

const isManagerRole = (role: Role) => role === 'admin' || role === 'editor'

const defaultNotes = [
  {
    id: 'n1',
    title: 'Bienvenida al nuevo hub familiar',
    body: 'Desde aquí podrás entrar a tus árboles, revisar invitaciones y ver avisos importantes.'
  },
  {
    id: 'n2',
    title: 'Próxima mejora: multiárbol',
    body: 'En esta etapa el selector muestra un árbol principal, y estamos preparando soporte para varios árboles.'
  }
]

export const load: PageServerLoad = async ({ locals: { supabase, user } }) => {
  if (isMockFamilyMode()) {
    return {
      displayName: 'Modo mock',
      role: 'editor' as Role,
      trees: [{ id: 'main', name: 'Árbol principal', membersCount: null, isPrimary: true }],
      pendingInvitations: 0,
      showPendingInvitations: true,
      notes: defaultNotes
    }
  }

  if (!user) redirect(303, '/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role ?? 'viewer') as Role

  const { count: membersCount } = await supabase.from('members').select('*', { count: 'exact', head: true })

  let pendingInvitations = 0
  if (isManagerRole(role)) {
    const { data: invitations } = await supabase
      .from('invitations')
      .select('id, expires_at, revoked_at')
      .is('revoked_at', null)

    const now = Date.now()
    pendingInvitations = (invitations ?? []).filter((invite) => {
      if (!invite.expires_at) return true
      return new Date(invite.expires_at).getTime() > now
    }).length
  }

  return {
    displayName: profile?.display_name?.trim() || user.email?.split('@')[0] || 'Familiar',
    role,
    trees: [
      {
        id: 'main',
        name: 'Árbol principal',
        membersCount,
        isPrimary: true
      }
    ],
    pendingInvitations,
    showPendingInvitations: isManagerRole(role),
    notes: defaultNotes
  }
}
