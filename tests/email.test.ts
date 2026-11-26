
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  send: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mocks.getUser,
    },
  })),
}))

vi.mock('resend', () => ({
  Resend: class {
    emails = {
      send: mocks.send,
    }
  },
}))

import { POST } from '../app/api/email/test/route'

describe('POST /api/email/test', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    process.env.RESEND_API_KEY = 'test_resend_key'
    process.env.RESEND_TEST_EMAIL = 'test@example.com'

    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'customer-123',
          email: 'customer@example.com',
        },
      },
      error: null,
    })

    mocks.send.mockResolvedValue({
      data: { id: 'email-test-123' },
      error: null,
    })
  })

  it('rejects unauthenticated users', async () => {
    mocks.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Not authenticated' },
    })

    const response = await POST()

    expect(response.status).toBe(401)
  })

  it('returns an error when the Resend API key is missing', async () => {
    delete process.env.RESEND_API_KEY

    const response = await POST()

    expect(response.status).toBe(500)
  })

  it('sends a test email successfully', async () => {
    const response = await POST()
    const result = await response.json()

    expect(response.status).toBe(200)
    expect(result.success).toBe(true)
    expect(result.emailId).toBe('email-test-123')
    expect(mocks.send).toHaveBeenCalled()
  })

  it('handles Resend delivery errors', async () => {
    mocks.send.mockResolvedValue({
      data: null,
      error: { message: 'Email delivery failed' },
    })

    const response = await POST()

    expect(response.status).toBe(400)
  })
})
