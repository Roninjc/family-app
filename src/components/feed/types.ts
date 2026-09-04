export type DashboardNoteType = 'news' | 'note'

export type DashboardNotesFilter = 'all' | 'news' | 'note'

export type DashboardNote = {
  id: string
  title: string
  body: string
  noteType: DashboardNoteType
}

export type DashboardFamilySummary = {
  id: string
  name: string
  role?: 'admin' | 'editor' | 'viewer'
  membersCount: number
  linksCount: number
  previewMembers: string[]
  canManageNotes: boolean
  notes: DashboardNote[]
  treeHref: string
}

export type DashboardActionFormState = {
  noteCreated?: boolean
  noteUpdated?: boolean
  noteDeleted?: boolean
  noteError?: string
  familyId?: string
}

export type DashboardNotesStatusState = {
  created?: boolean
  updated?: boolean
  deleted?: boolean
  errorMessage?: string
}
