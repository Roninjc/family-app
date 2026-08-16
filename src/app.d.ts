// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
import type { Session, SupabaseClient, User } from '@supabase/supabase-js'
import type { Profile } from '$lib/types/auth'

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      supabase: SupabaseClient
      safeGetSession(): Promise<{ session: Session | null; user: User | null }>
      session: Session | null
      user: User | null
    }
    interface PageData {
      user: User | null
      profile: Profile | null
      displayName?: string
      activeFamilyId?: string | null
      availableFamilies?: Array<{
        id: string
        name: string
        role: 'admin' | 'editor' | 'viewer'
        memberId?: string | null
      }>
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {}
