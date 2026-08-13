import { describe, expect, it } from 'vitest'
import { actions, load } from '../../src/routes/profile/+page.server'

const makeRequest = (fields: Record<string, string>) => {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return new Request('http://localhost/profile', { method: 'POST', body: formData })
}

describe('profile load', () => {
  it('returns an empty payload for authenticated users', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await (load as any)({ locals: { user: { id: 'u1' } } })

    expect(data).toEqual({})
  })
})

describe('setPassword action', () => {
  it('returns a friendly error when password is too short', async () => {
    const supabase = {
      auth: {
        updateUser: async () => ({ error: null })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.setPassword as any)({
      request: makeRequest({ password: '123' }),
      locals: { supabase, user: { id: 'u1' } }
    })

    expect(result.status).toBe(400)
    expect(result.data.passwordError).toBe('La contraseña debe tener al menos 8 caracteres.')
  })

  it('updates password when valid input is provided', async () => {
    const updates: Array<string> = []
    const supabase = {
      auth: {
        updateUser: async ({ password }: { password: string }) => {
          updates.push(password)
          return { error: null }
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (actions.setPassword as any)({
      request: makeRequest({ password: 'new-password-123' }),
      locals: { supabase, user: { id: 'u1' } }
    })

    expect(updates).toEqual(['new-password-123'])
    expect(result).toEqual({ passwordSaved: true })
  })
})
