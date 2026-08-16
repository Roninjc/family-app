import { fail, redirect } from '@sveltejs/kit'
import type { Cookies } from '@sveltejs/kit'
import { mockFamilyData } from '$lib/data/mockFamily'
import {
  ACTIVE_FAMILY_COOKIE,
  loadUserFamilies,
  resolveAndPersistActiveFamily
} from '$lib/server/activeFamily'
import {
  buildFamilyGroups,
  resolveActiveFamilyId,
  toRowsFromFamilyData
} from '$lib/server/familyGroups'
import { isMockFamilyMode } from '$lib/server/mockMode'
import type { Role } from '$lib/types/auth'
import type { Actions, PageServerLoad } from './$types'

const isManagerRole = (role: Role) => role === 'admin' || role === 'editor'

const notesForFamily = (familyName: string, membersCount: number) => [
  {
    id: 'n1',
    title: `Resumen de ${familyName}`,
    body: `${membersCount} miembros en esta rama. Puedes abrir su árbol para revisar relaciones.`,
    noteType: 'news' as const
  },
  {
    id: 'n2',
    title: 'Notas internas',
    body: 'Comparte acuerdos, pendientes y recordatorios importantes para esta familia.',
    noteType: 'note' as const
  }
]

type HubNote = {
  id: string
  title: string
  body: string
  noteType: 'news' | 'note'
  createdAt: string | null
}

const noteTypeRank = (noteType: HubNote['noteType']) => (noteType === 'news' ? 0 : 1)

const toMillis = (createdAt: string | null) => {
  if (!createdAt) return 0
  const time = new Date(createdAt).getTime()
  return Number.isFinite(time) ? time : 0
}

const compareHubNotes = (left: HubNote, right: HubNote) => {
  const typeDiff = noteTypeRank(left.noteType) - noteTypeRank(right.noteType)
  if (typeDiff !== 0) return typeDiff

  const dateDiff = toMillis(right.createdAt) - toMillis(left.createdAt)
  if (dateDiff !== 0) return dateDiff

  return left.title.localeCompare(right.title, 'es')
}

const resolveFamilyForAction = async (options: {
  supabase: App.Locals['supabase']
  userId: string
  cookies: Cookies
  requestedFamilyId: string | null
}) => {
  const families = await loadUserFamilies(options.supabase, options.userId)
  const activeFamilyId = resolveAndPersistActiveFamily({
    families,
    requestedFamilyId: options.requestedFamilyId,
    cookieFamilyId: options.cookies.get(ACTIVE_FAMILY_COOKIE) ?? null,
    cookies: options.cookies
  })

  const activeFamily = families.find((family) => family.id === activeFamilyId) ?? null

  return {
    families,
    activeFamilyId,
    activeFamily
  }
}

export const load: PageServerLoad = async ({ locals: { supabase, user }, cookies, url }) => {
  if (isMockFamilyMode()) {
    const rows = toRowsFromFamilyData(mockFamilyData)
    const groups = buildFamilyGroups(rows.members, rows.relationships)
    const families = groups.map((group) => ({
      id: group.id,
      name: group.name,
      role: 'editor' as Role,
      membersCount: group.membersCount,
      linksCount: group.linksCount,
      previewMembers: group.previewMembers,
      canManageNotes: true,
      notes: notesForFamily(group.name, group.membersCount),
      treeHref: `/?family=${encodeURIComponent(group.id)}`
    }))

    const activeFamilyId = resolveActiveFamilyId(
      families.map((family) => family.id),
      url.searchParams.get('family'),
      cookies.get(ACTIVE_FAMILY_COOKIE) ?? null
    )

    if (activeFamilyId && activeFamilyId !== cookies.get(ACTIVE_FAMILY_COOKIE)) {
      cookies.set(ACTIVE_FAMILY_COOKIE, activeFamilyId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 180,
        sameSite: 'lax'
      })
    }

    return {
      displayName: 'Modo mock',
      role: 'editor' as Role,
      families,
      activeFamilyId,
      activeFamilyName: families.find((family) => family.id === activeFamilyId)?.name ?? null,
      pendingInvitations: 0,
      showPendingInvitations: true
    }
  }

  if (!user) redirect(303, '/login')

  const [profileRes, userFamilies] = await Promise.all([
    supabase.from('profiles').select('display_name, role').eq('id', user.id).single(),
    loadUserFamilies(supabase, user.id)
  ])

  const role = (profileRes.data?.role ?? 'viewer') as Role

  const activeFamilyId = resolveAndPersistActiveFamily({
    families: userFamilies,
    requestedFamilyId: url.searchParams.get('family'),
    cookieFamilyId: cookies.get(ACTIVE_FAMILY_COOKIE) ?? null,
    cookies
  })

  const familyIds = userFamilies.map((family) => family.id)
  const [membersRes, notesRes] = await Promise.all([
    familyIds.length > 0
      ? supabase.from('members').select('id, name, family_id').in('family_id', familyIds)
      : Promise.resolve({ data: [], error: null }),
    familyIds.length > 0
      ? supabase
          .from('family_notes')
          .select('id, family_id, title, body, note_type, created_at')
          .in('family_id', familyIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null })
  ])

  const countByFamily = new Map<string, number>()
  const previewByFamily = new Map<string, string[]>()

  for (const member of membersRes.data ?? []) {
    countByFamily.set(member.family_id, (countByFamily.get(member.family_id) ?? 0) + 1)
    const preview = previewByFamily.get(member.family_id) ?? []
    if (preview.length < 5) preview.push(member.name)
    previewByFamily.set(member.family_id, preview)
  }

  const notesByFamily = new Map<string, HubNote[]>()
  for (const note of notesRes.data ?? []) {
    const collection = notesByFamily.get(note.family_id) ?? []
    collection.push({
      id: note.id,
      title: note.title,
      body: note.body,
      noteType: note.note_type === 'news' ? 'news' : 'note',
      createdAt: note.created_at ?? null
    })
    notesByFamily.set(note.family_id, collection)
  }

  for (const [familyId, notes] of notesByFamily) {
    notesByFamily.set(familyId, [...notes].sort(compareHubNotes))
  }

  const families = userFamilies.map((family) => ({
    id: family.id,
    name: family.name,
    role: family.role,
    membersCount: countByFamily.get(family.id) ?? 0,
    linksCount: 0,
    previewMembers: previewByFamily.get(family.id) ?? [],
    canManageNotes: family.role === 'admin' || family.role === 'editor',
    notes:
      notesByFamily.get(family.id)?.map(({ createdAt: _createdAt, ...note }) => note) ??
      notesForFamily(family.name, countByFamily.get(family.id) ?? 0),
    treeHref: `/?family=${encodeURIComponent(family.id)}`
  }))

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
    displayName: profileRes.data?.display_name?.trim() || user.email?.split('@')[0] || 'Familiar',
    role,
    families,
    activeFamilyId,
    activeFamilyName: families.find((family) => family.id === activeFamilyId)?.name ?? null,
    pendingInvitations,
    showPendingInvitations: isManagerRole(role)
  }
}

export const actions: Actions = {
  createNote: async ({ request, locals: { supabase, user }, cookies }) => {
    if (!user) redirect(303, '/login')
    if (isMockFamilyMode()) {
      return fail(400, {
        noteError:
          'Estás en modo mock. Las notas no se guardan. Usa el modo normal para persistir cambios.'
      })
    }

    const form = await request.formData()
    const requestedFamilyId = String(form.get('familyId') ?? '').trim() || null
    const title = String(form.get('title') ?? '').trim()
    const body = String(form.get('body') ?? '').trim()
    const noteTypeRaw = String(form.get('noteType') ?? 'note').trim()
    const noteType = noteTypeRaw === 'news' ? 'news' : 'note'

    if (!title)
      return fail(400, { noteError: 'El título es obligatorio.', familyId: requestedFamilyId })
    if (!body)
      return fail(400, { noteError: 'El contenido es obligatorio.', familyId: requestedFamilyId })

    const { activeFamily, activeFamilyId } = await resolveFamilyForAction({
      supabase,
      userId: user.id,
      cookies,
      requestedFamilyId
    })

    if (!activeFamilyId || !activeFamily) {
      return fail(400, {
        noteError: 'No hay una familia activa válida.',
        familyId: requestedFamilyId
      })
    }

    const { error } = await supabase.from('family_notes').insert({
      family_id: activeFamilyId,
      title,
      body,
      note_type: noteType,
      created_by: user.id
    })

    if (error) {
      const message = /row-level security/i.test(error.message)
        ? 'No tienes permisos para crear notas en esta familia.'
        : error.message
      return fail(403, { noteError: message, familyId: activeFamilyId })
    }

    return { noteCreated: true, familyId: activeFamilyId }
  },

  updateNote: async ({ request, locals: { supabase, user }, cookies }) => {
    if (!user) redirect(303, '/login')
    if (isMockFamilyMode()) {
      return fail(400, {
        noteError:
          'Estás en modo mock. Las notas no se guardan. Usa el modo normal para persistir cambios.'
      })
    }

    const form = await request.formData()
    const requestedFamilyId = String(form.get('familyId') ?? '').trim() || null
    const noteId = String(form.get('noteId') ?? '').trim()
    const title = String(form.get('title') ?? '').trim()
    const body = String(form.get('body') ?? '').trim()
    const noteTypeRaw = String(form.get('noteType') ?? 'note').trim()
    const noteType = noteTypeRaw === 'news' ? 'news' : 'note'

    if (!noteId)
      return fail(400, { noteError: 'Falta la nota a editar.', familyId: requestedFamilyId })
    if (!title)
      return fail(400, { noteError: 'El título es obligatorio.', familyId: requestedFamilyId })
    if (!body)
      return fail(400, { noteError: 'El contenido es obligatorio.', familyId: requestedFamilyId })

    const { activeFamily, activeFamilyId } = await resolveFamilyForAction({
      supabase,
      userId: user.id,
      cookies,
      requestedFamilyId
    })

    if (!activeFamilyId || !activeFamily) {
      return fail(400, {
        noteError: 'No hay una familia activa válida.',
        familyId: requestedFamilyId
      })
    }

    const { error } = await supabase
      .from('family_notes')
      .update({ title, body, note_type: noteType })
      .eq('id', noteId)
      .eq('family_id', activeFamilyId)

    if (error) {
      const message = /row-level security/i.test(error.message)
        ? 'No tienes permisos para editar notas en esta familia.'
        : error.message
      return fail(403, { noteError: message, familyId: activeFamilyId })
    }

    return { noteUpdated: true, familyId: activeFamilyId }
  },

  deleteNote: async ({ request, locals: { supabase, user }, cookies }) => {
    if (!user) redirect(303, '/login')
    if (isMockFamilyMode()) {
      return fail(400, {
        noteError:
          'Estás en modo mock. Las notas no se guardan. Usa el modo normal para persistir cambios.'
      })
    }

    const form = await request.formData()
    const requestedFamilyId = String(form.get('familyId') ?? '').trim() || null
    const noteId = String(form.get('noteId') ?? '').trim()

    if (!noteId)
      return fail(400, { noteError: 'Falta la nota a eliminar.', familyId: requestedFamilyId })

    const { activeFamily, activeFamilyId } = await resolveFamilyForAction({
      supabase,
      userId: user.id,
      cookies,
      requestedFamilyId
    })

    if (!activeFamilyId || !activeFamily) {
      return fail(400, {
        noteError: 'No hay una familia activa válida.',
        familyId: requestedFamilyId
      })
    }

    const { error } = await supabase
      .from('family_notes')
      .delete()
      .eq('id', noteId)
      .eq('family_id', activeFamilyId)

    if (error) {
      const message = /row-level security/i.test(error.message)
        ? 'No tienes permisos para eliminar notas en esta familia.'
        : error.message
      return fail(403, { noteError: message, familyId: activeFamilyId })
    }

    return { noteDeleted: true, familyId: activeFamilyId }
  }
}
