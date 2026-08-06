import { writable } from 'svelte/store'

export const showAddMemberModal = writable(false)
export const showEditMemberModal = writable(false)
// Member selected by clicking their badge, edited by editMemberModal
export const editingMemberId = writable<string | null>(null)
