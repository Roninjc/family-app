import { dev } from '$app/environment'
import { env } from '$env/dynamic/private'

// Development-only mode that serves the mock family instead of Supabase data
// and skips the auth guard, so layout work never needs real family data.
// Enabled with `yarn dev:mock` (MOCK_FAMILY=true); impossible in production
// builds because of the `dev` gate. Mutating actions are not mocked: they
// still hit Supabase and fail with an RLS error.
export const isMockFamilyMode = () => dev && env.MOCK_FAMILY === 'true'
