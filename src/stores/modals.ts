import { writable } from 'svelte/store'

export const showAddMemberModal = writable(false)
export const showEditMemberModal = writable(false)
// Miembro seleccionado al pulsar su badge, editado por editMemberModal
export const editingMemberId = writable<string | null>(null)
