export type HubNoteType = 'news' | 'note'

export type HubNotesFilter = 'all' | 'news' | 'note'

export type HubNote = {
  id: string
  title: string
  body: string
  noteType: HubNoteType
}

export type HubFamilySummary = {
  id: string
  name: string
  membersCount: number
  linksCount: number
  previewMembers: string[]
  canManageNotes: boolean
  notes: HubNote[]
  treeHref: string
}

export type HubActionFormState = {
  noteCreated?: boolean
  noteUpdated?: boolean
  noteDeleted?: boolean
  noteError?: string
  familyId?: string
}

export type HubNotesStatusState = {
  created?: boolean
  updated?: boolean
  deleted?: boolean
  errorMessage?: string
}
